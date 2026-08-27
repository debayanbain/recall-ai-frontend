"use client";

import { useMemo } from "react";

/**
 * Renders extracted content with the model's key sentences marked in place.
 *
 * Two rules this exists to hold:
 *
 * 1. **Never as HTML.** The text is whatever was on someone's Facebook post or web page.
 *    It is rendered as text nodes and the `<mark>` elements are React elements around
 *    them, so there is no path from third-party content to markup in our origin.
 * 2. **Never mark what is not there.** The backend already discards spans that are not
 *    verbatim, but the matcher here is the second gate: a span that cannot be located is
 *    silently skipped rather than approximated, because a highlight in the wrong place
 *    reads as the author having said something they did not.
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

/** Split `text` into alternating plain and marked segments, in reading order. */
export function segmentByHighlights(text: string, spans: string[]): Segment[] {
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

  if (ranges.length === 0) return [{ text, mark: false }];
  ranges.sort((a, b) => a[0] - b[0]);

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

export function HighlightedText({
  text,
  spans,
  className = "",
}: {
  text: string;
  spans: string[];
  className?: string;
}) {
  const segments = useMemo(() => segmentByHighlights(text, spans), [text, spans]);

  return (
    <p className={`whitespace-pre-wrap break-words ${className}`}>
      {segments.map((segment, i) =>
        segment.mark ? (
          // `<mark>` rather than a styled span: assistive tech announces it, so the
          // emphasis survives for someone who never sees the colour — as does the rule
          // under it, which is why the mark is not carried by fill alone. The `-fg`
          // colour is explicit because the surrounding paragraph is deliberately dimmed
          // and a highlight inheriting that loses contrast against its own fill.
          <mark
            key={i}
            className="box-decoration-clone rounded-[3px] border-b-2 border-highlight-fg/25 bg-highlight px-1 py-px text-highlight-fg"
          >
            {segment.text}
          </mark>
        ) : (
          <span key={i}>{segment.text}</span>
        ),
      )}
    </p>
  );
}
