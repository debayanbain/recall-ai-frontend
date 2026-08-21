"use client";

import { useSyncExternalStore } from "react";
import { memories as seedMemories, type Memory, type MemoryKind } from "@/lib/mock-data";

const STORAGE_KEY = "recallai:v1";

export type StoreState = {
  memories: Memory[];
  favorites: string[];
  /** false until localStorage has been read, so the UI can avoid claiming "empty". */
  hydrated: boolean;
};

const initialState: StoreState = {
  memories: seedMemories,
  favorites: [],
  hydrated: false,
};

// Module-level store. useSyncExternalStore keeps React in sync without the
// setState-inside-effect pattern, so the server and first client render match.
let state: StoreState = initialState;
const listeners = new Set<() => void>();
let loaded = false;

function persist() {
  try {
    const custom = state.memories.filter((m) => !seedMemories.some((s) => s.id === m.id));
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ custom, favorites: state.favorites }),
    );
  } catch {
    // Private mode / blocked storage — the app still works, it just won't persist.
  }
}

function setState(next: Partial<StoreState>, { save = true } = {}) {
  state = { ...state, ...next };
  if (save) persist();
  listeners.forEach((listener) => listener());
}

function load() {
  if (loaded) return;
  loaded = true;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as { custom?: Memory[]; favorites?: string[] }) : null;
    setState(
      {
        memories: [...(parsed?.custom ?? []), ...seedMemories],
        favorites: parsed?.favorites ?? [],
        hydrated: true,
      },
      { save: false },
    );
  } catch {
    setState({ hydrated: true }, { save: false });
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  // Read storage on the first subscription, i.e. after hydration.
  load();
  return () => {
    listeners.delete(listener);
  };
}

const getSnapshot = () => state;
const getServerSnapshot = () => initialState;

export function useStore(): StoreState {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

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

function uniqueId(base: string) {
  let id = base;
  let n = 2;
  while (state.memories.some((m) => m.id === id)) {
    id = `${base}-${n++}`;
  }
  return id;
}

export function addMemory(draft: MemoryDraft): Memory {
  const id = uniqueId(slugify(draft.title));
  const index = state.memories.length;
  const memory: Memory = {
    id,
    kind: draft.kind,
    title: draft.title,
    summary:
      draft.summary?.trim() ||
      "Captured just now. RecallAI will summarize, tag and connect this in the background.",
    source: draft.source ?? "Quick capture",
    tags: draft.tags?.length ? draft.tags : ["inbox"],
    savedAt: "Just now",
    savedDays: 0,
    accent: accents[index % accents.length],
    height: heights[index % heights.length],
    space: draft.space ?? "Building RecallAI",
  };
  setState({ memories: [memory, ...state.memories] });
  return memory;
}

export function toggleFavorite(id: string) {
  const favorites = state.favorites.includes(id)
    ? state.favorites.filter((f) => f !== id)
    : [...state.favorites, id];
  setState({ favorites });
  return favorites.includes(id);
}

export function removeMemory(id: string) {
  setState({
    memories: state.memories.filter((m) => m.id !== id),
    favorites: state.favorites.filter((f) => f !== id),
  });
}
