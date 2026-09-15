"use client";

import { useMemo, type ReactNode } from "react";

import { BodyLink } from "@/components/linkify";
import { composeRuns } from "@/lib/highlights";

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
 *
 * Addresses become links too, and the two segmentations are merged as *ranges* over the
 * whole string rather than applied one after the other. Slicing by links first was a real
 * bug: the stored spans on an image reading are whole lines like
 * `"1. Anthropic - http://anthropic.skilljar.com"`, so each one straddled a link boundary,
 * matched neither half, and the page claimed three highlights while marking none.
 */

/** Render merged runs: links around, marks inside. */
export function runNodes(text: string, spans: string[], keyBase: string): ReactNode[] {
  return composeRuns(text, spans).map((run, i) => {
    const inner = run.pieces.map((piece, j) =>
      piece.mark ? (
        // `<mark>` rather than a styled span: assistive tech announces it, so the emphasis
        // survives for someone who never sees the colour — as does the rule under it,
        // which is why the mark is not carried by fill alone. The `-fg` colour is explicit
        // because the surrounding paragraph is deliberately dimmed and a highlight
        // inheriting that loses contrast against its own fill.
        <mark
          key={`${keyBase}-${i}-${j}`}
          className="box-decoration-clone rounded-[3px] border-b-2 border-highlight-fg/25 bg-highlight px-1 py-px text-highlight-fg"
        >
          {piece.text}
        </mark>
      ) : (
        <span key={`${keyBase}-${i}-${j}`}>{piece.text}</span>
      ),
    );
    return run.href ? (
      <BodyLink key={`${keyBase}-${i}`} href={run.href}>
        {inner}
      </BodyLink>
    ) : (
      <span key={`${keyBase}-${i}`}>{inner}</span>
    );
  });
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
  const nodes = useMemo(() => runNodes(text, spans, "b"), [text, spans]);

  return <p className={`whitespace-pre-wrap break-words ${className}`}>{nodes}</p>;
}
