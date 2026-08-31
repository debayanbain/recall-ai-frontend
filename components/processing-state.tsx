"use client";

import { AlertTriangle, FileQuestion, Loader2, RotateCw } from "lucide-react";
import { toast } from "@/lib/toast";
import { Button } from "@/components/ui/button";
import { useReprocessItem } from "@/hooks/use-vault";
import { ApiError } from "@/lib/api";
import type { VaultItemDetail } from "@/lib/types";

/**
 * What happened to this memory, and what the reader can do about it.
 *
 * A capture can end badly for reasons that have nothing to do with the item — a provider
 * timeout, a rate limit, a worker killed mid-job — and before this the page simply showed
 * a card with no summary and no explanation. The worst version of that is the silent one:
 * the item looks saved, the AI section is empty, and nothing says whether waiting longer
 * would help.
 *
 * **Renders nothing when the item completed.** The retry is an escape hatch from a bad
 * state, not a feature of a good one; a "reprocess" button on a healthy memory is an
 * invitation to spend the whole AI pipeline again to replace a result with itself.
 * `pending` and `processing` render a quiet line and no button — the work is already
 * queued, and the server refuses a second request anyway.
 */
export function ProcessingState({ item }: { item: VaultItemDetail }) {
  const reprocess = useReprocessItem();
  const status = item.processing_status;

  if (status === "completed") return null;

  if (status === "pending" || status === "processing") {
    return (
      <p
        aria-live="polite"
        className="mt-6 flex items-center gap-2 rounded-2xl border border-border bg-secondary/40 px-4 py-3 text-[12.5px] text-muted-foreground sm:mt-7"
      >
        <Loader2 className="size-3.5 shrink-0 animate-spin" aria-hidden />
        {status === "pending"
          ? "Queued — Recall reads, summarizes and tags this in the background."
          : "Reading this now…"}
      </p>
    );
  }

  const broken = status === "failed";

  const retry = () => {
    reprocess.mutate(
      { id: item.id },
      {
        onSuccess: () =>
          toast.success("Back in the queue", {
            description: "This usually takes a few seconds.",
          }),
        onError: (err) => {
          // 409 and 429 are both "no, and here is why" rather than faults: already
          // running, already finished, or asked again too soon. Their copy is for a person.
          const actionable = err instanceof ApiError && err.status < 500;
          toast.error("Couldn't start that again", {
            description: actionable ? (err as ApiError).message : "Try again in a moment.",
          });
        },
      },
    );
  };

  return (
    <section
      // Not role="alert": this is the state of the page on arrival, not something that
      // just happened, and hijacking focus on load is worse than being read in order.
      aria-labelledby="processing-state-title"
      className={`mt-6 rounded-[calc(var(--radius)+4px)] border p-4 sm:mt-7 sm:p-5 ${
        broken ? "border-destructive/30 bg-destructive/5" : "border-border bg-secondary/40"
      }`}
    >
      <div className="flex items-start gap-3">
        <span
          className={`grid size-9 shrink-0 place-items-center rounded-xl ${
            broken ? "bg-destructive/10 text-destructive" : "bg-primary-soft text-primary"
          }`}
        >
          {/* Colour is never the only cue: the icon and the heading say it too. */}
          {broken ? (
            <AlertTriangle className="size-4" aria-hidden />
          ) : (
            <FileQuestion className="size-4" aria-hidden />
          )}
        </span>
        <div className="min-w-0 flex-1">
          <h2
            id="processing-state-title"
            className="text-[13.5px] font-semibold text-foreground"
          >
            {broken ? "Recall couldn't finish this" : "Nothing readable to index"}
          </h2>
          <p className="mt-1 text-[12.5px] leading-relaxed text-muted-foreground">
            {broken
              ? "The memory itself is safe — only the summarizing, tagging and search indexing didn't complete. Trying again usually works."
              : "This one is stored and downloadable, but there was no text for Recall to read, so it won't appear in search yet."}
          </p>

          {broken && item.processing_error && (
            // Collapsed by default: it is the provider's own words, useful for a bug
            // report and noise for everyone else. Safe to show — credential-shaped text
            // is stripped before it is stored.
            <details className="mt-2.5">
              <summary className="w-fit cursor-pointer rounded-md py-1 text-[12px] text-muted-foreground underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
                Technical details
              </summary>
              <p className="mt-1.5 overflow-x-auto rounded-lg bg-card/70 px-2.5 py-2 font-mono text-[11.5px] leading-relaxed break-words text-foreground/70">
                {item.processing_error}
              </p>
            </details>
          )}

          <Button
            onClick={retry}
            disabled={reprocess.isPending}
            variant={broken ? "default" : "outline"}
            className={`mt-3 h-11 gap-1.5 rounded-xl px-4 text-[13px] font-semibold tracking-normal normal-case disabled:opacity-60 ${
              broken
                ? "gradient-primary text-white hover:bg-transparent"
                : "border-border bg-card text-foreground/80 hover:bg-secondary"
            }`}
          >
            {reprocess.isPending ? (
              <>
                Starting <Loader2 className="size-3.5 animate-spin" aria-hidden />
              </>
            ) : (
              <>
                <RotateCw className="size-3.5" aria-hidden />
                {broken ? "Try processing again" : "Try reading it again"}
              </>
            )}
          </Button>
        </div>
      </div>
    </section>
  );
}
