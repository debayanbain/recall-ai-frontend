"use client";

import { useId } from "react";
import { ExternalLink, Link2, Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { linkPath, memoryLinks, sourceNote } from "@/lib/links";
import type { VaultItemDetail } from "@/lib/types";

/**
 * The links a memory mentions, and where each one was found.
 *
 * This exists because a reel's caption is not its content: the address a creator wants
 * followed is usually burned into a frame or said out loud, and neither reaches the
 * caption. The backend now reads both, so the useful half of a video stops being invisible
 * — but only if the page shows it, and shows it honestly.
 *
 * Three decisions here are about safety rather than layout, and all three would look like
 * fussy detail right up until the first scam reel:
 *
 * * **The host is the biggest thing in the row.** A link is a promise about where you are
 *   going, and the words around it in a video frame are written by whoever made the video.
 *   Leading with `shop.example` rather than "TAP HERE FOR 90% OFF" is what lets someone
 *   decide against opening it.
 * * **Machine-read links say so, per link.** A URL typed into a description is a fact; the
 *   same string read off a blurry frame is a guess, and a model that misreads one glyph
 *   turns `paypal.com` into `paypaI.com` with no outward sign. The provenance is not a
 *   footnote about the feature — it is a fact about that specific row.
 * * **Nothing is prefetched and nothing is embedded.** `rel="noopener noreferrer"` and a
 *   plain outbound anchor: no favicon fetch (which would announce every saved link to a
 *   third party), no preview card, no `next/link`.
 *
 * Renders nothing when the memory has no links, the same way `ProcessingState` renders
 * nothing for a healthy item — an empty "Links" heading is a question the page raises and
 * then refuses to answer.
 */
export function MemoryLinks({ item }: { item: VaultItemDetail }) {
  const links = memoryLinks(item);
  const noteId = useId();

  if (links.length === 0) return null;

  const machineRead = links.filter((l) => !l.typed);
  const read = machineRead.length;
  const sources = new Set(machineRead.map((l) => l.source));
  const readSource =
    sources.size === 1 && sources.has("slide")
      ? "these off a slide"
      : sources.size === 1 && sources.has("video")
        ? "these off the video"
        : "these off the video or slides";

  return (
    <Card className="card-soft mt-6 gap-0 rounded-[calc(var(--radius)+4px)] py-0 shadow-none ring-0 sm:mt-7">
      <CardContent className="p-5 sm:p-6">
        <div className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-wider text-primary">
          <Link2 className="h-3.5 w-3.5 shrink-0" aria-hidden /> Links in this memory
        </div>

        {read > 0 && (
          // Said once at the top and again per row. The summary line sets the expectation;
          // the per-row note is what someone actually reads at the moment they decide.
          <p id={noteId} className="mt-2 flex items-start gap-1.5 text-[12.5px] text-muted-foreground">
            <Sparkles className="mt-0.5 size-3.5 shrink-0 text-primary" aria-hidden />
            {/* Names where they came from, because "read off a video frame" and "read
                off a slide" are different claims and a person deciding whether to tap
                should hear the one that applies. Both are a model reading pixels, which
                is the part that matters: one wrong character is a different company. */}
            {read === links.length
              ? `Recall read ${readSource} rather than from text someone typed — check the address before you open one.`
              : `Some of these were read ${readSource} rather than typed — check the address before you open one.`}
          </p>
        )}

        <ul className="mt-3 space-y-1.5">
          {links.map((link) => {
            const path = linkPath(link.url);
            return (
              <li key={link.url}>
                <a
                  href={link.url}
                  target="_blank"
                  // noopener stops the opened page reaching back through window.opener;
                  // noreferrer keeps this memory's URL out of the destination's logs.
                  rel="noopener noreferrer"
                  aria-describedby={link.typed ? undefined : noteId}
                  className="group flex items-start gap-2.5 rounded-xl border border-transparent px-3 py-2.5 transition-colors hover:border-border hover:bg-secondary/50 focus-visible:border-border focus-visible:bg-secondary/50 focus-visible:outline-none"
                >
                  <ExternalLink
                    className="mt-0.5 size-3.5 shrink-0 text-muted-foreground group-hover:text-primary"
                    aria-hidden
                  />
                  <span className="min-w-0 flex-1">
                    {/* The host leads and is allowed to wrap; the path is secondary and
                        truncates. Truncating the host instead would hide the only part
                        that says where this goes. */}
                    <span className="block break-words text-[14px] font-medium text-foreground">
                      {link.host}
                    </span>
                    {path && (
                      <span className="block truncate text-[12.5px] text-muted-foreground">
                        {path}
                      </span>
                    )}
                    <span className="mt-0.5 block text-[11.5px] text-muted-foreground/80">
                      {sourceNote(link.source)}
                    </span>
                  </span>
                </a>
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}
