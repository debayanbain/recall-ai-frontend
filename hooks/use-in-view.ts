"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * True once the element has been within `rootMargin` of the viewport, and true forever
 * after.
 *
 * It latches on purpose. The one caller mints a short-lived download URL when a card
 * comes into view, and a flag that flipped back on scroll-away would re-mint the same
 * credential every time the user scrolled past — a masonry vault of sixty cards would
 * spend a request per card per pass.
 *
 * The handle is a **callback ref** rather than a `RefObject`, so the same hook can watch a
 * `<div>`, a `<Card>` or an `<article>` without the caller having to name the element type
 * and without an object ref's invariance turning that into a cast.
 *
 * `IntersectionObserver` is missing in jsdom and during a server render, so the fallback is
 * "visible": showing a preview a fraction early costs one request, and hiding it forever
 * is a blank card.
 */
export function useInViewOnce(rootMargin = "300px") {
  const [node, setNode] = useState<Element | null>(null);
  // Settled at initialisation, not inside the effect: a browser without
  // `IntersectionObserver` (and jsdom) must treat everything as visible, and doing that
  // here keeps it out of the render-effect-render cycle. The server branch stays `false`
  // so the initial markup matches what the client hydrates.
  const [seen, setSeen] = useState(
    () => typeof window !== "undefined" && typeof IntersectionObserver === "undefined",
  );

  const ref = useCallback((element: Element | null) => setNode(element), []);

  useEffect(() => {
    if (seen || !node || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setSeen(true);
          observer.disconnect();
        }
      },
      { rootMargin },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [node, seen, rootMargin]);

  return { ref, seen };
}
