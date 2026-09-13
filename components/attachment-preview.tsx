"use client";

import { useCallback, useRef } from "react";
import { FileText, FileSpreadsheet, FileType2, Mic, Image as ImageIcon } from "lucide-react";
import type { ReactNode } from "react";
import { useInViewOnce } from "@/hooks/use-in-view";
import { useStoredFileUrl } from "@/hooks/use-vault";
import type { Memory } from "@/lib/mock-data";

/**
 * What a card shows for something the user uploaded.
 *
 * A link brings its own still — a reel's `og:image`, a post's `displayUrl` — and
 * `MemoryBanner` lays the memory's accent over it as a wash. An upload has no such URL,
 * so every PDF, spreadsheet and photo in the vault rendered as the same coloured block:
 * the one kind of memory whose *content* the user chose personally was the one kind you
 * could not recognise on the shelf.
 *
 * Two answers, because there are two cases:
 *
 * * **A picture is shown.** `useAttachmentCover` mints a download URL for the stored
 *   object and hands it back as a cover, so an uploaded photo goes through exactly the
 *   same banner and the same accent wash a scraped still does. Nothing new to look at,
 *   which is the point.
 * * **Everything else is named.** There is no PDF renderer or Office parser in the
 *   browser here, and inventing a page thumbnail would be a picture of data that does not
 *   exist. So the banner says what the file *is* — its name, its kind, its size — which is
 *   what someone scanning a vault for "that contract" is actually looking for.
 */

/** Formats bytes the way a file manager does. Null size simply drops the segment. */
export function formatBytes(bytes: number | null | undefined): string | null {
  if (typeof bytes !== "number" || !Number.isFinite(bytes) || bytes <= 0) return null;
  const units = ["B", "KB", "MB", "GB"];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value >= 10 || unit === 0 ? Math.round(value) : value.toFixed(1)} ${units[unit]}`;
}

/** The extension as a label, from the stored name. Server-generated keys keep the real one. */
function extensionOf(name: string): string | null {
  const dot = name.lastIndexOf(".");
  if (dot <= 0 || dot === name.length - 1) return null;
  const ext = name.slice(dot + 1);
  return ext.length <= 5 ? ext.toUpperCase() : null;
}

/**
 * Whether the browser can be expected to paint these bytes.
 *
 * Narrower than "the MIME type starts with image/" on purpose. **HEIC** is in the upload
 * allowlist and decodes in Safari alone, so treating it as displayable would show most
 * people a broken frame where the plaque would have told them what they have. **SVG** is
 * refused at upload — it is executable in a browser context — and is listed here so that
 * staying refused does not depend on remembering this file too.
 */
export function isDisplayableImage(file: Memory["file"]): boolean {
  const mime = file?.mime?.toLowerCase();
  if (!mime?.startsWith("image/")) return false;
  return !["image/heic", "image/heif", "image/svg+xml"].includes(mime);
}

/**
 * A cover for an uploaded picture, fetched only once the card is near the viewport.
 *
 * Returns the ref to put on the element being watched. `src` is undefined until there is
 * something real to show, so a caller can pass `cover={memory.cover ?? src}` and keep the
 * scraped still winning wherever there is one.
 */
export function useAttachmentCover(memory: { id: string; file?: Memory["file"] }) {
  const displayable = isDisplayableImage(memory.file);
  const { ref, seen } = useInViewOnce();
  const { data, isError, refetch } = useStoredFileUrl(memory.id, displayable && seen);
  const remintedRef = useRef(false);

  // A minted URL outlives its usefulness in five minutes, so a card left open on a
  // background tab comes back holding a dead link. One silent re-mint covers that; a
  // second failure is a real one -- the object is gone, or these bytes are not an image
  // this browser can decode -- and is left to the banner's own fallback.
  //
  // `displayable` is checked again here, and it is not redundant. The banner reports a
  // failed *scraped* still through this same handler, and a link memory has no stored
  // file to re-mint -- while `refetch` ignores `enabled`, so the guarded query fires
  // anyway. Instagram and Facebook `og:image` URLs are signed and expire in about a
  // week, so once a vault was old enough every link card mounted, failed its cover and
  // spent a request on `GET /vault/{id}/file` to be told 404.
  const onImageError = useCallback(() => {
    if (!displayable || remintedRef.current) return;
    remintedRef.current = true;
    void refetch();
  }, [displayable, refetch]);

  return {
    ref,
    src: displayable ? data?.url : undefined,
    onImageError,
    // "A picture is on its way." The plaque is the fallback for a file that cannot be
    // drawn, so showing it during the mint would flash a filename onto every photo in the
    // vault a moment before the photo replaces it. A mint that actually failed is not
    // resolving any more, and the plaque is then the right answer.
    resolving: displayable && !isError,
  };
}

/**
 * Rendered elements rather than component references, on purpose: a component picked out
 * of a table at render time is a component *created* during render as far as React (and
 * the lint rule that guards this) is concerned, and it would remount on every pass. These
 * are values.
 */
const GLYPHS: { match: (mime: string, name: string) => boolean; node: ReactNode }[] = [
  { match: (mime) => mime.startsWith("audio/"), node: <Mic className="size-4" aria-hidden /> },
  {
    match: (mime) => mime.startsWith("image/"),
    node: <ImageIcon className="size-4" aria-hidden />,
  },
  {
    match: (mime) => mime === "application/pdf",
    node: <FileType2 className="size-4" aria-hidden />,
  },
  {
    match: (mime, name) =>
      mime.includes("spreadsheet") || mime === "text/csv" || /\.(csv|xlsx?|numbers)$/i.test(name),
    node: <FileSpreadsheet className="size-4" aria-hidden />,
  },
];

const DEFAULT_GLYPH = <FileText className="size-4" aria-hidden />;

function glyphFor(file: NonNullable<Memory["file"]>): ReactNode {
  const mime = file.mime?.toLowerCase() ?? "";
  return GLYPHS.find((g) => g.match(mime, file.name))?.node ?? DEFAULT_GLYPH;
}

/**
 * The plaque that stands in for a file the browser cannot draw.
 *
 * Sits on the accent rather than replacing it, so a document card still reads as the same
 * object as every other card in the grid. The white pill is the one the type badge and the
 * source line already use — the banner has exactly one surface treatment, not three.
 */
export function FilePlaque({
  file,
  className = "",
}: {
  file: NonNullable<Memory["file"]>;
  className?: string;
}) {
  const ext = extensionOf(file.name);
  const size = formatBytes(file.size);
  const detail = [ext, size].filter(Boolean).join(" · ");

  return (
    <div className={`pointer-events-none absolute inset-0 grid place-items-center px-5 ${className}`}>
      <div className="flex max-w-full items-center gap-2.5 rounded-2xl border border-white/70 bg-white/85 px-3 py-2.5 shadow-sm backdrop-blur">
        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary">
          {glyphFor(file)}
        </span>
        <span className="min-w-0">
          {/* The name is the whole point of the plaque, so it gets the readable weight and
              the truncation, and the metadata line underneath gets neither. */}
          <span className="block truncate text-[12.5px] font-medium text-foreground/85">
            {file.name}
          </span>
          {detail && (
            <span className="block text-[10.5px] text-muted-foreground">{detail}</span>
          )}
        </span>
      </div>
    </div>
  );
}
