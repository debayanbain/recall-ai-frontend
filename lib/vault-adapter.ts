import type { Memory, MemoryKind } from "@/lib/mock-data";
import type { ContentType, VaultItem } from "@/lib/types";

/**
 * Maps a backend `VaultItem` onto the `Memory` shape the card components already speak.
 *
 * Adapting at the boundary rather than rewriting every card keeps one vocabulary in the
 * UI while the API owns a different one. The two enums genuinely differ — the backend
 * discriminates by *source* (youtube, instagram, tiktok) and the UI by *medium* (video,
 * link) — so the mapping is lossy on purpose.
 */
const KIND_BY_TYPE: Record<ContentType, MemoryKind> = {
  youtube: "video",
  article: "article",
  pdf: "pdf",
  note: "note",
  instagram: "link",
  facebook: "video",
  tiktok: "link",
  linkedin: "link",
  voice: "voice",
  image: "image",
};

const ACCENTS = [
  "from-violet-100 to-indigo-50",
  "from-rose-100 to-orange-50",
  "from-emerald-100 to-teal-50",
  "from-amber-100 to-yellow-50",
  "from-sky-100 to-cyan-50",
  "from-fuchsia-100 to-pink-50",
];

const HEIGHTS: NonNullable<Memory["height"]>[] = ["sm", "md", "lg"];

/**
 * Stable pseudo-random index from the item id.
 *
 * The masonry grid wants varied block heights, but `Math.random()` would reshuffle the
 * layout on every refetch and break SSR hydration. Hashing the id gives variety that is
 * identical on server and client and stable across renders.
 */
function hash(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function hostOf(url: string | null): string {
  if (!url) return "Saved to Recall";
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "Saved to Recall";
  }
}

function relativeDay(iso: string): { label: string; days: number } {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return { label: "Recently", days: 0 };
  const days = Math.max(0, Math.floor((Date.now() - then) / 86_400_000));
  if (days === 0) return { label: "Today", days };
  if (days === 1) return { label: "Yesterday", days };
  if (days < 7) return { label: `${days} days ago`, days };
  if (days < 30) return { label: `${Math.floor(days / 7)}w ago`, days };
  return { label: `${Math.floor(days / 30)}mo ago`, days };
}

/**
 * Placeholder copy while the worker has not summarized the item yet.
 *
 * Saving is deliberately two-phase, so a freshly captured item legitimately has no
 * summary. Saying so beats an empty card that looks broken.
 */
function summaryFor(item: VaultItem): string {
  if (item.summary) return item.summary;
  switch (item.processing_status) {
    case "pending":
      return "Queued — Recall will summarize, tag and connect this shortly.";
    case "processing":
      return "Reading this now…";
    case "failed":
      return "We couldn't read this one. Open the original to check it's still reachable.";
    case "skipped":
      // Instagram posts are saved as a bare link on purpose — no scrape, no AI spend.
      // Saying so beats an empty card that reads as a failure.
      return "Saved as a link. Open it on Instagram to see the post.";
    default:
      return "No summary yet.";
  }
}

export function toMemory(item: VaultItem): Memory {
  const seed = hash(item.id);
  const { label, days } = relativeDay(item.created_at);
  return {
    id: item.id,
    kind: KIND_BY_TYPE[item.type] ?? "link",
    title: item.title?.trim() || hostOf(item.source_url),
    summary: summaryFor(item),
    source: hostOf(item.source_url),
    tags: item.ai_tags.length ? item.ai_tags : ["inbox"],
    savedAt: label,
    savedDays: days,
    label: item.ai_label?.trim() || undefined,
    cover: item.thumbnail_url ?? undefined,
    accent: ACCENTS[seed % ACCENTS.length],
    height: HEIGHTS[seed % HEIGHTS.length],
    space: item.ai_category ?? undefined,
  };
}

export const toMemories = (items: VaultItem[]): Memory[] => items.map(toMemory);
