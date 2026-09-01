"use client";

import { Clapperboard, Loader2, RotateCw } from "lucide-react";
import { toast } from "@/lib/toast";
import { Button } from "@/components/ui/button";
import { useReprocessItem, useUploadLimits } from "@/hooks/use-vault";
import { ApiError } from "@/lib/api";
import type { VaultItemDetail } from "@/lib/types";

/**
 * Read the video of a memory that was saved with only its caption.
 *
 * A reel's caption is not its content: the address a creator wants followed is usually
 * burned into a frame or spoken aloud, and neither reaches the caption. Anything captured
 * before this deployment could read video is sitting at `completed` holding half a
 * memory — and `completed` is precisely what would make that permanent, because the
 * generic retry is deliberately hidden on a healthy item.
 *
 * So this is the same carve-out `TranscriptControls` is, for the same reason: the state
 * that looks finished is the one that cannot be fixed any other way. It renders **only**
 * for a completed item — `failed` and `skipped` already get a retry from
 * `ProcessingState`, which re-runs the same pipeline, and two buttons doing one thing on
 * one page is a question about which of them is the right one.
 */
export function canReadVideo(item: VaultItemDetail, enabled: boolean): boolean {
  const metadata = item.item_metadata as Record<string, unknown> | null;
  return (
    enabled &&
    // Needs a URL to re-scrape. The stored `video_url` is a signed CDN link that dies
    // within hours, so re-reading always means re-running the extractor first — an item
    // with nothing to re-scrape has nothing to offer.
    Boolean(item.source_url) &&
    Boolean(metadata?.video_url) &&
    // `true` means it was read and there is nothing to add. `false` means it was tried
    // and did not land — a provider outage, an expired link — which is worth offering
    // again. Absent means it predates the feature entirely.
    metadata?.video_read !== true
  );
}

export function VideoReadControls({ item }: { item: VaultItemDetail }) {
  const reprocess = useReprocessItem();
  const limits = useUploadLimits();

  const queued =
    item.processing_status === "pending" || item.processing_status === "processing";
  // Rendered for a completed item, and kept on screen while the re-read it started is in
  // flight — otherwise pressing the button makes the thing you just pressed disappear.
  const relevant = item.processing_status === "completed" || queued;

  if (!relevant || !canReadVideo(item, limits.data?.video.enabled ?? false)) return null;

  const failedBefore = (item.item_metadata as Record<string, unknown>)?.video_read === false;
  const busy = reprocess.isPending || queued;

  const run = () => {
    reprocess.mutate(
      { id: item.id },
      {
        onSuccess: () =>
          toast.success("Reading the video", {
            description: "This takes a minute — the post is fetched again first.",
          }),
        onError: (err) =>
          toast.error("Couldn't start that", {
            description:
              err instanceof ApiError && err.status < 500
                ? err.message
                : "Try again in a moment.",
          }),
      },
    );
  };

  return (
    <section
      aria-labelledby="video-read-title"
      className="mt-6 rounded-[calc(var(--radius)+4px)] border border-border bg-secondary/40 p-4 sm:mt-7 sm:p-5"
    >
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <div className="min-w-0">
          <h2 id="video-read-title" className="text-[13px] font-semibold text-foreground">
            Video
          </h2>
          <p className="mt-0.5 text-[12px] text-muted-foreground">
            {/* Says which of the two it is. "Wasn't read" is a gap; "couldn't be read" is
                a failure the reader may reasonably expect to have passed. */}
            {failedBefore
              ? "The video couldn't be read last time — only the caption was saved."
              : "Only the caption was saved. The video itself hasn't been read."}{" "}
            Reading it picks up what&rsquo;s on screen and what&rsquo;s said, including any
            links.
          </p>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Clapperboard className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
        <Button
          onClick={run}
          disabled={busy}
          variant="outline"
          className="h-11 gap-1.5 rounded-xl border-border bg-card px-4 text-[13px] font-semibold tracking-normal text-foreground/80 normal-case hover:bg-secondary disabled:opacity-60"
        >
          {busy ? (
            <>
              Reading it <Loader2 className="size-3.5 animate-spin" aria-hidden />
            </>
          ) : (
            <>
              <RotateCw className="size-3.5" aria-hidden /> Read the video
            </>
          )}
        </Button>
      </div>

      <p className="mt-2 text-[11.5px] leading-relaxed text-muted-foreground">
        The saved video link expires within hours, so this fetches the post again before
        reading the frames and the audio. The summary, tags and search index are rebuilt
        with what it finds.
      </p>
    </section>
  );
}
