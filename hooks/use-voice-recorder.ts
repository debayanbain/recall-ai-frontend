"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Hold-to-record built on MediaRecorder.
 *
 * Three things this has to get right, none of them obvious:
 *
 * 1. **The container is negotiated, not assumed.** Chrome and Firefox record WebM/Opus;
 *    Safari records MP4/AAC and supports no WebM at all. Hardcoding one mime type gives
 *    the other browser an empty blob with no error, which reads as a broken mic. The
 *    server sniffs the bytes anyway and never trusts what we call it.
 * 2. **The microphone track must be stopped, not just the recorder.** A live
 *    `MediaStreamTrack` keeps the browser's recording indicator lit and, on mobile,
 *    holds the audio session open. Every exit path — release, cancel, unmount, the
 *    duration cap — runs the same teardown.
 * 3. **A tap is not a hold.** Releasing within `MIN_MS` produces a fraction of a second
 *    of audio that costs a paid transcription to discover is nothing. It is discarded
 *    with a hint instead.
 */

/** Preference order. The first supported entry wins; the list ends with a bare fallback. */
const CANDIDATE_TYPES = [
  "audio/webm;codecs=opus",
  "audio/webm",
  "audio/mp4;codecs=mp4a.40.2",
  "audio/mp4",
  "audio/ogg;codecs=opus",
] as const;

/** Shorter than this and the user tapped rather than held. */
const MIN_MS = 600;

/** Bars in the live meter. Also the length of the rolling amplitude window. */
export const METER_BARS = 28;

/** ~15fps for the meter: enough to read as live, few enough to stay off the main thread. */
const METER_INTERVAL_MS = 66;

/**
 * Bars kept for the saved waveform.
 *
 * The meter above is a rolling window of the last moment; this is the shape of the *whole*
 * recording, downsampled once on stop and sent with the clip. 48 is what a hero banner can
 * draw legibly at 375px without the bars becoming hairlines, and it costs ~200 bytes of
 * metadata — cheap enough that it never justifies decoding the audio again later.
 */
export const WAVEFORM_BUCKETS = 48;

export type RecorderStatus = "idle" | "requesting" | "recording" | "ready" | "error";

export type VoiceClip = {
  blob: Blob;
  /** Object URL for local playback. Revoked by `reset` and on unmount. */
  url: string;
  seconds: number;
  /**
   * Amplitude peaks across the whole recording, 0-100, one per bucket.
   *
   * Measured while recording, not derived from the file afterwards: reading peaks back
   * would mean re-downloading the audio and decoding it in the browser, and the presigned
   * URL that serves it is not fetchable cross-origin. Empty when the meter could not be
   * built — the UI then draws a flat baseline rather than inventing a shape.
   */
  peaks: number[];
};

/** Collapse a long amplitude series into `buckets` peaks, as ints 0-100. */
function downsample(samples: number[], buckets: number): number[] {
  if (samples.length === 0) return [];
  const width = samples.length / buckets;
  const out: number[] = [];
  for (let i = 0; i < buckets; i += 1) {
    const start = Math.floor(i * width);
    const end = Math.max(start + 1, Math.floor((i + 1) * width));
    let peak = 0;
    // Peak rather than mean: an average flattens speech into a uniform band, and the
    // point of the shape is to show where the loud parts were.
    for (let j = start; j < end && j < samples.length; j += 1) peak = Math.max(peak, samples[j]);
    out.push(Math.round(Math.min(1, peak) * 100));
  }
  return out;
}

function pickMimeType(): string | undefined {
  if (typeof MediaRecorder === "undefined") return undefined;
  return CANDIDATE_TYPES.find((type) => MediaRecorder.isTypeSupported(type));
}

/** Whether this browser can record at all — `getUserMedia` needs a secure context. */
export function recordingSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof MediaRecorder !== "undefined" &&
    Boolean(navigator.mediaDevices?.getUserMedia)
  );
}

