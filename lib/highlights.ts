import { linkRanges } from "@/lib/linkify";

/**
 * Where a memory's highlights and its links land in one string.
 *
 * Two rules this exists to hold:
 *
 * 1. **Never mark what is not there.** The backend already discards spans that are not
 *    verbatim, and the matcher here is the second gate: a span that cannot be located is
 *    silently skipped rather than approximated, because a highlight in the wrong place
 *    reads as the author having said something they did not.
 * 2. **Compose ranges, never slices.** Segmenting by links first and by highlights second
 *    was a real bug: the stored spans on an image reading are whole lines like
 *    `"1. Anthropic - http://anthropic.skilljar.com"`, so each straddled a link boundary,
 *    matched neither half, and the page claimed three highlights while marking none.
 */

/** Whitespace, plus the zero-width padding Facebook and Instagram sprinkle in captions. */
const GAP = "[\\s\\u200B\\u200C\\u200D\\uFEFF]+";

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * A span is matched token-by-token with flexible gaps.
 *
 * The stored span comes from a model that saw the same text with different line
 * wrapping, and the source itself wraps mid-sentence — so an exact `indexOf` finds
 * nothing on precisely the captions this feature exists for.
 */
function spanPattern(span: string): RegExp | null {
  const tokens = span.trim().split(/\s+/).filter(Boolean).map(escapeRegExp);
  if (tokens.length === 0) return null;
  return new RegExp(tokens.join(GAP), "i");
}

type Segment = { text: string; mark: boolean };

/** One piece of a run: the words, and whether the model marked them. */
export type Piece = Segment;

/** A stretch of text under one link (or none), already split by highlight. */
export type Run = { href: string | null; pieces: Piece[] };

/** Where the model's spans actually land in `text`, in reading order, never overlapping. */
function highlightRanges(text: string, spans: string[]): Array<[number, number]> {
  const ranges: Array<[number, number]> = [];

  for (const span of spans) {
    const pattern = spanPattern(span);
    if (!pattern) continue;
    const found = pattern.exec(text);
    if (!found) continue;
    const start = found.index;
    const end = start + found[0].length;
    // Overlaps would produce nested marks; first match wins, matching the backend's
    // longest-first de-duplication.
    if (ranges.some(([s, e]) => start < e && s < end)) continue;
    ranges.push([start, end]);
  }

  ranges.sort((a, b) => a[0] - b[0]);
  return ranges;
}

/** Split `text` into alternating plain and marked segments, in reading order. */
export function segmentByHighlights(text: string, spans: string[]): Segment[] {
  const ranges = highlightRanges(text, spans);
  if (ranges.length === 0) return [{ text, mark: false }];

  const segments: Segment[] = [];
  let cursor = 0;
  for (const [start, end] of ranges) {
    if (start > cursor) segments.push({ text: text.slice(cursor, start), mark: false });
    segments.push({ text: text.slice(start, end), mark: true });
    cursor = end;
  }
  if (cursor < text.length) segments.push({ text: text.slice(cursor), mark: false });
  return segments;
}

/**
 * Both segmentations of one string, merged.
 *
 * A link is one run however many marks fall inside it, so a highlighted address is still
 * a single anchor rather than two the reader has to hit separately. A mark that runs past
 * an address simply continues in the next run, which is what makes a whole highlighted
 * line read as one stripe.
 */
export function composeRuns(text: string, spans: string[]): Run[] {
  const links = linkRanges(text);
  const marks = highlightRanges(text, spans);
  if (links.length === 0 && marks.length === 0) {
    return [{ href: null, pieces: [{ text, mark: false }] }];
  }

  const piecesBetween = (from: number, to: number): Piece[] => {
    const pieces: Piece[] = [];
    let at = from;
    for (const [start, end] of marks) {
      if (end <= at || start >= to) continue;
      const head = Math.max(start, at);
      const tail = Math.min(end, to);
      if (head > at) pieces.push({ text: text.slice(at, head), mark: false });
      pieces.push({ text: text.slice(head, tail), mark: true });
      at = tail;
    }
    if (at < to) pieces.push({ text: text.slice(at, to), mark: false });
    return pieces;
  };

  const runs: Run[] = [];
  let cursor = 0;
  for (const link of links) {
    if (link.start > cursor) runs.push({ href: null, pieces: piecesBetween(cursor, link.start) });
    runs.push({ href: link.href, pieces: piecesBetween(link.start, link.end) });
    cursor = link.end;
  }
  if (cursor < text.length) runs.push({ href: null, pieces: piecesBetween(cursor, text.length) });
  return runs;
}
