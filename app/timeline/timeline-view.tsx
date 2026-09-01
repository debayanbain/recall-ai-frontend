"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarRange, Loader2 } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { MemoryCard } from "@/components/memory-card";
import { SignedOutInvite } from "@/components/signed-out-invite";
import { useCapture } from "@/components/capture-sheet";
import { useSession } from "@/hooks/use-auth";
import { useVaultTimeline } from "@/hooks/use-vault";
import { toMemory } from "@/lib/vault-adapter";
import { fadeUp, motionVariants, stagger } from "@/lib/motion";
import { groupByPeriod, rangeStart, type RangeId } from "@/lib/timeline";

const PAGE_SIZE = 60;

/**
 * How far the page will walk backwards on its own to make a narrowed count exact.
 *
 * "This week" is only trustworthy once the loaded rows reach past Monday, so the page
 * fetches until they do — but a vault where a single week holds thousands of memories
 * must not turn a filter click into an unbounded download. Past this the count says
 * "so far" and the reader asks for more by hand.
 */
const MAX_AUTO_PAGES = 5;

const ranges: { id: RangeId; label: string }[] = [
  { id: "all", label: "All time" },
  { id: "week", label: "This week" },
  { id: "month", label: "This month" },
];

/** Undoes the base control defaults (square, uppercase, wide tracking). */
const chip =
  "h-11 min-w-0 rounded-full border border-border bg-card px-3.5 text-[12px] font-medium tracking-normal text-muted-foreground normal-case hover:bg-secondary hover:text-foreground aria-pressed:border-primary/30 aria-pressed:bg-primary-soft aria-pressed:text-accent-foreground";

const plural = (n: number) => (n === 1 ? "memory" : "memories");

