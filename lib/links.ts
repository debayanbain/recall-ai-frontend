/**
 * Links the backend found in a memory, re-validated before the browser will render one.
 *
 * The backend already refuses anything it would not store (`app/core/links.py`), and this
 * checks the same rules again for the same reason `lib/editor-doc.ts` re-applies the
 * inline allowlist: `item_metadata` is an open JSONB column, and the browser has to be the
 * one deciding what it turns into an `href`. A stored value that reaches this file
 * unvalidated is a value one bad migration away from being a `javascript:` URL in the
 * app's own origin.
 *
 * The other half of the job is provenance. A link the creator typed into a caption is a
 * fact; the same string read by a model off a video frame is a guess, and the difference
 * matters because a misread character is exactly how `paypaI.com` passes for `paypal.com`.
 * `LinkSource` carries which, and `sourceNote` turns it into something a person can act
 * on rather than a label only we understand.
 */
import type { VaultItemDetail } from "@/lib/types";

/** Where a link was found, most trustworthy first. Mirrors the backend's own ordering. */
export type LinkSource =
  | "caption"
  | "description"
  | "video"
  | "speech"
  | "transcript"
  | "slide";

export type MemoryLink = {
  url: string;
  source: LinkSource;
  /** The host, shown beside the link so the destination is what gets read. */
  host: string;
  /** False when a machine read this link rather than a person typing it. */
  typed: boolean;
};

const SOURCES: readonly LinkSource[] = [
  "caption",
  "description",
  "video",
  "speech",
  "transcript",
  "slide",
];

/** The two a person wrote by hand. Everything else was read or heard by a model. */
const TYPED: ReadonlySet<LinkSource> = new Set<LinkSource>(["caption", "description"]);

const NOTES: Record<LinkSource, string> = {
  caption: "From the caption",
  description: "From the description",
  video: "Read on screen",
  speech: "Heard in the audio",
  transcript: "Heard in the audio",
  slide: "Read off a slide",
};

/** How a link should be introduced to the person deciding whether to open it. */
export function sourceNote(source: LinkSource): string {
  return NOTES[source];
}

/**
 * Re-validate one stored URL, or null.
 *
 * Deliberately the same shape as the server's check rather than a looser "does it start
 * with http" — a rule enforced in one place only is a rule that the second render path
 * forgets. `URL` does the parsing, so the host this inspects is the host the browser
 * would actually resolve, not a substring of the text.
 */
export function safeLink(raw: unknown): string | null {
  if (typeof raw !== "string" || raw.length === 0 || raw.length > 512) return null;

  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    return null;
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
  // `https://good.com@evil.com/` renders as good.com wherever a UI truncates and goes to
  // evil.com. There is no honest use for userinfo in a link read off a video frame.
  if (parsed.username || parsed.password) return null;

  const host = parsed.hostname.toLowerCase();
  const labels = host.split(".");
  if (labels.length < 2) return null;
  // Non-ASCII and its already-encoded `xn--` form are both refused: `xn--ggle-0nda.com`
  // and `google.com` are different sites that nobody reading a list can tell apart, and
  // telling them apart is the entire job of this list.
  if (labels.some((label) => label.startsWith("xn--"))) return null;
  if (!/^[a-z0-9.-]+$/.test(host)) return null;
  // An alphabetic last label also rules out a bare IP address, which is never a link a
  // creator meant a viewer to open.
  if (!/^[a-z]{2,24}$/.test(labels[labels.length - 1])) return null;

  return parsed.href;
}

function asSource(raw: unknown): LinkSource | null {
  return typeof raw === "string" && (SOURCES as readonly string[]).includes(raw)
    ? (raw as LinkSource)
    : null;
}

/**
 * The memory's links, validated and deduplicated. Empty for anything without them.
 *
 * Every field is checked rather than asserted: `item_metadata` holds whatever the
 * extractor recorded, and an older item's entry may predate the shape entirely.
 */
export function memoryLinks(item: VaultItemDetail): MemoryLink[] {
  const metadata = item.item_metadata as Record<string, unknown> | null;
  const stored = metadata?.links;
  const seen = new Set<string>();
  const out: MemoryLink[] = [];

  // A carousel's slides name sites that exist nowhere else on the page — the whole point
  // of a "top 10 websites" post — and they arrive as bare hosts the backend rebuilt as
  // `https://<host>`. They are model readings of pixels, so they are `slide`, never
  // typed: the warning line and the per-row note that already exist for links read off a
  // video are exactly the right thing to say about a link read off a slide.
  const fromSlides = metadata?.slide_links;
  if (Array.isArray(fromSlides)) {
    for (const raw of fromSlides) {
      const url = safeLink(raw);
      if (!url || seen.has(url)) continue;
      seen.add(url);
      out.push({
        url,
        source: "slide",
        host: new URL(url).hostname.toLowerCase(),
        typed: false,
      });
    }
  }

  if (!Array.isArray(stored)) return out;

  for (const entry of stored) {
    if (typeof entry !== "object" || entry === null) continue;
    const url = safeLink((entry as { url?: unknown }).url);
    const source = asSource((entry as { source?: unknown }).source);
    if (!url || !source || seen.has(url)) continue;
    seen.add(url);
    out.push({
      url,
      source,
      host: new URL(url).hostname.toLowerCase(),
      typed: TYPED.has(source),
    });
  }

  return out;
}

/** What the rest of a URL says after its host — shown small, and never on its own. */
export function linkPath(url: string): string {
  try {
    const { pathname, search } = new URL(url);
    const rest = `${pathname}${search}`;
    return rest === "/" ? "" : rest;
  } catch {
    return "";
  }
}
