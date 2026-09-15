import type { UploadLimits } from "@/hooks/use-vault";

/**
 * What a file has to satisfy before it is worth a round trip, and how a pasted one is
 * turned into a file at all.
 *
 * Both checks here are conveniences — the server re-decides the type from the file's
 * *bytes* and re-enforces the size cap by reading one byte past it — but a 25MB round
 * trip is a slow way to learn a file was too big or the wrong kind.
 */

export const FALLBACK_MAX_BYTES = 25 * 1024 * 1024;

/**
 * A clipboard image has no filename: the OS hands over bytes and a MIME type, and the
 * browser invents `image.png` or nothing at all. `documents.inspect` reads the extension
 * from the filename only, so an un-synthesized name is a guaranteed rejection — the same
 * trap the Telegram photo path already pays for.
 *
 * The map is closed and the name is written here rather than copied from the clipboard,
 * for two reasons: an extension derived from an arbitrary MIME subtype is a string the
 * sender chose, and a filename is the one part of an upload that people try to put a
 * path in. The bucket key is server-generated regardless, so this is depth, not the
 * only wall.
 */
const EXTENSION_BY_MIME: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/gif": "gif",
  "image/webp": "webp",
  "image/heic": "heic",
  "image/heif": "heic",
  "application/pdf": "pdf",
  "text/plain": "txt",
  "text/csv": "csv",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
};

/** SVG is refused here as well as server-side: it is the one image a browser executes. */
const PASTE_DENIED = new Set(["image/svg+xml", "text/html"]);

export type ClipboardCapture =
  | { file: File; error?: undefined }
  | { file?: undefined; error: string };

/**
 * The file a paste carries, or `null` when it carries none — which is the ordinary case
 * and must leave the paste alone so text still lands in the field the caret is in.
 */
export function fileFromClipboard(data: DataTransfer | null): ClipboardCapture | null {
  if (!data) return null;
  const candidate = Array.from(data.files).find((entry) => entry.size > 0);
  if (!candidate) return null;

  const mime = candidate.type.split(";")[0].trim().toLowerCase();
  if (PASTE_DENIED.has(mime)) {
    return { error: "That kind of image can't be saved. Try a PNG or a JPEG." };
  }
  const ext = EXTENSION_BY_MIME[mime];
  if (!ext) {
    return {
      error: "Recall couldn't tell what that was. Choose the file instead and it will read it.",
    };
  }

  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
  return {
    file: new File([candidate], `pasted-${stamp}.${ext}`, {
      type: mime,
      lastModified: candidate.lastModified || Date.now(),
    }),
  };
}

/** The sentence to show instead of accepting this file, or null when it is fine. */
export function rejectionFor(file: File, limits: UploadLimits | undefined): string | null {
  const maxBytes = limits?.max_bytes ?? FALLBACK_MAX_BYTES;
  const extensions = limits?.extensions ?? [];
  const ext = file.name.includes(".") ? file.name.split(".").pop()!.toLowerCase() : "";

  if (extensions.length > 0 && !extensions.includes(ext)) {
    return `That file type isn't supported. Allowed: ${extensions.join(", ")}.`;
  }
  if (file.size > maxBytes) {
    return `That file is ${Math.round(file.size / 1_048_576)}MB — the limit is ${Math.floor(
      maxBytes / 1_048_576,
    )}MB.`;
  }
  return null;
}

/** Previewable in an `<img>` without handing the page anything that can run. */
export function isPreviewableImage(file: File): boolean {
  return file.type.startsWith("image/") && !PASTE_DENIED.has(file.type.toLowerCase());
}

export function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1_048_576) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1_048_576).toFixed(1)} MB`;
}
