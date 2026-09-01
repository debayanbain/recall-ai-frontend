"use client";

import { useEffect, useRef } from "react";
import { FolderPlus, X } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Button } from "@/components/ui/button";
import { useAddToSpaceSheet } from "@/components/add-to-space";
import { useSelection, useSelectionStore } from "@/lib/stores/selection-store";
import { transition } from "@/lib/motion";

/**
 * The bar that appears while memories are being picked.
 *
 * **On a phone it replaces the bottom navigation rather than stacking above it.** Two
 * fixed bars plus the raised capture button, on a 375px screen, leaves the list about
 * four fingers tall — and mid-selection the nav is not what anyone is reaching for. So
 * `AppShell` hides `BottomNav` while this is up, and this sits in exactly its place, with
 * the same safe-area padding, so the layout does not shift as it swaps in.
 *
 * Escape exits. That is the one gesture people try when a mode appears and they want out,
 * and without it the only way back is finding the small × in the corner.
 */

const plain = "rounded-xl tracking-normal normal-case";

export function SelectionBar() {
  const { active, ids } = useSelection();
  const exit = useSelectionStore((s) => s.exit);
  const sheet = useAddToSpaceSheet();
  const reduced = useReducedMotion();
  const barRef = useRef<HTMLDivElement | null>(null);
  const wasActive = useRef(false);

  useEffect(() => {
    if (!active) {
      wasActive.current = false;
      return;
    }
    // Focus moves to the bar the first time it appears, so a keyboard or screen-reader
    // user is put where the new controls are instead of being told nothing happened.
    // Only on the transition into selection: re-focusing on every pick would fight the
    // user's own place in the grid.
    if (!wasActive.current) {
      wasActive.current = true;
      barRef.current?.focus();
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") exit();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [active, exit]);

  return (
    <AnimatePresence>
      {active && (
        <motion.div
          ref={barRef}
          tabIndex={-1}
          role="region"
          aria-label="Selected memories"
          initial={reduced ? false : { y: 24, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={reduced ? { opacity: 0 } : { y: 24, opacity: 0 }}
          transition={reduced ? { duration: 0 } : transition.soft}
          className="fixed right-0 bottom-0 left-(--sidebar-width-icon) z-40 border-t border-l border-border bg-card/95 px-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] pt-3 backdrop-blur outline-none lg:left-auto lg:right-6 lg:bottom-6 lg:rounded-2xl lg:border lg:px-3 lg:pb-3 lg:shadow-[0_18px_40px_-16px_oklch(0.55_0.19_285/0.45)]"
        >
          <div className="mx-auto flex max-w-3xl items-center gap-2">
            <p aria-live="polite" className="min-w-0 flex-1 px-1 text-[13px] font-medium">
              {ids.length} selected
            </p>
            <Button
              onClick={() => sheet.open(ids)}
              disabled={ids.length === 0}
              className={`${plain} h-11 shrink-0 gap-2 gradient-primary px-3.5 text-[13px] font-semibold text-white hover:bg-transparent`}
            >
              <FolderPlus className="size-4" /> Add to space
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={exit}
              aria-label="Cancel selection"
              className={`${plain} size-11 shrink-0 rounded-full text-muted-foreground`}
            >
              <X className="size-4" />
            </Button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
