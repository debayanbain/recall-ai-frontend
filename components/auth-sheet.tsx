"use client";

import { useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode, type WheelEvent as ReactWheelEvent } from "react";
import { animate, motion, useMotionValue, useReducedMotion } from "motion/react";
import { useIsCompactNav } from "@/hooks/use-mobile";
import { transition } from "@/lib/motion";

/** How far the sheet travels, as a fraction of its own height. */
const TRAVEL_RATIO = 0.5;
/** Past this fraction of the travel, the release snaps to the far end. */
const SNAP_THRESHOLD = 0.4;
/** Movement under this many pixels counts as a tap, not a drag. */
const TAP_SLOP = 6;

/**
 * Phone-only bottom sheet for the auth panel: the page behind never scrolls, the
 * sheet itself slides between a peek and a full view, and its content scrolls only
 * once it is open. On `lg` and up it is a plain column again.
 */
export function AuthSheet({ children, footer }: { children: ReactNode; footer?: ReactNode }) {
  const compact = useIsCompactNav();
  const reduced = useReducedMotion();
  const y = useMotionValue(0);
  const sheetRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [expanded, setExpanded] = useState(false);
  /** A drag that ends over the handle would otherwise fire its click too. */
  const draggedAt = useRef(0);

  const travel = () => (sheetRef.current?.offsetHeight ?? 0) * TRAVEL_RATIO;

  const snapTo = (next: boolean) => {
    setExpanded(next);
    animate(y, next ? -travel() : 0, reduced ? { duration: 0 } : transition.spring);
  };

  // A drag starting inside already-scrolled content belongs to that scroll, not
  // to the sheet — otherwise the two fight each other.
  const dragBelongsToSheet = (target: EventTarget | null) => {
    if (!expanded) return true;
    const content = contentRef.current;
    if (!content || !(target instanceof Node)) return true;
    return !content.contains(target) || content.scrollTop <= 0;
  };

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!compact || !dragBelongsToSheet(event.target)) return;
    const startY = event.clientY;
    const base = y.get();
    let captured = false;

    // Tracked on the document rather than through pointer capture: capture
    // retargets the following click and would break the handle button.
    const onMove = (move: PointerEvent) => {
      if (move.pointerId !== event.pointerId) return;
      const delta = move.clientY - startY;
      if (!captured) {
        if (Math.abs(delta) < TAP_SLOP) return;
        captured = true;
      }
      move.preventDefault();
      const limit = travel();
      y.set(Math.min(0, Math.max(-limit, base + delta)));
    };

    const onUp = (up: PointerEvent) => {
      if (up.pointerId !== event.pointerId) return;
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerup", onUp);
      document.removeEventListener("pointercancel", onUp);
      // A tap is not a drag: leave it to the button's own click handler.
      if (!captured) return;
      draggedAt.current = performance.now();
      const limit = travel();
      const moved = -y.get();
      snapTo(expanded ? moved > limit * (1 - SNAP_THRESHOLD) : moved > limit * SNAP_THRESHOLD);
    };

    document.addEventListener("pointermove", onMove, { passive: false });
    document.addEventListener("pointerup", onUp);
    document.addEventListener("pointercancel", onUp);
  };

  // Wheel and trackpad get the same behaviour as a drag: the gesture moves the
  // sheet until it is open, then scrolls the content inside it.
  const onWheel = (event: ReactWheelEvent<HTMLDivElement>) => {
    if (!compact) return;
    const content = contentRef.current;
    if (event.deltaY > 0 && !expanded) snapTo(true);
    else if (event.deltaY < 0 && expanded && (!content || content.scrollTop <= 0)) snapTo(false);
  };

  if (!compact) {
    return (
      <main className="flex flex-col items-center justify-center gap-8 px-4 py-12 sm:px-8">
        {children}
        {footer}
      </main>
    );
  }

  return (
    <motion.div
      ref={sheetRef}
      style={{ y, touchAction: expanded ? "pan-y" : "none" }}
      className="fixed inset-x-0 top-[54dvh] z-20 flex h-[92dvh] flex-col rounded-t-[28px] border-t border-border/70 bg-card shadow-[0_-20px_50px_-28px_oklch(0.18_0.03_280/0.35)]"
      onPointerDown={onPointerDown}
      onWheel={onWheel}
    >
      {/* Also a button, so the sheet opens without a drag gesture. */}
      <button
        type="button"
        aria-expanded={expanded}
        aria-label={expanded ? "Collapse sign-in panel" : "Expand sign-in panel"}
        onClick={() => {
          if (performance.now() - draggedAt.current < 300) return;
          snapTo(!expanded);
        }}
        className="mx-auto flex h-9 w-full shrink-0 items-center justify-center rounded-t-[28px] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        <span aria-hidden className="h-1.5 w-11 rounded-full bg-border" />
      </button>

      <div
        ref={contentRef}
        className={`flex flex-1 flex-col px-5 pb-[calc(env(safe-area-inset-bottom)+2rem)] pt-3 sm:px-8 ${
          expanded ? "overflow-y-auto overscroll-contain" : "overflow-hidden"
        }`}
      >
        {children}
        {footer}
      </div>
    </motion.div>
  );
}
