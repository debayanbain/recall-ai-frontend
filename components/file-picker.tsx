"use client";

import { useEffect, useRef, useState } from "react";
import { FileText, UploadCloud, X } from "lucide-react";
import type { UploadLimits } from "@/hooks/use-vault";
import {
  FALLBACK_MAX_BYTES,
  formatSize,
  isPreviewableImage,
  rejectionFor,
} from "@/lib/uploads";

/**
 * Choose one file to capture.
 *
 * The drop zone is a real `<button>`, not a div with drag handlers: drag-and-drop is
 * unusable by keyboard and does not exist on touch, so the same surface opens the system
 * picker on click or Enter/Space. Pasting is handled a level up, in the capture form,
 * because a paste is aimed at the whole sheet rather than at this button — see the
 * `paste` listener there.
 *
 * What it accepts comes from the server (`GET /vault/uploads/limits`) rather than a
 * constant that drifts from the backend's allowlist. Both checks live in `lib/uploads`
 * so the pasted path and the picked path cannot disagree about what is allowed.
 */

export function FilePicker({
  file,
  onFileChange,
  limits,
  busy,
}: {
  file: File | null;
  onFileChange: (file: File | null) => void;
  limits: UploadLimits | undefined;
  busy: boolean;
}) {
  const [dragging, setDragging] = useState(false);
  const [rejected, setRejected] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const preview = useObjectUrl(file);

  const maxBytes = limits?.max_bytes ?? FALLBACK_MAX_BYTES;
  const extensions = limits?.extensions ?? [];
  const accept = extensions.map((ext) => `.${ext}`).join(",");

  const choose = (next: File | undefined | null) => {
    if (!next) return;
    const reason = rejectionFor(next, limits);
    setRejected(reason);
    onFileChange(reason ? null : next);
  };

  if (file) {
    return (
      <div className="mt-4">
        <div className="flex items-center gap-3 rounded-2xl border border-border bg-secondary/40 p-3">
          <span className="grid size-10 shrink-0 place-items-center overflow-hidden rounded-xl bg-primary-soft text-primary">
            {preview ? (
              /* eslint-disable-next-line @next/next/no-img-element -- a blob: URL for a
                 file the user just handed us; next/image has nothing to optimise and no
                 remote pattern to match. */
              <img src={preview} alt="" className="size-full object-cover" />
            ) : (
              <FileText className="size-4" aria-hidden />
            )}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-semibold text-foreground">{file.name}</p>
            <p className="text-[12px] tabular-nums text-muted-foreground">{formatSize(file.size)}</p>
          </div>
          <button
            type="button"
            onClick={() => {
              onFileChange(null);
              setRejected(null);
            }}
            disabled={busy}
            aria-label="Remove this file and choose another"
            className="grid size-11 shrink-0 place-items-center rounded-xl text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-50"
          >
            <X className="size-4" aria-hidden />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-4">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          choose(event.dataTransfer.files?.[0]);
        }}
        disabled={busy}
        className={`grid w-full place-items-center rounded-2xl border-2 border-dashed px-4 py-8 text-center transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-60 ${
          dragging ? "border-primary bg-primary-soft" : "border-border bg-secondary/30 hover:bg-secondary/60"
        }`}
      >
        <UploadCloud className="size-6 text-primary" aria-hidden />
        <span className="mt-2 text-[13px] font-semibold text-foreground">
          Choose a file, drop one here, or paste an image
        </span>
        <span className="mt-1 text-[12px] text-muted-foreground">
          Up to {Math.floor(maxBytes / 1_048_576)}MB
          {extensions.length > 0 && ` · ${extensions.slice(0, 6).join(", ")}…`}
        </span>
      </button>

      <input
        ref={inputRef}
        type="file"
        accept={accept || undefined}
        onChange={(event) => {
          choose(event.target.files?.[0]);
          // Cleared so picking the same file twice in a row still fires a change event.
          event.target.value = "";
        }}
        className="sr-only"
        tabIndex={-1}
        aria-hidden
      />

      {rejected && (
        <p role="alert" className="mt-2 text-[12px] text-destructive">
          {rejected}
        </p>
      )}
      {limits?.storage_enabled === false && (
        <p className="mt-2 text-[12px] leading-relaxed text-muted-foreground">
          File storage isn&rsquo;t configured on this server, so only PDFs and text files
          can be saved — their text becomes the memory.
        </p>
      )}
    </div>
  );
}

/**
 * A blob: URL for the chosen image, revoked when it stops being the chosen image.
 *
 * The URL is minted *inside* the effect, not during render, and that is the whole point
 * of this hook rather than a `useMemo` one-liner. React runs an effect's cleanup once
 * immediately on mount in development (StrictMode), so a URL created during render is
 * revoked by that first cleanup and never re-created -- the `<img>` keeps a src pointing
 * at nothing and renders the browser's broken-image glyph. Minting here means the second
 * run hands back a live URL.
 *
 * Without the revoke the bytes stay alive for the life of the document, which for a sheet
 * someone opens repeatedly is a screenshot's worth of memory per attempt.
 */
function useObjectUrl(file: File | null): string | null {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    // The external system being synchronised is the URL registry: the value cannot be
    // created before the effect without that first StrictMode cleanup revoking it.
    if (!file || !isPreviewableImage(file)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setUrl(null);
      return;
    }
    const next = URL.createObjectURL(file);
    setUrl(next);
    return () => URL.revokeObjectURL(next);
  }, [file]);

  return url;
}
