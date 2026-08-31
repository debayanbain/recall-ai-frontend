"use client";

import { useRef, useState } from "react";
import { FileText, UploadCloud, X } from "lucide-react";
import type { UploadLimits } from "@/hooks/use-vault";

/**
 * Choose one file to capture.
 *
 * The drop zone is a real `<button>`, not a div with drag handlers: drag-and-drop is
 * unusable by keyboard and does not exist on touch, so the same surface opens the system
 * picker on click or Enter/Space.
 *
 * What it accepts comes from the server (`GET /vault/uploads/limits`) rather than a
 * constant that drifts from the backend's allowlist. Both checks here are conveniences —
 * the server re-decides the type from the file's *bytes* and re-enforces the size cap by
 * reading one byte past it — but a 25MB round trip is a slow way to learn a file was too
 * big or the wrong kind.
 */

const FALLBACK_MAX_BYTES = 25 * 1024 * 1024;

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

  const maxBytes = limits?.max_bytes ?? FALLBACK_MAX_BYTES;
  const extensions = limits?.extensions ?? [];
  const accept = extensions.map((ext) => `.${ext}`).join(",");

  const choose = (next: File | undefined | null) => {
    if (!next) return;
    setRejected(null);
    const ext = next.name.includes(".") ? next.name.split(".").pop()!.toLowerCase() : "";
    if (extensions.length > 0 && !extensions.includes(ext)) {
      setRejected(`That file type isn't supported. Allowed: ${extensions.join(", ")}.`);
      onFileChange(null);
      return;
    }
    if (next.size > maxBytes) {
      setRejected(
        `That file is ${Math.round(next.size / 1_048_576)}MB — the limit is ${Math.floor(
          maxBytes / 1_048_576,
        )}MB.`,
      );
      onFileChange(null);
      return;
    }
    onFileChange(next);
  };

  if (file) {
    return (
      <div className="mt-4">
        <div className="flex items-center gap-3 rounded-2xl border border-border bg-secondary/40 p-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary">
            <FileText className="size-4" aria-hidden />
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
          Choose a file, or drop one here
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

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1_048_576) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1_048_576).toFixed(1)} MB`;
}
