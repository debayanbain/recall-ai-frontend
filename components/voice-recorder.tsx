"use client";

import { useEffect, useRef } from "react";
import { Languages, Loader2, Mic, RotateCcw, Square } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { useVoiceRecorder, type VoiceClip } from "@/hooks/use-voice-recorder";

/**
 * Hold-to-record capture.
 *
 * Holding is the gesture, but it is not the only way in: a press-and-hold cannot be
 * performed with a keyboard, so Space and Enter toggle the same recording. A gesture with
 * no visible alternative is a feature some people simply cannot use.
 *
 * The transcript is not shown before saving because it does not exist yet — the words
 * come back from the server, which is also where the language is detected. What this
 * screen owes the user instead is an escape route: play it back, re-record, or cancel
 * before anything is sent.
 */
export function VoiceRecorder({
  onClipChange,
  maxSeconds,
  busy,
  language,
  onLanguageChange,
  languages,
}: {
  onClipChange: (clip: VoiceClip | null) => void;
  maxSeconds: number;
  /** True while the clip is uploading, so the controls cannot be used mid-flight. */
  busy: boolean;
  /** ISO-639-1, or "" for auto-detect. */
  language: string;
  onLanguageChange: (code: string) => void;
  /** From the server, so the picker can only offer codes the server honours. */
  languages: { code: string; label: string }[];
}) {
  const recorder = useVoiceRecorder({ maxSeconds });
  const { status, seconds, levels, clip, error, start, stop, reset, supported } = recorder;
  const reduced = useReducedMotion();

  // Whether the pointer/key is still down. `start` is async (permission, device open), so
  // a quick tap can release before recording has begun; this is what lets the release be
  // honoured once it does.
  const holdingRef = useRef(false);

  useEffect(() => {
    if (status === "recording" && !holdingRef.current) stop({ discard: true });
  }, [status, stop]);

  useEffect(() => {
    onClipChange(clip);
  }, [clip, onClipChange]);

  const press = () => {
    if (busy) return;
    holdingRef.current = true;
    void start();
  };

  const release = () => {
    if (!holdingRef.current) return;
    holdingRef.current = false;
    stop();
  };

  /** Keyboard has no hold, so the same key starts and stops. */
  const toggle = () => {
    if (busy) return;
    if (status === "recording") {
      holdingRef.current = false;
      stop();
    } else {
      holdingRef.current = true;
      void start();
    }
  };

  if (!supported) {
    return (
      <div className="mt-4 rounded-2xl border border-border bg-secondary/40 px-4 py-5 text-center">
        <p className="text-[13px] font-semibold text-foreground">
          This browser can&rsquo;t record audio
        </p>
        <p className="mx-auto mt-1 max-w-xs text-[12.5px] leading-relaxed text-muted-foreground">
          Recording needs a secure (https) page and a browser with microphone support. Try
          Chrome, Safari or Firefox — or write a quick note instead.
        </p>
      </div>
    );
  }

  if (clip) {
    return (
      <div className="mt-4 rounded-2xl border border-border bg-secondary/40 p-3.5">
        <div className="flex items-center justify-between gap-3">
          <p className="text-[12.5px] font-semibold text-foreground">
            Recorded{" "}
            <span className="font-normal tabular-nums text-muted-foreground">
              {formatTime(clip.seconds)}
            </span>
          </p>
          <button
            type="button"
            onClick={reset}
            disabled={busy}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg px-2.5 text-[12.5px] font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-50"
          >
            <RotateCcw className="size-3.5" aria-hidden /> Re-record
          </button>
        </div>
        {/* The browser's own player: transport controls, keyboard support and a scrub
            bar that a hand-rolled one would have to reimplement badly. */}
        <audio
          src={clip.url}
          controls
          preload="metadata"
          className="mt-2.5 h-10 w-full"
          aria-label="Play back your recording"
        />
        <p className="mt-2 text-[11.5px] leading-relaxed text-muted-foreground">
          {language
            ? `Recall transcribes this as ${
                languages.find((l) => l.code === language)?.label ?? language
              } when you save it.`
            : "Recall transcribes this when you save it, detecting the language itself. Re-record to name it instead."}
        </p>
      </div>
    );
  }

  const recording = status === "recording";
  const requesting = status === "requesting";
  const remaining = maxSeconds - seconds;

  return (
    <div className="mt-4 rounded-2xl border border-border bg-secondary/40 px-4 py-5">
      <div className="flex flex-col items-center">
        <button
          type="button"
          disabled={busy}
          onPointerDown={(event) => {
            // Capture so a finger that slides off the button still delivers the release
            // here, rather than leaving a recording running with nothing to stop it.
            event.currentTarget.setPointerCapture(event.pointerId);
            press();
          }}
          onPointerUp={release}
          onPointerCancel={release}
          onLostPointerCapture={release}
          onKeyDown={(event) => {
            if (event.key !== " " && event.key !== "Enter") return;
            event.preventDefault(); // Space would scroll the dialog behind it.
            if (!event.repeat) toggle();
          }}
          // Without this, holding on a touchscreen scrolls the sheet instead of recording.
          style={{ touchAction: "none" }}
          aria-pressed={recording}
          aria-label={
            recording ? "Stop recording" : "Hold to record a voice note, or press Enter to start"
          }
          className={`relative grid size-[72px] place-items-center rounded-full transition-transform focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary active:scale-95 disabled:opacity-60 ${
            recording ? "bg-destructive text-white" : "gradient-primary text-white"
          }`}
        >
          {recording && !reduced && (
            <motion.span
              aria-hidden
              className="absolute inset-0 rounded-full bg-destructive/30"
              animate={{ scale: [1, 1.35], opacity: [0.5, 0] }}
              transition={{ duration: 1.4, repeat: Infinity, ease: "easeOut" }}
            />
          )}
          {requesting ? (
            <Loader2 className="size-6 animate-spin" aria-hidden />
          ) : recording ? (
            <Square className="size-5 fill-current" aria-hidden />
          ) : (
            <Mic className="size-6" aria-hidden />
          )}
        </button>

        {/* Announced rather than only drawn: the meter and the timer say nothing to a
            screen reader, and "am I being recorded" is not a question to leave open. */}
        <p aria-live="polite" className="mt-3 text-[12.5px] font-medium text-foreground">
          {requesting
            ? "Waiting for the microphone…"
            : recording
              ? `Recording ${formatTime(seconds)}`
              : "Hold to speak"}
        </p>
        <p className="mt-0.5 text-[11.5px] text-muted-foreground">
          {recording
            ? remaining <= 30
              ? `${remaining}s left`
              : "Release to finish"
            : "Or press Enter to start and stop"}
        </p>

        <Meter levels={levels} active={recording} reduced={Boolean(reduced)} />

        {/* Before recording, not after: picking a language afterwards would imply this
            screen re-transcribes, and it does not -- the choice is sent with the clip.
            Auto is the default because a multilingual vault wants it, but auto-detection
            is a guess, and on a short clip in a non-Latin script it is a guess that has
            been observed going badly wrong (Bengali returned as Traditional Chinese).
            Naming the language removes the detection step entirely. */}
        {!recording && !requesting && languages.length > 0 && (
          <div className="mt-3 flex w-full items-center justify-center gap-2">
            <Languages className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
            <label htmlFor="voice-language" className="text-[12px] text-muted-foreground">
              Spoken language
            </label>
            <select
              id="voice-language"
              value={language}
              onChange={(event) => onLanguageChange(event.target.value)}
              disabled={busy}
              className="h-9 max-w-[10.5rem] rounded-lg border border-border bg-card px-2 text-[12.5px] text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-60"
            >
              <option value="">Auto-detect</option>
              {languages.map((entry) => (
                <option key={entry.code} value={entry.code}>
                  {entry.label}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {error && (
        <p role="alert" className="mt-3 text-center text-[12px] text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

/**
 * Live amplitude, drawn as bars.
 *
 * Purely decorative and marked `aria-hidden` — the status line above is what carries the
 * meaning. Bars use `scaleY` on a fixed-height element so the row never reflows: 15
 * layout passes a second inside an open dialog is the kind of jank that reads as a slow
 * app rather than a busy one.
 */
function Meter({
  levels,
  active,
  reduced,
}: {
  levels: number[];
  active: boolean;
  reduced: boolean;
}) {
  return (
    <div aria-hidden className="mt-4 flex h-8 w-full items-center justify-center gap-[3px]">
      {levels.map((level, index) => (
        <span
          key={index}
          className={`h-8 w-[3px] origin-center rounded-full transition-transform duration-100 ease-out ${
            active ? "bg-primary" : "bg-border"
          }`}
          style={{
            // A floor so a silent meter is a flat line rather than nothing at all.
            transform: `scaleY(${active && !reduced ? Math.max(0.06, level) : 0.06})`,
          }}
        />
      ))}
    </div>
  );
}

function formatTime(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}
