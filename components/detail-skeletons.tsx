"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * What a detail page shows until it can show the real thing.
 *
 * Each skeleton is drawn twice in one navigation -- by the route's `loading.tsx` while the
 * page's code arrives, then by the page itself while its data does -- so they live here,
 * where the two cannot drift apart and make the page jump between them.
 */

/** Past any ordinary slow load, so nobody sees this on a page that was about to appear. */
const SLOW_AFTER_MS = 8_000;

/**
 * The words on top of the placeholder.
 *
 * Grey blocks on their own are nearly the colour of the page, so a wait of any length was
 * indistinguishable from a page that had stopped. And nothing here can time out -- a
 * request that hangs leaves the skeleton up indefinitely -- so past a point it says so and
 * offers the one way out, rather than pulsing forever.
 */
function LoadingStatus({ label }: { label: string }) {
  const [slow, setSlow] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setSlow(true), SLOW_AFTER_MS);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="absolute inset-0 grid place-items-center px-4">
      <div role="status" className="flex flex-col items-center gap-3">
        <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3.5 py-2 text-[13px] font-medium text-foreground/80 shadow-sm">
          <Loader2
            className="size-4 shrink-0 animate-spin text-primary motion-reduce:animate-none"
            aria-hidden
          />
          {slow ? "Taking longer than usual…" : label}
        </span>
        {slow && (
          <Button
            variant="outline"
            onClick={() => window.location.reload()}
            className="h-11 rounded-xl border-border bg-card px-4 text-[13px] font-medium tracking-normal text-foreground/80 normal-case hover:bg-secondary"
          >
            Reload
          </Button>
        )}
      </div>
    </div>
  );
}

/** Same grid and banner height as `MemoryDetail`, so the page does not jump when it lands. */
export function MemoryDetailSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading memory">
      <Skeleton className="mb-5 h-5 w-56 max-w-full rounded-lg" />
      <div className="grid grid-cols-1 gap-7 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-8">
        <div className="min-w-0 space-y-6">
          <div className="relative">
            <Skeleton className="h-44 w-full rounded-[24px] sm:h-60 sm:rounded-[28px] md:h-72" />
            <LoadingStatus label="Opening this memory…" />
          </div>
          <Skeleton className="h-10 w-3/4 rounded-lg" />
          <Skeleton className="h-32 w-full rounded-2xl" />
        </div>
        <Skeleton className="hidden h-36 rounded-[calc(var(--radius)+4px)] lg:block" />
      </div>
    </div>
  );
}

/** Same footprint as the Space hero, so the page does not jump when it lands. */
export function SpaceDetailSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading space">
      <div className="relative">
        <Skeleton className="h-64 w-full rounded-[24px] sm:rounded-[28px] md:h-72" />
        <LoadingStatus label="Opening this space…" />
      </div>
      <Skeleton className="mt-6 h-10 w-full max-w-md rounded-xl" />
      <Skeleton className="mt-6 h-48 w-full rounded-[calc(var(--radius)+4px)]" />
    </div>
  );
}
