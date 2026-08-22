"use client";

import { useEffect } from "react";
import { useMemoryStore } from "@/lib/store";
import { useUIStore } from "@/lib/stores/ui-store";

/**
 * Reads persisted zustand state after React has hydrated.
 *
 * Both stores set `skipHydration`, so they render with server-identical defaults and
 * only pick up localStorage here. Running it any earlier reintroduces the hydration
 * mismatch it exists to avoid.
 */
export function useHydrateStores() {
  useEffect(() => {
    void useMemoryStore.persist.rehydrate();
    void useUIStore.persist.rehydrate();
  }, []);
}
