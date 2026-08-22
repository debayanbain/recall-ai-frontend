"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export type VaultView = "grid" | "list";

type UIState = {
  /** Persisted view preferences. */
  vaultView: VaultView;
  sidebarCollapsed: boolean;
  /** Ephemeral overlay state — deliberately not persisted. */
  commandPaletteOpen: boolean;
  captureOpen: boolean;
};

type UIActions = {
  setVaultView: (view: VaultView) => void;
  toggleSidebar: () => void;
  setCommandPaletteOpen: (open: boolean) => void;
  setCaptureOpen: (open: boolean) => void;
};

export const useUIStore = create<UIState & UIActions>()(
  persist(
    (set) => ({
      vaultView: "grid",
      sidebarCollapsed: false,
      commandPaletteOpen: false,
      captureOpen: false,

      setVaultView: (vaultView) => set({ vaultView }),
      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      setCommandPaletteOpen: (commandPaletteOpen) => set({ commandPaletteOpen }),
      setCaptureOpen: (captureOpen) => set({ captureOpen }),
    }),
    {
      name: "recallai:ui",
      storage: createJSONStorage(() => localStorage),
      // See hooks/use-hydrate-stores: read persisted prefs after React hydrates, not
      // during module init, so the first client render matches the server HTML.
      skipHydration: true,
      // Reopening a modal on page load because it was open last week is a bug, not a
      // feature — only the durable preferences survive a reload.
      partialize: (state) => ({
        vaultView: state.vaultView,
        sidebarCollapsed: state.sidebarCollapsed,
      }),
    },
  ),
);
