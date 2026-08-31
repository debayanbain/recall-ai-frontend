"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { AlertTriangle, Loader2, Pause, Play } from "lucide-react";
import { useReducedMotion } from "motion/react";
import { useFileLink } from "@/hooks/use-vault";
import { ApiError } from "@/lib/api";
import type { VaultItemDetail } from "@/lib/types";

/**
 * The banner for a memory that is a recording.
 *
 * It replaces `MemoryBanner` for audio rather than sitting under it: for every other kind
 * the banner is decoration over content that is further down the page, but here the
 * recording *is* the memory — the transcript below is a reading of it, and the AI summary
 * is a reading of the transcript. So the top of the page is the player.
 *
 * The waveform is the amplitude the recorder actually measured, sent with the clip and
 * kept in `item_metadata.waveform`. It is not derived here on purpose: reading peaks off
 * the stored file means downloading and decoding the audio in the browser, and the
 * presigned URL that serves it is not fetchable cross-origin. When a memory has no peaks
 * — recorded before this existed, or on a device where the meter could not be built — the
 * bars fall back to a flat baseline. **Do not synthesize a shape from the item id**: a
 * plausible-looking waveform that has nothing to do with the audio is a picture of data
 * that does not exist, and nobody looking at it could tell.
 */

const DEFAULT_ACCENT = "from-violet-100 to-indigo-50";

/** Height of a bar with no measured peak, as a percentage of the track. */
const BASELINE = 6;