export function useVoiceRecorder({ maxSeconds = 300 }: { maxSeconds?: number } = {}) {
  const [status, setStatus] = useState<RecorderStatus>("idle");
  const [seconds, setSeconds] = useState(0);
  const [levels, setLevels] = useState<number[]>(() => Array(METER_BARS).fill(0));
  const [clip, setClip] = useState<VoiceClip | null>(null);
  const [error, setError] = useState<string | null>(null);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const startedAtRef = useRef(0);
  // Every amplitude sample of the current recording, downsampled once on stop.
  const peaksRef = useRef<number[]>([]);
  const timersRef = useRef<number[]>([]);
  // Set when the recording is being thrown away rather than kept, so `onstop` knows not
  // to hand back a clip nobody asked for.
  const discardRef = useRef(false);

  const clearTimers = useCallback(() => {
    timersRef.current.forEach((id) => window.clearInterval(id));
    timersRef.current.forEach((id) => window.clearTimeout(id));
    timersRef.current = [];
  }, []);

  /** Releases the mic and the audio graph. Safe to call more than once. */
  const teardown = useCallback(() => {
    clearTimers();
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    audioCtxRef.current?.close().catch(() => {});
    audioCtxRef.current = null;
    recorderRef.current = null;
  }, [clearTimers]);

  // The clip URL outlives every render until it is replaced, so it is revoked here
  // rather than in an effect keyed on it — a re-render must not invalidate a live <audio>.
  const revoke = useCallback((current: VoiceClip | null) => {
    if (current) URL.revokeObjectURL(current.url);
  }, []);

  useEffect(() => {
    return () => {
      teardown();
      setClip((current) => {
        revoke(current);
        return null;
      });
    };
  }, [teardown, revoke]);

  const reset = useCallback(() => {
    setClip((current) => {
      revoke(current);
      return null;
    });
    setSeconds(0);
    setLevels(Array(METER_BARS).fill(0));
    setError(null);
    setStatus("idle");
  }, [revoke]);

  const stop = useCallback(
    ({ discard = false }: { discard?: boolean } = {}) => {
      const recorder = recorderRef.current;
      if (!recorder || recorder.state === "inactive") return;
      discardRef.current = discard;
      // `onstop` fires after the final dataavailable, so teardown happens there.
      recorder.stop();
    },
    [],
  );

  const start = useCallback(async () => {
    if (status === "recording" || status === "requesting") return;
    setError(null);
    revoke(clip);
    setClip(null);
    setStatus("requesting");

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
    } catch (err) {
      // NotAllowedError is a decision, not a fault: say what to do about it rather than
      // reporting a DOMException name nobody can act on.
      const denied =
        err instanceof DOMException &&
        (err.name === "NotAllowedError" || err.name === "SecurityError");
      setError(
        denied
          ? "Microphone access is blocked. Allow it in your browser's site settings, then try again."
          : "No microphone found. Check that one is connected and not in use by another app.",
      );
      setStatus("error");
      return;
    }

    streamRef.current = stream;
    chunksRef.current = [];
    peaksRef.current = [];
    discardRef.current = false;

    const mimeType = pickMimeType();
    const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
    recorderRef.current = recorder;

    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunksRef.current.push(event.data);
    };

    recorder.onstop = () => {
      const elapsedMs = Date.now() - startedAtRef.current;
      const parts = chunksRef.current;
      chunksRef.current = [];
      teardown();

      if (discardRef.current) {
        setStatus("idle");
        setSeconds(0);
        setLevels(Array(METER_BARS).fill(0));
        return;
      }
      if (elapsedMs < MIN_MS || parts.length === 0) {
        setError("Hold the button while you speak — that was too short to hear.");
        setStatus("idle");
        setSeconds(0);
        setLevels(Array(METER_BARS).fill(0));
        return;
      }

      // `recorder.mimeType` is what the browser actually chose, which is not always what
      // was requested. The blob type is a hint only; the server decides from the bytes.
      const blob = new Blob(parts, { type: recorder.mimeType || mimeType || "audio/webm" });
      setClip({
        blob,
        url: URL.createObjectURL(blob),
        seconds: Math.round(elapsedMs / 1000),
        peaks: downsample(peaksRef.current, WAVEFORM_BUCKETS),
      });
      setStatus("ready");
    };

    recorder.onerror = () => {
      teardown();
      setError("Recording stopped unexpectedly. Try again.");
      setStatus("error");
    };

    // Timeslice so a long note streams into chunks instead of one growing buffer, and so
    // a crash mid-recording still leaves something behind.
    recorder.start(1000);
    startedAtRef.current = Date.now();
    setSeconds(0);
    setStatus("recording");

    timersRef.current.push(
      window.setInterval(
        () => setSeconds(Math.floor((Date.now() - startedAtRef.current) / 1000)),
        250,
      ),
    );

    // The cap is enforced here as well as by the server's size limit: a button held down
    // in a pocket should end by itself, not by being rejected after the upload.
    timersRef.current.push(
      window.setTimeout(() => stop(), maxSeconds * 1000),
    );

    // --- live meter ---
    try {
      const AudioCtx =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      if (AudioCtx) {
        const ctx = new AudioCtx();
        audioCtxRef.current = ctx;
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 512;
        ctx.createMediaStreamSource(stream).connect(analyser);
        const buffer = new Uint8Array(analyser.fftSize);

        timersRef.current.push(
          window.setInterval(() => {
            analyser.getByteTimeDomainData(buffer);
            // RMS around the 128 centre line, scaled so ordinary speech fills the meter
            // without clipping every bar to the top.
            let sum = 0;
            for (const sample of buffer) {
              const centred = (sample - 128) / 128;
              sum += centred * centred;
            }
            const rms = Math.sqrt(sum / buffer.length);
            const level = Math.min(1, rms * 3.2);
            peaksRef.current.push(level);
            setLevels((prev) => [...prev.slice(1), level]);
          }, METER_INTERVAL_MS),
        );
      }
    } catch {
      // A meter is decoration. Losing it must never cost the recording.
    }
  }, [clip, maxSeconds, revoke, status, stop, teardown]);

  return {
    status,
    seconds,
    levels,
    clip,
    error,
    start,
    stop,
    reset,
    maxSeconds,
    supported: recordingSupported(),
  };
}