export function TimelineView() {
  const { isSignedIn, isLoading: sessionLoading } = useSession();
  const {
    data,
    isPending,
    isError,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useVaultTimeline({ pageSize: PAGE_SIZE });
  const [range, setRange] = useState<RangeId>("all");
  const capture = useCapture();
  const reduced = useReducedMotion();
  const listVariants = motionVariants(reduced, stagger(0.035));
  const itemVariants = motionVariants(reduced, fadeUp);

  const items = useMemo(() => data?.pages.flatMap((page) => page.items) ?? [], [data]);
  // The window total from the same scan that returned the rows — the authority on how
  // many memories exist, not "how many have been loaded".
  const total = data?.pages[0]?.total ?? 0;
  const pageCount = data?.pages.length ?? 0;

  const { groups, scopedCount, rangeSettled } = useMemo(() => {
    const now = new Date();
    const from = rangeStart(range, now);
    const scoped = items.filter((item) => {
      const at = new Date(item.created_at).getTime();
      // An unreadable timestamp cannot be placed in a window; it is only shown when the
      // reader has not narrowed to one.
      return Number.isNaN(at) ? range === "all" : at >= from;
    });
    const oldestLoaded = items.length
      ? new Date(items[items.length - 1].created_at).getTime()
      : Number.NaN;
    // Rows come back newest-first, so once the oldest loaded one predates the window,
    // the window holds nothing further back and its count is exact rather than partial.
    const settled =
      range === "all"
        ? !hasNextPage
        : !hasNextPage || (!Number.isNaN(oldestLoaded) && oldestLoaded < from);
    return {
      groups: groupByPeriod(scoped, now),
      scopedCount: scoped.length,
      rangeSettled: settled,
    };
  }, [items, range, hasNextPage]);

  useEffect(() => {
    if (range === "all" || rangeSettled) return;
    if (!hasNextPage || isFetchingNextPage) return;
    if (pageCount >= MAX_AUTO_PAGES) return;
    void fetchNextPage();
  }, [range, rangeSettled, hasNextPage, isFetchingNextPage, pageCount, fetchNextPage]);

  if (!sessionLoading && !isSignedIn) {
    return (
      <SignedOutInvite
        title="Your timeline starts with your first memory"
        description="Sign in to see how your thinking evolved — every capture, in the order you made it."
      />
    );
  }

  const loading = sessionLoading || (isSignedIn && isPending);
  const rangeLabel = ranges.find((r) => r.id === range)!.label.toLowerCase();
  const summary =
    range === "all"
      ? `${total} ${plural(total)} all time`
      : `${scopedCount} ${plural(scopedCount)} ${rangeLabel}${rangeSettled ? "" : " so far"}`;
  // Once a narrowed range is fully loaded, every remaining page is older than it — so
  // "Load more" would add nothing the reader asked for.
  const canLoadMore = hasNextPage && (range === "all" || !rangeSettled);
  const remaining = Math.max(0, total - items.length);

  return (
    <>
      <ToggleGroup
        aria-label="Time range"
        value={[range]}
        onValueChange={(next) => next[0] && setRange(next[0] as RangeId)}
        className="flex-wrap gap-1.5"
      >
        {ranges.map((r) => (
          <ToggleGroupItem key={r.id} value={r.id} className={chip}>
            {r.label}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>

      {!loading && !isError && total > 0 && (
        <p aria-live="polite" className="mt-3 text-[12px] tabular-nums text-muted-foreground">
          {summary}
          {items.length < total && ` · ${items.length} loaded`}
        </p>
      )}

      <div className="relative mt-6">
        <div className="absolute left-[7px] top-2 bottom-2 hidden w-px bg-linear-to-b from-primary/40 via-border to-transparent md:block" />

        {loading ? (
          <div aria-busy="true" aria-label="Loading your timeline" className="space-y-10">
            {[0, 1].map((block) => (
              <div key={block} className="md:pl-10">
                <Skeleton className="h-7 w-44 rounded-full" />
                <div className="mt-4 columns-1 gap-4 sm:columns-2 xl:columns-3">
                  {[0, 1, 2, 3].map((i) => (
                    <Skeleton
                      key={i}
                      className={`mb-4 w-full rounded-3xl ${i % 2 ? "h-56" : "h-40"}`}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : isError ? (
          <Card className="gap-0 rounded-3xl border border-destructive/30 bg-destructive/5 py-0 shadow-none ring-0">
            <CardContent className="px-6 py-12 text-center" role="alert">
              <h2 className="font-display text-[20px] tracking-tight text-destructive">
                We couldn&rsquo;t load your timeline
              </h2>
              <p className="mx-auto mt-1.5 max-w-sm text-[13px] leading-relaxed text-destructive/85">
                Your memories are saved — this is just the list failing to load.
              </p>
              <Button
                variant="ghost"
                onClick={() => refetch()}
                className="mt-4 h-11 rounded-xl px-4 text-[13.5px] font-semibold tracking-normal text-destructive normal-case hover:bg-destructive/10"
              >
                Try again
              </Button>
            </CardContent>
          </Card>
        ) : total === 0 ? (
          <Card className="gap-0 rounded-3xl border border-dashed border-border bg-secondary/30 py-0 shadow-none ring-0">
            <CardContent className="px-6 py-14 text-center">
              <div className="mx-auto grid size-12 place-items-center rounded-2xl bg-primary-soft text-primary">
                <CalendarRange className="size-5" aria-hidden />
              </div>
              <h2 className="mt-4 font-display text-[22px] tracking-tight">
                Your timeline is empty
              </h2>
              <p className="mx-auto mt-1.5 max-w-sm text-[13px] leading-relaxed text-muted-foreground">
                Capture a link, a note or a recording and it lands here, dated, the moment
                Recall has read it.
              </p>
              <Button
                onClick={() => capture.open()}
                className="mt-5 h-11 gap-2 rounded-xl gradient-primary px-4 text-[13.5px] font-semibold tracking-normal text-white normal-case hover:bg-transparent"
              >
                Capture a memory
              </Button>
            </CardContent>
          </Card>
        ) : groups.length === 0 ? (
          <Card className="gap-0 rounded-3xl border border-dashed border-border bg-secondary/30 py-0 shadow-none ring-0">
            <CardContent className="px-6 py-12 text-center">
              <p className="text-[13.5px] text-muted-foreground">
                Nothing captured {rangeLabel} yet.
              </p>
              <Button
                variant="ghost"
                onClick={() => setRange("all")}
                className="mt-3 h-11 rounded-xl px-4 text-[13.5px] font-semibold tracking-normal normal-case"
              >
                Show all time
              </Button>
            </CardContent>
          </Card>
        ) : (
          <motion.div
            key={range}
            variants={listVariants}
            initial="hidden"
            animate="show"
            className="space-y-10 md:space-y-12"
          >
            {groups.map((group) => (
              // Variants only propagate through motion components, so every level from
              // the staggering parent down to a card has to be one — a plain <section>
              // in the middle leaves the cards with no animation at all.
              <motion.section
                key={group.key}
                variants={listVariants}
                aria-labelledby={`timeline-${group.key}`}
                className="relative md:pl-10"
              >
                <div
                  aria-hidden
                  className="absolute left-0 top-1.5 hidden h-4 w-4 rounded-full border-4 border-white bg-primary shadow-[0_0_0_3px_oklch(0.55_0.19_285/0.15)] md:block"
                />
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <h2
                    id={`timeline-${group.key}`}
                    className="font-display text-[24px] tracking-tight sm:text-[28px]"
                  >
                    {group.label}
                  </h2>
                  <span className="text-[12px] tabular-nums text-muted-foreground">
                    {group.items.length} {plural(group.items.length)}
                  </span>
                  {group.dateline && (
                    <span className="text-[12px] tabular-nums text-muted-foreground/70">
                      {group.dateline}
                    </span>
                  )}
                </div>
                <motion.div
                  variants={listVariants}
                  className="mt-4 columns-1 gap-4 sm:columns-2 xl:columns-3 [column-fill:_balance]"
                >
                  {group.items.map((item) => (
                    <motion.div
                      key={item.id}
                      variants={itemVariants}
                      className="mb-4 break-inside-avoid"
                    >
                      <MemoryCard m={toMemory(item)} />
                    </motion.div>
                  ))}
                </motion.div>
              </motion.section>
            ))}
          </motion.div>
        )}
      </div>

      {!loading && !isError && canLoadMore && (
        <div className="mt-10 flex justify-center md:pl-10">
          <Button
            variant="ghost"
            onClick={() => fetchNextPage()}
            disabled={isFetchingNextPage}
            className="h-11 gap-2 rounded-full border border-border bg-card px-5 text-[13px] font-semibold tracking-normal normal-case hover:bg-secondary"
          >
            {isFetchingNextPage && <Loader2 className="size-4 animate-spin" aria-hidden />}
            {isFetchingNextPage
              ? "Loading…"
              : `Load ${Math.min(PAGE_SIZE, remaining)} older ${plural(Math.min(PAGE_SIZE, remaining))}`}
          </Button>
        </div>
      )}
    </>
  );
}