export function VoiceHero({
  item,
  accent = DEFAULT_ACCENT,
  className = "",
  children,
}: {
  item: VaultItemDetail;
  accent?: string;
  className?: string;
  /** The type badge, positioned by the caller exactly as it is over `MemoryBanner`. */
  children?: ReactNode;
}) {
  const link = useFileLink();
  const reduced = useReducedMotion();
  const audioRef = useRef<HTMLAudioElement>(null);

  const [src, setSrc] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // At most one silent re-mint per mount. Never reset on success: an expired link and an
  // undecodable file raise the same `error` event, so a guard that clears itself turns a
  // recording this browser genuinely cannot play into an endless refetch loop.
  const retriedRef = useRef(false);
  const autoplayRef = useRef(false);

  const peaks = peaksFrom(item.item_metadata.waveform);
  // Whisper measured this, so the scrubber has a real length before the audio is even
  // fetched — which matters because a MediaRecorder WebM carries no duration in its
  // header and reports `Infinity` until it is fully buffered.
  const known = numberFrom(item.item_metadata.duration_seconds);
  const [measured, setMeasured] = useState<number | null>(null);
  const duration = measured ?? known ?? 0;
  const progress = duration > 0 ? Math.min(1, current / duration) : 0;

  const load = (autoplay: boolean) => {
    setError(null);
    autoplayRef.current = autoplay;
    link.mutate(item.id, {
      onSuccess: (file) => setSrc(file.url),
      onError: (err) =>
        setError(
          err instanceof ApiError && err.status === 404
            ? "The recording isn't stored for this memory — only the transcript was kept."
            : "Couldn't load the audio. Try again in a moment.",
        ),
    });
  };

  const toggle = () => {
    const el = audioRef.current;
    if (!el || !src) {
      load(true);
      return;
    }
    if (el.paused) void el.play().catch(() => {});
    else el.pause();
  };

  const seek = (seconds: number) => {
    setCurrent(seconds);
    const el = audioRef.current;
    if (el && Number.isFinite(el.duration)) el.currentTime = seconds;
  };

  useEffect(() => {
    const el = audioRef.current;
    if (!el || !src) return;

    if (autoplayRef.current) {
      autoplayRef.current = false;
      // A rejection here is an autoplay-policy decision, not a failure — the button is
      // right there and the user can press it again.
      void el.play().catch(() => {});
    }

    const onTime = () => setCurrent(el.currentTime);
    const onMeta = () => {
      if (Number.isFinite(el.duration) && el.duration > 0) setMeasured(el.duration);
    };
    const onEnded = () => {
      setPlaying(false);
      setCurrent(0);
    };
    const onError = () => {
      if (!retriedRef.current) {
        // Most likely the link simply expired while the page sat open.
        retriedRef.current = true;
        load(true);
        return;
      }
      setError("This browser can't play that recording. Download it to listen elsewhere.");
    };

    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);

    el.addEventListener("timeupdate", onTime);
    el.addEventListener("loadedmetadata", onMeta);
    el.addEventListener("durationchange", onMeta);
    el.addEventListener("ended", onEnded);
    el.addEventListener("error", onError);
    el.addEventListener("play", onPlay);
    el.addEventListener("pause", onPause);
    return () => {
      el.removeEventListener("timeupdate", onTime);
      el.removeEventListener("loadedmetadata", onMeta);
      el.removeEventListener("durationchange", onMeta);
      el.removeEventListener("ended", onEnded);
      el.removeEventListener("error", onError);
      el.removeEventListener("play", onPlay);
      el.removeEventListener("pause", onPause);
    };
    // `load` is rebuilt every render but only touches refs and stable mutation state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src]);

  const language = stringFrom(item.item_metadata.transcript_language);

  return (
    <div className={`relative overflow-hidden bg-linear-to-br ${accent} ${className}`}>
      <div aria-hidden className="absolute inset-0 grid-dots opacity-60" />
      {children}

      {/* The element is never shown: its own controls would be a second transport next to
          the one below, and this surface needs the waveform to be the scrubber. */}
      {src && <audio ref={audioRef} src={src} preload="metadata" className="hidden" />}

      <div className="absolute inset-x-0 bottom-0 p-3 sm:p-4 md:p-5">
        <div className="flex items-center gap-3 rounded-2xl border border-white/60 bg-card/80 p-2.5 backdrop-blur sm:gap-4 sm:p-3">
          <button
            type="button"
            onClick={toggle}
            disabled={link.isPending}
            aria-label={playing ? "Pause recording" : "Play recording"}
            className="grid size-12 shrink-0 place-items-center rounded-full gradient-primary text-white transition-transform focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary active:scale-95 disabled:opacity-60 sm:size-14"
          >
            {link.isPending ? (
              <Loader2 className="size-5 animate-spin" aria-hidden />
            ) : playing ? (
              <Pause className="size-5 fill-current sm:size-6" aria-hidden />
            ) : (
              // Nudged right so the triangle reads as centred in the circle.
              <Play className="size-5 translate-x-px fill-current sm:size-6" aria-hidden />
            )}
          </button>

          <div className="min-w-0 flex-1">
            <Scrubber
              peaks={peaks}
              progress={progress}
              duration={duration}
              current={current}
              onSeek={seek}
              reduced={Boolean(reduced)}
            />
            <div className="mt-1.5 flex items-center justify-between gap-2 text-[11.5px] text-muted-foreground">
              <span className="tabular-nums">{formatTime(current)}</span>
              <span className="flex items-center gap-1.5 truncate">
                {language && <span className="capitalize">{language}</span>}
                {language && duration > 0 && <span aria-hidden>·</span>}
                {duration > 0 && <span className="tabular-nums">{formatTime(duration)}</span>}
              </span>
            </div>
          </div>
        </div>

        {error && (
          <p
            role="alert"
            className="mt-2 flex items-start gap-1.5 rounded-xl bg-card/85 px-2.5 py-1.5 text-[12px] leading-relaxed text-destructive backdrop-blur"
          >
            <AlertTriangle className="mt-px size-3.5 shrink-0" aria-hidden />
            {error}
          </p>
        )}
      </div>
    </div>
  );
}

/**
 * The waveform, doubling as the transport.
 *
 * The bars are `aria-hidden` decoration; the control underneath them is a real
 * `<input type="range">`. That is what gives arrow-key seeking, Home/End, and a screen
 * reader that says "Seek, 7 of 42 seconds" — all of which a div with click handlers has
 * to reimplement, and usually does not.
 */
function Scrubber({
  peaks,
  progress,
  duration,
  current,
  onSeek,
  reduced,
}: {
  peaks: number[];
  progress: number;
  duration: number;
  current: number;
  onSeek: (seconds: number) => void;
  reduced: boolean;
}) {
  const [focused, setFocused] = useState(false);
  const bars = peaks.length > 0 ? peaks : Array(48).fill(0);
  const played = Math.round(progress * bars.length);

  return (
    <div
      className={`relative h-11 rounded-lg transition-shadow sm:h-12 ${
        focused ? "ring-2 ring-primary ring-offset-2 ring-offset-card" : ""
      }`}
    >
      <svg
        aria-hidden
        viewBox={`0 0 ${bars.length * 3} 100`}
        preserveAspectRatio="none"
        className="pointer-events-none size-full"
      >
        {bars.map((peak, index) => {
          // Mirrored around the centre line, with a floor so a silent stretch still reads
          // as part of the recording rather than as a gap in it.
          const height = Math.max(BASELINE, peak);
          return (
            <rect
              key={index}
              x={index * 3}
              y={(100 - height) / 2}
              width={2}
              height={height}
              rx={1}
              className={index < played ? "fill-primary" : "fill-foreground/20"}
              // Colour is not the only cue -- the time readout below says the same thing
              // -- so this transition is polish, not information.
              style={reduced ? undefined : { transition: "fill 120ms linear" }}
            />
          );
        })}
      </svg>
      <input
        type="range"
        min={0}
        max={duration || 0}
        step={0.1}
        value={Math.min(current, duration || 0)}
        disabled={duration <= 0}
        onChange={(event) => onSeek(Number(event.target.value))}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        aria-label="Seek within the recording"
        aria-valuetext={`${formatTime(current)} of ${formatTime(duration)}`}
        // Invisible but real: the bars above are the visuals, this is the control. The
        // whole 44px-tall row is the hit area, so seeking never needs a precise tap.
        className="absolute inset-0 size-full cursor-pointer appearance-none bg-transparent opacity-0 focus:outline-none disabled:cursor-default"
      />
    </div>
  );
}

/** True when this memory has audio in the bucket. `file_name` is only set once the object
 *  really landed, and the mime type is what makes it playable. */
export function hasAudio(item: VaultItemDetail): boolean {
  return Boolean(item.file_name) && Boolean(item.mime_type?.startsWith("audio/"));
}

/** Peaks are validated and clamped server-side; this only guards against the column
 *  holding something older or hand-edited. */
function peaksFrom(value: unknown): number[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((v): v is number => typeof v === "number" && Number.isFinite(v))
    .map((v) => Math.max(0, Math.min(100, v)));
}

function numberFrom(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : null;
}

function stringFrom(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}

function formatTime(totalSeconds: number): string {
  const whole = Math.max(0, Math.floor(totalSeconds));
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, "0")}`;
}
