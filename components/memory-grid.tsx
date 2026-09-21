"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { CheckSquare, Heart, LayoutGrid, List, Search, SlidersHorizontal } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Toggle } from "@/components/ui/toggle";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MemoryCard, MemoryRow } from "@/components/memory-card";
import { useCapture } from "@/components/capture-sheet";
import { useStore } from "@/lib/store";
import { useAddToSpaceSheet } from "@/components/add-to-space";
import { useSelection, useSelectionStore } from "@/lib/stores/selection-store";
import type { Memory, MemoryKind } from "@/lib/mock-data";
import { fadeUp, motionVariants, scaleIn, stagger, transition } from "@/lib/motion";

type FilterId = "all" | "notes" | "links" | "videos" | "articles" | "files" | "images" | "voice" | "code";

const filters: { id: FilterId; label: string; kinds?: MemoryKind[] }[] = [
  { id: "all", label: "All" },
  { id: "notes", label: "Notes", kinds: ["note"] },
  { id: "links", label: "Links", kinds: ["link", "tweet"] },
  { id: "videos", label: "Videos", kinds: ["video"] },
  { id: "articles", label: "Articles", kinds: ["article"] },
  { id: "files", label: "Files", kinds: ["pdf"] },
  { id: "images", label: "Images", kinds: ["image"] },
  { id: "voice", label: "Voice", kinds: ["voice"] },
  { id: "code", label: "Code", kinds: ["github"] },
];

type SortId = "relevant" | "newest" | "oldest" | "title";

const sorts: { value: SortId; label: string }[] = [
  { value: "relevant", label: "Most relevant" },
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "title", label: "Title A–Z" },
];

function sortMemories(items: Memory[], sort: SortId) {
  if (sort === "relevant") return items;
  const copy = [...items];
  if (sort === "newest") return copy.sort((a, b) => a.savedDays - b.savedDays);
  if (sort === "oldest") return copy.sort((a, b) => b.savedDays - a.savedDays);
  return copy.sort((a, b) => a.title.localeCompare(b.title));
}

/** Undoes the base-sera control defaults (square, uppercase, wide tracking). */
const chip =
  "h-11 min-w-0 shrink-0 rounded-full border border-border bg-card px-3 text-[12px] font-medium tracking-normal text-muted-foreground normal-case hover:bg-secondary hover:text-foreground aria-pressed:border-primary/30 aria-pressed:bg-primary-soft aria-pressed:text-accent-foreground sm:h-9";

