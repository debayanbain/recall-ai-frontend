"use client";

import { useCallback, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Images } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * An Instagram carousel, read one slide at a time.
 *
 * This exists because a carousel is the shape where this vault was quietly at its worst.
 * The caption arrives whole and says things like "in this carousel I've shared 80+
 * trusted job platforms"; the platforms themselves are pixels in fourteen pictures. Until
 * the backend kept and read them, the memory was a sentence describing content the vault
 * did not have — and the page showed one still with no way to reach the other thirteen.
 *
 * Six things here are decisions rather than details.
 *
 * **One slide at a time, not a strip.** A carousel's slides are pages of one argument,
 * sized to be read; a row of thumbnails makes every one of them too small to read and
 * turns the primary content into a contact sheet.
 *
 * **It is a real listbox for the keyboard.** Left and Right move slides when the carousel
 * has focus, the buttons are ordinary buttons, and the counter is announced — drag and
 * swipe are conveniences on top, never the only way through (`gesture-alternative`).
 *
 * **The counter is text, not dots alone.** Fourteen dots is a row of identical 6px
 * targets that says "somewhere in the middle"; "3 / 14" says where you are, and the dots
 * stay as the at-a-glance shape and as a way to jump.
 *
 * **Holes are rendered, never skipped.** A `null` slide is one whose mirror failed. Its
 * position still belongs to it, because the caption refers to slides by number — the page
 * says that slide is missing rather than silently renumbering the rest.
 *
 * **Neighbours are preloaded, the rest are lazy.** A signed URL per slide is a real
 * download each; loading fourteen at once to show one is bandwidth spent on pictures
 * nobody has asked for yet, and loading strictly on demand makes every Next a blank wait.
 *
 * **The URLs expire.** They are presigned with `THUMBNAIL_LINK_TTL_SECONDS` (6h), long
 * enough to outlive the page, which is why a slide that fails to load falls back to a
 * stated error rather than a retry loop against a link that is now dead.
 */

export type SlideCarouselProps = {
  /** Signed URLs in slide order; `null` is a slide whose mirror failed. */
  slides: (string | null)[];
  /** Announced as the carousel's name, e.g. the memory's title. */
  label: string;
  className?: string;
};

export function SlideCarousel({ slides, label, className }: SlideCarouselProps) {
  const [wanted, setWanted] = useState(0);
  const [failed, setFailed] = useState<ReadonlySet<number>>(() => new Set());
  const frameRef = useRef<HTMLDivElement>(null);
  const touchStart = useRef<number | null>(null);

  const count = slides.length;
  // Clamped on the way out rather than corrected in an effect. A refetch after a
  // reprocess can shorten the list under a viewer, and a `setState` in an effect to
  // reach a value the render can simply compute is a cascading render for nothing.
  const index = Math.min(wanted, Math.max(count - 1, 0));
  const go = useCallback(
    (next: number) => setWanted(Math.min(Math.max(next, 0), count - 1)),
    [count],
  );

  // Arrow keys, but only while the carousel itself has focus — a page-level listener
  // would steal Left and Right from every other control on the page.
  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      go(index - 1);
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      go(index + 1);
    } else if (event.key === "Home") {
      event.preventDefault();
      go(0);
    } else if (event.key === "End") {
      event.preventDefault();
      go(count - 1);
    }
  };

  if (count === 0) return null;

  const current = slides[index];
  const isFailed = failed.has(index) || !current;

  return (
    <section
      ref={frameRef}
      tabIndex={0}
      role="group"
      aria-roledescription="carousel"
      aria-label={`${label} — ${count} slides`}
      onKeyDown={onKeyDown}
      onTouchStart={(event) => {
        touchStart.current = event.touches[0]?.clientX ?? null;
      }}
      onTouchEnd={(event) => {
        const from = touchStart.current;
        touchStart.current = null;
        const to = event.changedTouches[0]?.clientX;
        if (from == null || to == null) return;
        // A threshold, so a tap that drifts a few pixels is not a swipe.
        if (Math.abs(to - from) < 40) return;
        go(to < from ? index + 1 : index - 1);
      }}
      className={`group relative overflow-hidden rounded-[24px] border border-border bg-secondary/40 outline-none focus-visible:ring-2 focus-visible:ring-primary/50 sm:rounded-[28px] ${className ?? ""}`}
    >
      <div className="relative flex aspect-square w-full items-center justify-center bg-background/40">
        {isFailed ? (
          <p className="px-6 text-center text-[12.5px] leading-relaxed text-muted-foreground">
            Slide {index + 1} couldn&rsquo;t be loaded.
          </p>
        ) : (
          /* eslint-disable-next-line @next/next/no-img-element -- a signed, expiring URL
             on a host that varies, so there is nothing for next/image to cache or to
             configure a remote pattern against. Same reasoning as the banner. */
          <img
            key={current}
            src={current ?? ""}
            alt={`${label}, slide ${index + 1} of ${count}`}
            // The neighbours are worth having ready; everything else waits.
            loading={index === 0 ? "eager" : "lazy"}
            decoding="async"
            referrerPolicy="no-referrer"
            onError={() => setFailed((previous) => new Set(previous).add(index))}
            className="size-full object-contain"
          />
        )}

        {/* Preload the neighbours without showing them: one Next should not be a wait. */}
        {[index - 1, index + 1].map((neighbour) => {
          const url = slides[neighbour];
          if (!url || neighbour === index) return null;
          return (
            /* eslint-disable-next-line @next/next/no-img-element -- see above */
            <img key={`pre-${neighbour}`} src={url} alt="" aria-hidden className="hidden" />
          );
        })}
      </div>

      <div className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-background/85 px-2.5 py-1 text-[11.5px] font-medium tabular-nums text-foreground shadow-sm backdrop-blur">
        <Images className="size-3.5 shrink-0 text-primary" aria-hidden />
        {/* Text, not dots alone: fourteen identical dots say "somewhere in the middle". */}
        <span aria-live="polite">
          {index + 1} / {count}
        </span>
      </div>

      <Button
        variant="ghost"
        size="icon"
        aria-label="Previous slide"
        disabled={index === 0}
        onClick={() => go(index - 1)}
        className="absolute left-2 top-1/2 size-11 -translate-y-1/2 rounded-full bg-background/85 text-foreground shadow-sm backdrop-blur transition-opacity hover:bg-background disabled:opacity-0"
      >
        <ChevronLeft className="size-5" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        aria-label="Next slide"
        disabled={index === count - 1}
        onClick={() => go(index + 1)}
        className="absolute right-2 top-1/2 size-11 -translate-y-1/2 rounded-full bg-background/85 text-foreground shadow-sm backdrop-blur transition-opacity hover:bg-background disabled:opacity-0"
      >
        <ChevronRight className="size-5" />
      </Button>

      {/* Jump targets. Capped, because sixty dots is not navigation. */}
      {count <= 20 && (
        <div className="absolute inset-x-0 bottom-3 flex justify-center gap-1.5">
          {slides.map((_, dot) => (
            <button
              key={dot}
              type="button"
              aria-label={`Go to slide ${dot + 1}`}
              aria-current={dot === index}
              onClick={() => go(dot)}
              // A 6px dot inside a 24px target: visible rhythm, tappable area.
              className="grid size-6 place-items-center rounded-full"
            >
              <span
                className={`block size-1.5 rounded-full transition-colors ${
                  dot === index ? "bg-primary" : "bg-foreground/25"
                }`}
              />
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
