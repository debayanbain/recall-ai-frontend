"use client";

import { useMemo, useState } from "react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { MemoryCard } from "@/components/memory-card";
import { useStore } from "@/lib/store";

const ranges = [
  { id: "all", label: "All time", max: Infinity },
  { id: "week", label: "This week", max: 7 },
  { id: "month", label: "This month", max: 30 },
] as const;

const chip =
  "h-11 min-w-0 rounded-full border border-border bg-card px-3.5 text-[12px] font-medium tracking-normal text-muted-foreground normal-case hover:bg-secondary hover:text-foreground aria-pressed:border-primary/30 aria-pressed:bg-primary-soft aria-pressed:text-accent-foreground";

export function TimelineView() {
  const { memories } = useStore();
  const [range, setRange] = useState<string>("all");

  const groups = useMemo(() => {
    const max = ranges.find((r) => r.id === range)?.max ?? Infinity;
    const scoped = memories.filter((m) => m.savedDays <= max);
    return [
      { label: "This week", items: scoped.filter((m) => m.savedDays <= 7) },
      { label: "Earlier this month", items: scoped.filter((m) => m.savedDays > 7 && m.savedDays <= 30) },
      { label: "Older", items: scoped.filter((m) => m.savedDays > 30) },
    ].filter((g) => g.items.length > 0);
  }, [memories, range]);

  return (
    <>
      <ToggleGroup
        aria-label="Time range"
        value={[range]}
        onValueChange={(next) => next[0] && setRange(next[0])}
        className="flex-wrap gap-1.5"
      >
        {ranges.map((r) => (
          <ToggleGroupItem key={r.id} value={r.id} className={chip}>
            {r.label}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>

      <div className="relative mt-6">
        <div className="absolute left-[7px] top-2 bottom-2 hidden w-px bg-linear-to-b from-primary/40 via-border to-transparent md:block" />
        <div className="space-y-10 md:space-y-12">
          {groups.length === 0 && (
            <p className="rounded-3xl border border-dashed border-border bg-secondary/30 px-6 py-12 text-center text-[13.5px] text-muted-foreground">
              Nothing captured in this range yet.
            </p>
          )}
          {groups.map((g) => (
            <div key={g.label} className="relative md:pl-10">
              <div className="absolute left-0 top-1.5 hidden h-4 w-4 rounded-full border-4 border-white bg-primary shadow-[0_0_0_3px_oklch(0.55_0.19_285/0.15)] md:block" />
              <div className="flex flex-wrap items-baseline gap-3">
                <h2 className="font-display text-[24px] tracking-tight sm:text-[28px]">{g.label}</h2>
                <span className="text-[12px] tabular-nums text-muted-foreground">
                  {g.items.length} {g.items.length === 1 ? "memory" : "memories"}
                </span>
              </div>
              <div className="mt-4 columns-1 gap-4 sm:columns-2 xl:columns-3 [column-fill:_balance]">
                {g.items.map((m) => (
                  <div key={m.id} className="mb-4 break-inside-avoid">
                    <MemoryCard m={m} />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