export function MemoryGrid({
  heading,
  showViewToggle = false,
  duplicateForDensity = false,
  columns = "xl:columns-4",
  items,
  total,
  viewAllHref,
  isLoading = false,
  isError = false,
  onRetry,
}: {
  heading?: string;
  showViewToggle?: boolean;
  /** The vault repeats the seed set so the masonry grid reads as a full library. */
  duplicateForDensity?: boolean;
  columns?: string;
  /**
   * How many memories the vault actually holds, from the API's own `total`.
   *
   * `items` is one page of that, so counting it answers "how many arrived", not "how
   * many do I have" — the home feed asks for 12 and said "12 memories" under a stat tile
   * reading 21. Passing this makes the line say which number it is.
   */
  total?: number;
  /** Where the rest of them live, shown only when this is a partial page. */
  viewAllHref?: string;
  /**
   * Real memories from the API. When omitted the grid falls back to the local store,
   * which is still what the pages not yet migrated off mock data rely on.
   */
  items?: Memory[];
  isLoading?: boolean;
  isError?: boolean;
  onRetry?: () => void;
}) {
  const store = useStore();
  const memories = items ?? store.memories;
  const favorites = store.favorites;
  const capture = useCapture();
  const [filter, setFilter] = useState<FilterId>("all");
  const [sort, setSort] = useState<SortId>("relevant");
  const [view, setView] = useState<"cards" | "list">("cards");
  const [onlyFavorites, setOnlyFavorites] = useState(false);
  const sheet = useAddToSpaceSheet();
  const { active: selecting } = useSelection();
  const enterSelection = useSelectionStore((s) => s.enter);
  const exitSelection = useSelectionStore((s) => s.exit);
  const reduced = useReducedMotion();
  const listVariants = motionVariants(reduced, stagger(0.035));
  const itemVariants = motionVariants(reduced, fadeUp);
  const panelVariants = motionVariants(reduced, scaleIn);

  const results = useMemo(() => {
    const active = filters.find((f) => f.id === filter);
    let list = active?.kinds ? memories.filter((m) => active.kinds!.includes(m.kind)) : memories;
    if (onlyFavorites) list = list.filter((m) => favorites.includes(m.id));
    list = sortMemories(list, sort);
    // Only the mock library is padded out; real memories are shown as they are.
    const pad = duplicateForDensity && !items && filter === "all" && !onlyFavorites;
    return pad ? [...list, ...list] : list;
  }, [memories, favorites, filter, sort, onlyFavorites, duplicateForDensity, items]);

  // `memories` is the page that arrived; `total` is what the vault holds. A grid showing
  // everything there is says nothing extra.
  const truncated = total !== undefined && total > memories.length;

  return (
    <section>
      <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-center">
        {heading && (
          <h2 className="font-display text-[22px] tracking-tight sm:text-[26px]">{heading}</h2>
        )}

        <div className="flex flex-col gap-3 lg:ml-auto lg:flex-row lg:items-center">
          {/* Chips scroll horizontally on phones rather than wrapping into a wall */}
          <ToggleGroup
            aria-label="Filter by type"
            value={[filter]}
            onValueChange={(next) => next[0] && setFilter(next[0] as FilterId)}
            className="-mx-4 w-auto snap-x gap-1.5 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 sm:pb-0"
          >
            {filters.map((f) => (
              <ToggleGroupItem key={f.id} value={f.id} className={`${chip} snap-start`}>
                {f.label}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>

          <div className="flex flex-wrap items-center gap-2">
            {/* Selection is disabled while the mock library is padded out: that mode
                repeats each item under a `${id}-${i}` key, so one tap would select two
                cards and the bar would count memories that are the same memory. */}
            {!(duplicateForDensity && !items) && (
              <Toggle
                pressed={selecting}
                onPressedChange={(next) => (next ? enterSelection() : exitSelection())}
                aria-label="Select memories"
                className={`${chip} gap-1.5 aria-pressed:border-primary/30 aria-pressed:bg-primary-soft aria-pressed:text-accent-foreground`}
              >
                <CheckSquare className="size-3.5" />
                Select
              </Toggle>
            )}
            <Toggle
              pressed={onlyFavorites}
              onPressedChange={setOnlyFavorites}
              className={`${chip} gap-1.5 aria-pressed:border-rose-200 aria-pressed:bg-rose-50 aria-pressed:text-rose-600`}
            >
              <Heart className="size-3.5" fill={onlyFavorites ? "currentColor" : "none"} />
              Favorites
              {favorites.length > 0 && (
                <span className="tabular-nums opacity-70">{favorites.length}</span>
              )}
            </Toggle>

            <Select
              value={sort}
              onValueChange={(value) => setSort(value as SortId)}
              items={sorts}
            >
              <SelectTrigger
                aria-label="Sort memories"
                className="h-11 gap-2 rounded-full border border-border bg-card px-3 text-[12px] font-medium text-muted-foreground focus-visible:border-primary/40 focus-visible:ring-4 focus-visible:ring-primary/10 sm:h-9"
              >
                <SlidersHorizontal className="size-3.5 shrink-0" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-2xl">
                {sorts.map((s) => (
                  <SelectItem
                    key={s.value}
                    value={s.value}
                    className="rounded-xl text-[13px] tracking-normal normal-case"
                  >
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {showViewToggle && (
              <ToggleGroup
                aria-label="Layout"
                value={[view]}
                onValueChange={(next) => next[0] && setView(next[0] as "cards" | "list")}
                className="rounded-full border border-border bg-card p-1"
              >
                <ToggleGroupItem
                  value="cards"
                  aria-label="Card layout"
                  className="size-11 min-w-0 rounded-full px-0 aria-pressed:bg-primary-soft aria-pressed:text-accent-foreground sm:size-8"
                >
                  <LayoutGrid className="size-3.5" />
                </ToggleGroupItem>
                <ToggleGroupItem
                  value="list"
                  aria-label="List layout"
                  className="size-11 min-w-0 rounded-full px-0 aria-pressed:bg-primary-soft aria-pressed:text-accent-foreground sm:size-8"
                >
                  <List className="size-3.5" />
                </ToggleGroupItem>
              </ToggleGroup>
            )}
          </div>
        </div>
      </div>

      <p aria-live="polite" className="mt-3 text-[12px] text-muted-foreground">
        {results.length} {results.length === 1 ? "memory" : "memories"}
        {filter !== "all" && ` in ${filters.find((f) => f.id === filter)?.label.toLowerCase()}`}
        {onlyFavorites && " · favorites only"}
        {/* Only when this really is a partial page. Saying "21 in your vault" under a
            grid that already shows all 21 would be noise, and the filters narrow what is
            *shown* rather than what was fetched — so the comparison is against how many
            memories arrived, never against the filtered result. */}
        {truncated && (
          <>
            {` · ${total} in your vault`}
            {viewAllHref && (
              <>
                {" · "}
                <Link href={viewAllHref} className="underline underline-offset-2 hover:text-foreground">
                  View all
                </Link>
              </>
            )}
          </>
        )}
      </p>

      {isLoading ? (
        // Reserve the grid's footprint so the page does not jump when data lands.
        <div
          aria-busy="true"
          aria-label="Loading memories"
          className={`mt-5 columns-1 gap-4 sm:columns-2 sm:gap-5 lg:columns-3 ${columns}`}
        >
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <Skeleton
              key={i}
              className={`mb-4 w-full rounded-3xl sm:mb-5 ${
                i % 3 === 0 ? "h-52" : i % 3 === 1 ? "h-72" : "h-40"
              }`}
            />
          ))}
        </div>
      ) : isError ? (
        <Card className="mt-5 gap-0 rounded-3xl border border-destructive/30 bg-destructive/5 py-0 shadow-none ring-0">
          <CardContent className="px-6 py-12 text-center" role="alert">
            <h3 className="font-display text-[20px] tracking-tight text-destructive">
              We couldn&rsquo;t load your memories
            </h3>
            <p className="mx-auto mt-1.5 max-w-sm text-[13px] leading-relaxed text-destructive/85">
              The vault is saved — this is just the list failing to load.
            </p>
            {onRetry && (
              <Button
                variant="ghost"
                onClick={onRetry}
                className="mt-4 h-11 rounded-xl px-4 text-[13.5px] font-semibold tracking-normal text-destructive normal-case hover:bg-destructive/10"
              >
                Try again
              </Button>
            )}
          </CardContent>
        </Card>
      ) : results.length === 0 ? (
        <motion.div variants={panelVariants} initial="hidden" animate="show">
        <Card className="mt-5 gap-0 rounded-3xl border border-dashed border-border bg-secondary/30 py-0 shadow-none ring-0">
          <CardContent className="px-6 py-14 text-center">
            <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-primary-soft text-primary">
              <Search className="h-5 w-5" />
            </div>
            <h3 className="mt-4 font-display text-[22px] tracking-tight">Nothing here yet</h3>
            <p className="mx-auto mt-1.5 max-w-sm text-[13px] leading-relaxed text-muted-foreground">
              {onlyFavorites
                ? "Tap the heart on any memory to keep it close."
                : "No memories of this type yet — capture one and Recall will file it for you."}
            </p>
            <Button
              onClick={() => capture.open()}
              className="mt-5 h-11 gap-2 rounded-xl gradient-primary px-4 text-[13.5px] font-semibold tracking-normal text-white normal-case hover:bg-transparent"
            >
              Capture a memory
            </Button>
          </CardContent>
        </Card>
        </motion.div>
      ) : view === "list" ? (
        <motion.div
          layout={!reduced}
          variants={listVariants}
          initial="hidden"
          animate="show"
          className="mt-5 flex flex-col gap-2.5"
        >
          <AnimatePresence mode="popLayout" initial={false}>
            {results.map((m, i) => (
              <motion.div
                key={`${m.id}-${i}`}
                layout={!reduced}
                variants={itemVariants}
                exit="exit"
                transition={reduced ? { duration: 0 } : transition.soft}
              >
                <MemoryRow m={m} />
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      ) : (
        <motion.div
          key={`${filter}-${sort}-${onlyFavorites}`}
          variants={listVariants}
          initial="hidden"
          animate="show"
          className={`mt-5 columns-1 gap-4 sm:columns-2 sm:gap-5 lg:columns-3 ${columns} [column-fill:_balance]`}
        >
          {results.map((m, i) => (
            <motion.div
              key={`${m.id}-${i}`}
              variants={itemVariants}
              className="mb-4 break-inside-avoid sm:mb-5"
            >
              <MemoryCard m={m} onAddToSpace={(id) => sheet.open([id])} />
            </motion.div>
          ))}
        </motion.div>
      )}
    </section>
  );
}
