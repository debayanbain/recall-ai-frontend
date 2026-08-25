"use client";

import { useCallback, useRef, useState } from "react";
import Link from "next/link";
import { FileText, Loader2, UploadCloud } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useSession } from "@/hooks/use-auth";
import { useUploadPdf } from "@/hooks/use-vault";
import { ApiError } from "@/lib/api";

const MAX_MB = 10;

/**
 * Drag-and-drop PDF capture.
 *
 * The drop zone is also a real button: drag-and-drop alone is unusable by keyboard and
 * on touch, so the same area opens the file picker on click or Enter/Space.
 *
 * Only the text is uploaded onward — the server extracts it and discards the file — so
 * there is no storage step to wait on and nothing to clean up if the user cancels.
 */
export function PdfDrop({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const upload = useUploadPdf();
  const { isSignedIn, isLoading: sessionLoading } = useSession();

  const send = useCallback(
    (file: File) => {
      setError(null);
      // Checked here as well as server-side: a 10MB round trip only to be rejected is a
      // slow way to learn the file was too big.
      if (file.size > MAX_MB * 1024 * 1024) {
        setError(`That file is ${Math.round(file.size / 1_048_576)}MB — the limit is ${MAX_MB}MB.`);
        return;
      }
      upload.mutate(file, {
        onSuccess: (item) => {
          onOpenChange(false);
          toast.success("Added to your vault", {
            description: `${item.title ?? file.name} · Recall is reading it now`,
          });
        },
        onError: (err) => {
          // The API's own message is written for humans ("this looks like a scanned
          // PDF"); anything else gets generic copy rather than a raw status.
          setError(
            err instanceof ApiError && err.status < 500
              ? err.message
              : "Upload failed. Check your connection and try again.",
          );
        },
      });
    },
    [upload, onOpenChange],
  );

  const onDrop = (event: React.DragEvent) => {
    event.preventDefault();
    setDragging(false);
    const file = event.dataTransfer.files?.[0];
    if (file) send(file);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle>Add a PDF</DialogTitle>
          <DialogDescription>
            RecallAI reads the text, summarizes it and files it with everything else. The
            file itself isn&rsquo;t stored.
          </DialogDescription>
        </DialogHeader>

        {!sessionLoading && !isSignedIn ? (
          <div className="rounded-2xl border border-dashed border-border bg-secondary/30 px-6 py-10 text-center">
            <p className="text-[13.5px] font-semibold">Sign in to add a PDF</p>
            <p className="mx-auto mt-1 max-w-xs text-[12.5px] leading-relaxed text-muted-foreground">
              Uploads go into your own vault, so we need to know whose it is.
            </p>
            <Link
              href="/sign-in"
              className="mt-4 inline-flex h-11 items-center justify-center rounded-xl gradient-primary px-4 text-[13.5px] font-semibold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              Sign in
            </Link>
          </div>
        ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          disabled={upload.isPending}
          aria-label="Choose a PDF, or drop one here"
          className={`grid w-full place-items-center rounded-2xl border-2 border-dashed px-6 py-12 text-center transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-60 ${
            dragging
              ? "border-primary bg-primary-soft"
              : "border-border bg-secondary/30 hover:bg-secondary/60"
          }`}
        >
          {upload.isPending ? (
            <>
              <Loader2 className="size-7 animate-spin text-primary" aria-hidden />
              <span className="mt-3 text-[13.5px] font-semibold">Reading your PDF…</span>
            </>
          ) : (
            <>
              <UploadCloud className="size-7 text-primary" aria-hidden />
              <span className="mt-3 text-[13.5px] font-semibold">
                {dragging ? "Drop it here" : "Drop a PDF, or click to choose"}
              </span>
              <span className="mt-1 text-[12px] text-muted-foreground">
                Up to {MAX_MB}MB · text-based PDFs (scans need OCR)
              </span>
            </>
          )}
        </button>
        )}

        <input
          ref={inputRef}
          type="file"
          accept="application/pdf,.pdf"
          className="sr-only"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) send(file);
            // Reset so choosing the same file twice still fires a change event.
            e.target.value = "";
          }}
        />

        {error && (
          <p
            role="alert"
            className="rounded-xl border border-destructive/30 bg-destructive/5 px-3.5 py-2.5 text-[13px] leading-relaxed text-destructive"
          >
            <FileText className="mr-1.5 inline size-4 -translate-y-px" aria-hidden />
            {error}
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}
