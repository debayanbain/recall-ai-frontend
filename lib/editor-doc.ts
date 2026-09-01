/**
 * Bridge between what the API stores and what EditorJS wants.
 *
 * The backend stores two things: `content`, the flat text every other surface speaks
 * (highlights index into it, search matches it), and `item_metadata.editor_doc`, the
 * block document with a **small allowlist of inline markup** — b, i, u, mark, code, a,
 * br and nothing else. `app/services/editor_doc.py` produces that markup by
 * re-serializing from the allowlist rather than by filtering the input, so a tag outside
 * the list cannot appear in it.
 *
 * Two directions, two rules:
 *
 * * **Stored -> editor / reader.** The formatting has to survive, so the text is not
 *   escaped — escaping it is what made bold and headings vanish on save. It is instead
 *   re-serialized from the allowlist by `sanitizeInline` before it reaches EditorJS,
 *   which does set it as innerHTML. The backend sanitizing is not treated as sufficient
 *   on its own: `editor_doc` is a JSONB column, and the day anything else writes to it
 *   the browser must still be the one deciding what it will render. The reader never
 *   sets innerHTML at all — `components/rich-text.tsx` builds React elements.
 * * **Raw content -> editor.** An item nobody has edited has only plain text, and a
 *   contenteditable treats what it is given as markup — so that path escapes, because
 *   the text is a scraped page and may contain anything.
 */

import type { VaultItemDetail } from "@/lib/types";

/** The shape the API accepts back. `data` is per-tool and re-validated server-side. */
export type EditorBlock = { type: string; data: Record<string, unknown> };

/** Block types the backend knows how to flatten. Anything else is dropped on save. */
const SUPPORTED = new Set(["paragraph", "header", "list", "quote", "code", "delimiter"]);

/** Tags the reader and the editor may see. Everything else is dropped, text and all. */
const INLINE_TAGS = new Set(["b", "i", "u", "mark", "code"]);
/** The editor emits both spellings depending on the browser's execCommand. */
const TAG_ALIASES: Record<string, string> = { strong: "b", em: "i", ins: "u" };
const INLINE_TAG_PATTERN = /<(\/?)([a-zA-Z0-9]+)((?:\s[^>]*)?)\/?>/g;

/** Only the entities our own escaping can produce, plus the ones a paste brings in. */
const ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  "#39": "'",
  "#x27": "'",
};

export function decodeEntities(value: string): string {
  return value.replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z]+);/g, (whole, name: string) => {
    const known = ENTITIES[name.toLowerCase()];
    if (known !== undefined) return known;
    if (name.startsWith("#")) {
      const code = name.startsWith("#x") ? parseInt(name.slice(2), 16) : Number(name.slice(1));
      // Control characters are never legitimate here and are the interesting half of a
      // numeric-entity payload, so they are dropped rather than decoded.
      if (Number.isFinite(code) && code >= 0x20 && code <= 0x10ffff) {
        return String.fromCodePoint(code);
      }
    }
    return whole;
  });
}

/** A link target, or null when it is not plain web navigation. */
export function safeHref(attributes: string): string | null {
  const match = /href\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+))/i.exec(attributes);
  if (!match) return null;
  // Whitespace and control characters inside the scheme are the classic bypass.
  const raw = decodeEntities(match[2] ?? match[3] ?? match[4] ?? "").replace(
    /[\s\u0000-\u001f\u007f]+/g,
    "",
  );
  return /^(https?:\/\/|mailto:)/i.test(raw) ? raw : null;
}

/**
 * Re-serialize markup from the allowlist, for the one place that sets innerHTML.
 *
 * Nothing from the input is copied to the output except text, which is escaped, and a
 * validated `href`. Tags are written fresh from `INLINE_TAGS`, so a tag outside the list
 * cannot appear in the result no matter what the input contained — which is what makes
 * it safe to hand the result to a contenteditable.
 */
