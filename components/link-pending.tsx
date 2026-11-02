"use client";

import { useLinkStatus } from "next/link";
import { Loader2 } from "lucide-react";

/**
 * "Your click landed", drawn inside a card's `<Link>`.
 *
 * A navigation is a transition: React keeps the old page on screen, untouched, until the
 * next one can be shown. On a route that has not been prefetched yet that wait has nothing
 * in it at all -- no cursor, no URL change -- and it reads as a page that froze rather than
 * one that is working. `loading.tsx` only helps once its own payload has arrived, so this
 * is what covers the gap before it.
 *
 * Must be rendered as a descendant of the `<Link>`, which is the only place the hook
 * answers. Always mounted and only ever faded, so it can never shift the card, and the
 * `delay-100` means a fast navigation finishes before anything has become visible.
 * `aria-hidden` because the destination's loading state is what announces itself.
 */
export function LinkPending() {
  const { pending } = useLinkStatus();

  return (
    <span
      aria-hidden
      data-link-pending={pending}
      className={`pointer-events-none absolute inset-0 z-10 grid place-items-center rounded-[inherit] bg-background/60 transition-opacity duration-150 ${
        pending ? "opacity-100 delay-100" : "opacity-0"
      }`}
    >
      <span className="grid size-9 place-items-center rounded-full bg-card text-primary shadow-sm">
        <Loader2
          className={`size-4.5 ${pending ? "animate-spin motion-reduce:animate-none" : ""}`}
        />
      </span>
    </span>
  );
}
