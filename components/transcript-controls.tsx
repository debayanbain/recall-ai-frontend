"use client";

import { useState } from "react";
import { Languages, Loader2, RotateCw } from "lucide-react";
import { toast } from "@/lib/toast";
import { Button } from "@/components/ui/button";
import { useReprocessItem, useUploadLimits } from "@/hooks/use-vault";
import { ApiError } from "@/lib/api";
import type { VaultItemDetail } from "@/lib/types";

/**
 * Redo a voice note's transcript, in a language you name.
 *
 * This exists because a transcript is the one output in the whole pipeline that can be
 * **confidently, fluently wrong**. A summary that misses the point still reads as a
 * summary of the right document; auto-detection hearing a Bengali clip as Chinese
 * produces a perfect transcript of a language nobody spoke, and every downstream
 * artefact — the title, the tags, the embedding — is then correct about the wrong text.
 * Nothing about the result looks broken, so nothing else on the page would offer a way
 * out of it.
 *
 * Shown for a completed voice note too, unlike the generic retry, because "finished" is
 * exactly what makes that state unfixable otherwise. The audio is still in the bucket,
 * so the words can be rebuilt from it.
 */
export function TranscriptControls({ item }: { item: VaultItemDetail }) {
  const reprocess = useReprocessItem();
  const limits = useUploadLimits();
  const languages = limits.data?.voice.languages ?? [];

  const detected = stringFrom(item.item_metadata.transcript_language);
  const pinned = stringFrom(item.item_metadata.transcribe_language);
  const [language, setLanguage] = useState(pinned ?? "");

  const queued =
    item.processing_status === "pending" || item.processing_status === "processing";
  // A re-transcription is the only state where a voice note is queued with no words:
  // `reprocess` clears `content` so the worker re-reads the audio, while an ordinary
  // first pass already has the transcript and is queued for the summary. Read off the
  // data rather than tracked in state, so it survives a reload mid-run.
  const retranscribing = queued && !item.content;
  // Disabled while anything is queued -- the server refuses a second request anyway --
  // but only *labelled* as transcribing when that is what is actually happening.
  const busy = reprocess.isPending || queued;

  const run = () => {
    reprocess.mutate(
      { id: item.id, language: language || undefined },
      {
        onSuccess: () =>
          toast.success("Transcribing again", {
            description: language
              ? `Reading it as ${labelFor(languages, language)}.`
              : "Detecting the language again.",
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
      aria-labelledby="transcript-controls-title"
      className="mt-6 rounded-[calc(var(--radius)+4px)] border border-border bg-secondary/40 p-4 sm:mt-7 sm:p-5"
    >
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <div className="min-w-0">
          <h2
            id="transcript-controls-title"
            className="text-[13px] font-semibold text-foreground"
          >
            Transcript
          </h2>
          <p className="mt-0.5 text-[12px] text-muted-foreground">
            {/* Says which of the two it was. "Detected" is a guess the reader may want to
                overrule; "set to" is a choice they already made. */}
            {pinned
              ? `Read as ${labelFor(languages, pinned)}.`
              : detected
                ? `Language detected as ${capitalise(detected)}.`
                : "Language was detected automatically."}{" "}
            Not right? Name the language and read it again.
          </p>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Languages className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
        <label htmlFor="transcript-language" className="sr-only">
          Spoken language
        </label>
        <select
          id="transcript-language"
          value={language}
          onChange={(event) => setLanguage(event.target.value)}
          disabled={busy}
          className="h-11 min-w-[10rem] rounded-xl border border-border bg-card px-2.5 text-[13px] text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-60"
        >
          <option value="">Detect automatically</option>
          {languages.map((entry) => (
            <option key={entry.code} value={entry.code}>
              {entry.label}
            </option>
          ))}
        </select>
        <Button
          onClick={run}
          disabled={busy}
          variant="outline"
          className="h-11 gap-1.5 rounded-xl border-border bg-card px-4 text-[13px] font-semibold tracking-normal text-foreground/80 normal-case hover:bg-secondary disabled:opacity-60"
        >
          {reprocess.isPending || retranscribing ? (
            <>
              Transcribing <Loader2 className="size-3.5 animate-spin" aria-hidden />
            </>
          ) : queued ? (
            <>
              Reading it <Loader2 className="size-3.5 animate-spin" aria-hidden />
            </>
          ) : (
            <>
              <RotateCw className="size-3.5" aria-hidden /> Transcribe again
            </>
          )}
        </Button>
      </div>

      <p className="mt-2 text-[11.5px] leading-relaxed text-muted-foreground">
        The recording is kept, so this rebuilds the words from the audio. The summary,
        tags and search index are rebuilt with them.
      </p>
    </section>
  );
}

function labelFor(languages: { code: string; label: string }[], code: string): string {
  return languages.find((entry) => entry.code === code)?.label ?? code;
}

function capitalise(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function stringFrom(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}
