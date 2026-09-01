"use client";

import { create } from "zustand";
import { useShallow } from "zustand/shallow";

/**
 * Which memories are picked, while the user is picking them.
 *
 * **Not persisted, and that is deliberate.** A selection restored from localStorage a day
 * later is the exact failure `lib/stores/ui-store.ts` calls out for modals: state that
 * only makes sense inside one interaction, coming back long after the interaction ended.
 * The user would open the vault to a bulk action bar naming five memories they do not
 * remember choosing — and the first thing they would do is act on it.
 *
 * Ids are an array rather than a `Set` so the value is structurally comparable, which is
 * what lets `useShallow` keep an unrelated card from re-rendering the whole grid.
 */

type SelectionState = {
  /** True while the grid is in picking mode: cards toggle instead of navigating. */
  active: boolean;
  ids: string[];
};

type SelectionActions = {
  enter: (seed?: string) => void;
  exit: () => void;
  toggle: (id: string) => void;
  clear: () => void;
  selectAll: (ids: string[]) => void;
};

export const useSelectionStore = create<SelectionState & SelectionActions>()((set) => ({
  active: false,
  ids: [],

  // Entering with a seed is the "long-press this one card" path: picking mode and the
  // first pick are one gesture, so the bar appears already saying "1 selected".
  enter: (seed) => set({ active: true, ids: seed ? [seed] : [] }),

  // Leaving always drops the picks. Keeping them would mean a hidden selection that acts
  // on the next thing the user does.
  exit: () => set({ active: false, ids: [] }),

  toggle: (id) =>
    set((s) => ({
      active: true,
      ids: s.ids.includes(id) ? s.ids.filter((x) => x !== id) : [...s.ids, id],
    })),

  clear: () => set({ ids: [] }),

  selectAll: (ids) => set({ active: true, ids: [...new Set(ids)] }),
}));

/** Read hook for a card: only re-renders when *this* card's selected-ness changes. */
export function useIsSelected(id: string): boolean {
  return useSelectionStore((s) => s.ids.includes(id));
}

export function useSelection() {
  return useSelectionStore(useShallow((s) => ({ active: s.active, ids: s.ids })));
}

// Imperative helpers, callable from event handlers outside React — the same shape
// `lib/store.ts` exposes for favourites.
export const enterSelection = (seed?: string) => useSelectionStore.getState().enter(seed);
export const exitSelection = () => useSelectionStore.getState().exit();
export const toggleSelection = (id: string) => useSelectionStore.getState().toggle(id);
