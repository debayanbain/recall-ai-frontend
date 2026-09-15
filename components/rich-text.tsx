"use client";

import type { ReactNode } from "react";
import { runNodes as linkedRunNodes } from "@/components/highlighted-text";
import { segmentByHighlights } from "@/lib/highlights";
import { decodeEntities as decode, safeHref } from "@/lib/editor-doc";

/**
 * Renders the backend's allowlisted inline markup as React elements.
 *
 * The stored subset is exactly `b`, `i`, `u`, `mark`, `code`, `a[href]` and `br`, and
 * `app/services/editor_doc.py` writes it by re-serializing from that list rather than by
 * filtering the input. This parser is the second gate on the same rule: it *builds
 * elements from tag names it recognises* and treats everything else as text, so there is
 * no `dangerouslySetInnerHTML` anywhere on the path and no way for markup the backend did
 * not intend to become DOM in our origin. An unknown tag renders as nothing; its text
 * still renders.
 *
 * The model's highlight spans are applied inside each text run, so a `<mark>` and a bold
 * word can coexist. A span that straddles a formatting boundary is simply not marked —
 * the same rule `highlighted-text.tsx` already follows: never approximate a quote.
 */

const TAG = /<(\/?)([a-zA-Z0-9]+)((?:\s[^>]*)?)\/?>/g;

const WRAPPERS: Record<string, (children: ReactNode, key: string) => ReactNode> = {
  b: (children, key) => (
    <strong key={key} className="font-semibold text-foreground">
      {children}
    </strong>
  ),
  i: (children, key) => <em key={key}>{children}</em>,
  u: (children, key) => <u key={key}>{children}</u>,
  mark: (children, key) => (
    <mark
      key={key}
      className="box-decoration-clone rounded-[3px] bg-highlight px-1 py-px text-highlight-fg"
    >
      {children}
    </mark>
  ),
  code: (children, key) => (
    <code key={key} className="rounded-[4px] bg-secondary px-1.5 py-0.5 text-[0.9em]">
      {children}
    </code>
  ),
};

type Frame = { tag: string; attributes: string; children: ReactNode[] };

/** Split a text run into plain and highlighted pieces, in reading order. */
function markNodes(text: string, spans: string[], keyBase: string): ReactNode[] {
  if (!text) return [];
  if (spans.length === 0) return [text];
  return segmentByHighlights(text, spans).map((segment, i) =>
    segment.mark ? (
      // A real <mark>, so assistive tech announces the emphasis rather than it being
      // carried by colour alone.
      <mark
        key={`${keyBase}-h${i}`}
        className="box-decoration-clone rounded-[3px] border-b-2 border-highlight-fg/25 bg-highlight px-1 py-px text-highlight-fg"
      >
        {segment.text}
      </mark>
    ) : (
      segment.text
    ),
  );
}

/**
 * The same run with bare addresses turned into links.
 *
 * Suppressed inside an `<a>` the document already carries: a link nested in a link is
 * invalid markup, and the inner one would silently win over the href the writer chose.
 */
function runNodes(
  text: string,
  spans: string[],
  keyBase: string,
  insideAnchor: boolean,
): ReactNode[] {
  if (insideAnchor) return markNodes(text, spans, keyBase);
  return linkedRunNodes(text, spans, keyBase);
}

export function renderInline(markup: string, spans: string[] = []): ReactNode[] {
  const stack: Frame[] = [{ tag: "", attributes: "", children: [] }];
  let cursor = 0;
  let key = 0;

  const pushText = (raw: string) => {
    if (!raw) return;
    const insideAnchor = stack.some((frame) => frame.tag === "a");
    stack[stack.length - 1].children.push(
      ...runNodes(decode(raw), spans, `t${key++}`, insideAnchor),
    );
  };

  const closeFrame = (frame: Frame): ReactNode => {
    const id = `e${key++}`;
    if (frame.tag !== "a") return WRAPPERS[frame.tag](frame.children, id);
    const href = safeHref(frame.attributes);
    return href ? (
      <a
        key={id}
        href={href}
        target="_blank"
        rel="noopener noreferrer nofollow"
        className="underline decoration-primary/40 underline-offset-2 hover:decoration-primary"
      >
        {frame.children}
      </a>
    ) : (
      // A link we would not follow still keeps its words.
      <span key={id}>{frame.children}</span>
    );
  };

  TAG.lastIndex = 0;
  for (let match = TAG.exec(markup); match !== null; match = TAG.exec(markup)) {
    pushText(markup.slice(cursor, match.index));
    cursor = match.index + match[0].length;

    const closing = match[1] === "/";
    const tag = match[2].toLowerCase();
    const attributes = match[3] ?? "";

    if (tag === "br") {
      stack[stack.length - 1].children.push(<br key={`br${key++}`} />);
      continue;
    }
    if (tag !== "a" && !(tag in WRAPPERS)) continue; // unknown tag: dropped, text flows on

    if (!closing) {
      stack.push({ tag, attributes, children: [] });
      continue;
    }
    // Close through to the matching frame so a stray end tag cannot unwind the stack.
    const depth = stack.findIndex((frame) => frame.tag === tag);
    if (depth < 1) continue;
    while (stack.length > depth) {
      const frame = stack.pop();
      if (!frame) break;
      stack[stack.length - 1].children.push(closeFrame(frame));
    }
  }
  pushText(markup.slice(cursor));

  // Anything still open at the end unwinds into its parent rather than being lost.
  while (stack.length > 1) {
    const frame = stack.pop();
    if (!frame) break;
    stack[stack.length - 1].children.push(...frame.children);
  }
  return stack[0].children;
}

export function RichText({ markup, spans = [] }: { markup: string; spans?: string[] }) {
  return <>{renderInline(markup, spans)}</>;
}
