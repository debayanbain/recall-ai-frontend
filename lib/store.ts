"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { useShallow } from "zustand/shallow";
import { memories as seedMemories, type Memory, type MemoryKind } from "@/lib/mock-data";

const STORAGE_KEY = "recallai:v1";

export type StoreState = {
  memories: Memory[];
  favorites: string[];
  /** false until localStorage has been read, so the UI can avoid claiming "empty". */
  hydrated: boolean;
};

type StoreActions = {
  addMemory: (draft: MemoryDraft) => Memory;
  toggleFavorite: (id: string) => boolean;
  removeMemory: (id: string) => void;
  setHydrated: () => void;
};

export type MemoryDraft = {
  title: string;
  kind: MemoryKind;
  summary?: string;
  source?: string;
  tags?: string[];
  space?: string;
};

const accents = [
  "from-violet-100 to-indigo-50",
  "from-rose-100 to-orange-50",
  "from-emerald-100 to-teal-50",
  "from-amber-100 to-yellow-50",
  "from-sky-100 to-cyan-50",
  "from-fuchsia-100 to-pink-50",
];

const heights: Memory["height"][] = ["sm", "md", "lg"];

function slugify(value: string) {
  const base = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
  return base || "memory";
}

function uniqueId(base: string, existing: Memory[]) {
  let id = base;
  let n = 2;
  while (existing.some((m) => m.id === id)) {
    id = `${base}-${n++}`;
  }
  return id;
}

const isSeed = (memory: Memory) => seedMemories.some((s) => s.id === memory.id);

/**
 * localStorage wrapper that also understands the pre-zustand payload.
 *
 * The old store wrote `{ custom, favorites }` under the same key. Zustand expects
 * `{ state, version }`, so without this shim every existing user would silently lose
 * their saved memories and favourites on first load after the upgrade. Writes always
 * use the new shape, so the translation runs at most once per browser.
 */
const legacyAwareStorage: Storage = {
  get length() {
    return localStorage.length;
  },
  key: (index) => localStorage.key(index),
  clear: () => localStorage.clear(),
  removeItem: (key) => localStorage.removeItem(key),
  setItem: (key, value) => localStorage.setItem(key, value),
  getItem: (key) => {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object" && !("state" in parsed)) {
        return JSON.stringify({
          state: {
            memories: Array.isArray(parsed.custom) ? parsed.custom : [],
            favorites: Array.isArray(parsed.favorites) ? parsed.favorites : [],
          },
          version: 1,
        });
      }
    } catch {
      // Corrupt entry — treat it as absent rather than crashing the store.
      return null;
    }
    return raw;
  },
};

export const useMemoryStore = create<StoreState & StoreActions>()(
  persist(
    (set, get) => ({
      memories: seedMemories,
      favorites: [],
      hydrated: false,

      setHydrated: () => set({ hydrated: true }),

      addMemory: (draft) => {
        const current = get().memories;
        const memory: Memory = {
          id: uniqueId(slugify(draft.title), current),
          kind: draft.kind,
          title: draft.title,
          summary:
            draft.summary?.trim() ||
            "Captured just now. RecallAI will summarize, tag and connect this in the background.",
          source: draft.source ?? "Quick capture",
          tags: draft.tags?.length ? draft.tags : ["inbox"],
          savedAt: "Just now",
          savedDays: 0,
          accent: accents[current.length % accents.length],
          height: heights[current.length % heights.length],
          space: draft.space ?? "Building RecallAI",
        };
        set({ memories: [memory, ...current] });
        return memory;
      },

      toggleFavorite: (id) => {
        const favorites = get().favorites.includes(id)
          ? get().favorites.filter((f) => f !== id)
          : [...get().favorites, id];
        set({ favorites });
        return favorites.includes(id);
      },

      removeMemory: (id) =>
        set((state) => ({
          memories: state.memories.filter((m) => m.id !== id),
          favorites: state.favorites.filter((f) => f !== id),
        })),
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => legacyAwareStorage),
      version: 1,
      // Rehydrating during module init would make the first client render disagree with
      // the server HTML (React bails on the whole tree when that happens). Instead the
      // store boots with the same defaults the server used and `useHydrateStores`
      // rehydrates in an effect, after hydration is done.
      skipHydration: true,
      // Only user-created memories are written back; the seed set ships with the bundle
      // and would otherwise be duplicated into storage on every save.
      partialize: (state) => ({
        memories: state.memories.filter((m) => !isSeed(m)),
        favorites: state.favorites,
      }),
      merge: (persisted, current) => {
        const saved = persisted as Partial<StoreState> | undefined;
        return {
          ...current,
          memories: [...(saved?.memories ?? []), ...seedMemories],
          favorites: saved?.favorites ?? [],
        };
      },
      // Runs after rehydration succeeds *or* fails (private mode, blocked storage). Either
      // way the UI must stop showing a loading state.
      onRehydrateStorage: () => (state) => state?.setHydrated(),
    },
  ),
);

/**
 * Back-compatible read hook: same shape the pre-zustand store exposed, so existing
 * callers keep working. `useShallow` keeps a component from re-rendering when an
 * unrelated slice changes.
 */
export function useStore(): StoreState {
  return useMemoryStore(
    useShallow((s) => ({ memories: s.memories, favorites: s.favorites, hydrated: s.hydrated })),
  );
}

// Imperative helpers, callable from event handlers outside React.
export const addMemory = (draft: MemoryDraft) => useMemoryStore.getState().addMemory(draft);
export const toggleFavorite = (id: string) => useMemoryStore.getState().toggleFavorite(id);
export const removeMemory = (id: string) => useMemoryStore.getState().removeMemory(id);