export function sanitizeInline(markup: string): string {
  const out: string[] = [];
  const open: string[] = [];
  let cursor = 0;

  const pushText = (raw: string) => {
    if (raw) out.push(escapeHtml(decodeEntities(raw)));
  };

  INLINE_TAG_PATTERN.lastIndex = 0;
  for (
    let match = INLINE_TAG_PATTERN.exec(markup);
    match !== null;
    match = INLINE_TAG_PATTERN.exec(markup)
  ) {
    pushText(markup.slice(cursor, match.index));
    cursor = match.index + match[0].length;

    const closing = match[1] === "/";
    const tag = TAG_ALIASES[match[2].toLowerCase()] ?? match[2].toLowerCase();

    if (tag === "br") {
      if (!closing) out.push("<br>");
      continue;
    }
    if (tag !== "a" && !INLINE_TAGS.has(tag)) continue;

    if (!closing) {
      if (open.length >= 8) continue;
      if (tag === "a") {
        const href = safeHref(match[3] ?? "");
        if (!href) continue;
        out.push(`<a href="${escapeHtml(href)}">`);
      } else {
        out.push(`<${tag}>`);
      }
      open.push(tag);
      continue;
    }
    if (!open.includes(tag)) continue;
    // Close through to the matching tag, so `<b><i></b>` cannot leave `<i>` dangling.
    while (open.length > 0) {
      const closed = open.pop();
      out.push(`</${closed}>`);
      if (closed === tag) break;
    }
  }
  pushText(markup.slice(cursor));
  while (open.length > 0) out.push(`</${open.pop()}>`);
  return out.join("");
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function asText(value: unknown): string {
  return typeof value === "string" ? sanitizeInline(value) : "";
}

/**
 * A code block, verbatim.
 *
 * Deliberately not sanitized: the tool assigns it to a textarea's `.value`, which never
 * parses markup, and running it through the allowlist would delete the angle brackets a
 * user put there on purpose — a code sample is the one place `<div>` is the content.
 */
function asRawText(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function asLevel(value: unknown): number {
  return typeof value === "number" && value >= 1 && value <= 6 ? Math.floor(value) : 2;
}

/** Normalize one stored block; null when it is a type we do not render. */
function normalizeBlock(block: unknown): EditorBlock | null {
  if (typeof block !== "object" || block === null) return null;
  const { type, data } = block as { type?: unknown; data?: unknown };
  if (typeof type !== "string" || !SUPPORTED.has(type)) return null;
  const fields = (typeof data === "object" && data !== null ? data : {}) as Record<string, unknown>;

  switch (type) {
    case "header":
      return { type, data: { text: asText(fields.text), level: asLevel(fields.level) } };
    case "list": {
      // The stored document flattens nesting to strings; @editorjs/list still accepts
      // that older shape and normalizes it, so there is nothing to rebuild here.
      const items = Array.isArray(fields.items) ? fields.items : [];
      return {
        type,
        data: {
          style: fields.style === "ordered" ? "ordered" : "unordered",
          items: items.map(asText),
        },
      };
    }
    case "quote":
      return { type, data: { text: asText(fields.text), caption: asText(fields.caption) } };
    case "code":
      return { type, data: { code: asRawText(fields.code) } };
    case "delimiter":
      return { type, data: {} };
    default:
      return { type: "paragraph", data: { text: asText(fields.text) } };
  }
}

/**
 * The stored block document, or null for an item that has never been hand-edited.
 *
 * `item_metadata` is an open record holding whatever the extractor recorded, so every
 * field is checked rather than asserted.
 */
export function storedDocument(item: VaultItemDetail): EditorBlock[] | null {
  return documentAt(item, "editor_doc");
}

/**
 * The document the pipeline built from a video reading, or null.
 *
 * Kept in its own metadata key and read by its own function, because `editor_doc` means
 * "a person edited this". It seeds the editor and it is what `PATCH /vault/{id}/content`
 * writes, so a machine-written document sitting there would be indistinguishable from the
 * user's own work — and the next video re-read would overwrite whatever they had typed.
 */
export function machineDocument(item: VaultItemDetail): EditorBlock[] | null {
  return documentAt(item, "video_doc");
}

/**
 * What the reader renders: the hand-edited document if there is one, else the generated
 * one. Deliberately NOT what `toEditorBlocks` seeds the editor from — pressing Edit must
 * not quietly adopt a machine's document as the user's own.
 */
export function readerDocument(item: VaultItemDetail): EditorBlock[] | null {
  return storedDocument(item) ?? machineDocument(item);
}

/**
 * One key's document, validated.
 *
 * `item_metadata` is an open JSONB record holding whatever the extractor recorded, so
 * every field is checked rather than asserted, and the inline allowlist is re-applied
 * here regardless of which side wrote it.
 */
function documentAt(item: VaultItemDetail, key: string): EditorBlock[] | null {
  const stored = (item.item_metadata as Record<string, unknown> | null)?.[key];
  const blocks =
    typeof stored === "object" && stored !== null
      ? (stored as { blocks?: unknown }).blocks
      : undefined;
  if (!Array.isArray(blocks)) return null;
  const mapped = blocks.map(normalizeBlock).filter((b): b is EditorBlock => b !== null);
  return mapped.length > 0 ? mapped : null;
}

/** Blank-line-separated paragraphs, escaped, for an item with only plain text. */
function paragraphsFrom(content: string): EditorBlock[] {
  return content
    .split(/\n{2,}/)
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => ({
      type: "paragraph",
      data: { text: escapeHtml(part).replace(/\n/g, "<br>") },
    }));
}

/**
 * What to seed the editor with: whatever the reader is looking at, else the flat content.
 *
 * `readerDocument`, not `storedDocument`, so pressing Edit on a video memory opens the
 * structured document that is on screen rather than the flat text behind it — an editor
 * that disagrees with the page is an editor that looks broken, and saving would silently
 * flatten the headings and lists the reader could see a moment earlier.
 *
 * A save then writes `editor_doc`, which outranks the generated one from that point on.
 * That is the intended promotion: the person reviewed it and pressed Save.
 */
export function toEditorBlocks(item: VaultItemDetail): EditorBlock[] {
  return readerDocument(item) ?? (item.content ? paragraphsFrom(item.content) : []);
}
