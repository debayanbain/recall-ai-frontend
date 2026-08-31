"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * The coloured banner at the top of a memory card and of the memory page.
 *
 * When the source gave us a still — a Facebook reel's `og:image`, an Instagram post's
 * `displayUrl` — that image is the banner, and the memory's accent gradient sits over it
 * as a wash that fades out downward: solid at the top, where the type badge and the
 * hover actions have to stay legible, gone by the bottom, where the picture is doing the
 * work. Without a still the accent fills the block as before, so nothing regresses for a
 * note or a PDF.
 *
 * Two things about these URLs are worth knowing before touching this:
 *
 * * **They expire.** A `scontent.*.fbcdn.net` link is signed and stops resolving after a
 *   while, and the host varies per CDN node. So the image is a plain `<img>` rather than
 *   `next/image` (which would need a wildcard remote pattern and would cache a URL that
 *   is already dying), and a load failure falls back to the plain accent instead of
 *   leaving a broken frame.
 * * **They are third-party and scraped.** `referrerPolicy="no-referrer"` keeps the
 *   memory's own URL out of the request — Meta's CDN also tends to refuse a cross-site
 *   referrer — and only `http(s)` is ever put in `src`, so a `javascript:` or `data:`
 *   value picked up from a page's meta tags cannot become anything the browser acts on.
 */

/** The accent wash: opaque at the top, fully transparent well before the bottom edge. */
const FADE =
  "linear-gradient(to bottom, #000 0%, #000 18%, rgba(0,0,0,0.62) 52%, rgba(0,0,0,0.22) 74%, transparent 92%)";

const DEFAULT_ACCENT = "from-violet-100 to-indigo-50";

/** Only plain web images. Anything else is treated as "no cover". */
function imageSrc(cover: string | null | undefined): string | null {
  if (!cover) return null;
  try {
    const parsed = new URL(cover);
    return parsed.protocol === "http:" || parsed.protocol === "https:" ? parsed.href : null;
  } catch {
    return null;
  }
}

export function MemoryBanner({
  cover,
  accent = DEFAULT_ACCENT,
  alt = "",
  className = "",
  onImageError,
  children,
}: {
  cover?: string | null;
  accent?: string;
  /** The memory's title. Empty marks the banner decorative, which it is without a still. */
  alt?: string;
  className?: string;
  /**
   * Told that this particular `cover` did not paint. For a stored upload that is usually
   * an expired mint rather than a missing file, and the caller is the only one that can
   * ask for a new one — the banner has no idea where the URL came from.
   */
  onImageError?: () => void;
  children?: ReactNode;
}) {
  // The URL that failed, not a boolean. A stored upload's link is presigned and expires,
  // so a failure here is routinely followed by a fresh mint of the very same picture --
  // and a boolean latch would mean the replacement never got drawn. Keyed this way the
  // recovery is just a new `src`, with nothing to reset.
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const src = imageSrc(cover);
  const showImage = src !== null && src !== failedSrc;

  // `onError` alone is not enough. The markup is server-rendered, so the browser starts
  // fetching the image before React hydrates, and a failure that lands in that window is
  // never replayed onto the handler -- leaving a permanently blank frame where the accent
  // should be. A finished image with no intrinsic width is one that failed, so the state
  // is reconciled once on mount rather than waiting for an event that already happened.
  useEffect(() => {
    const image = imageRef.current;
    if (image?.complete && image.naturalWidth === 0) setFailedSrc(src);
  }, [src]);

  return (
    <div className={`relative overflow-hidden bg-linear-to-br ${accent} ${className}`}>
      {showImage ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element -- next/image cannot
              help here: the CDN host varies per node and the URL is signed and expiring,
              so there is nothing stable to configure a remote pattern for or to cache. */}
          <img
            ref={imageRef}
            src={src}
            alt={alt}
            loading="lazy"
            decoding="async"
            referrerPolicy="no-referrer"
            onError={() => {
              setFailedSrc(src);
              onImageError?.();
            }}
            className="absolute inset-0 size-full object-cover"
          />
          {/* The accent, masked so it thins out as it descends. `mask-image` rather than a
              second gradient: this way the wash is the memory's own accent colour instead
              of a hardcoded one, and it keeps working when the palette changes. */}
          <div
            aria-hidden
            className={`absolute inset-0 bg-linear-to-br ${accent}`}
            style={{ maskImage: FADE, WebkitMaskImage: FADE }}
          />
        </>
      ) : (
        <div aria-hidden className="absolute inset-0 grid-dots opacity-60" />
      )}
      {children}
    </div>
  );
}
