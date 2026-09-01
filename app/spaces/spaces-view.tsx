"use client";

import Link from "next/link";
import { Plus, Sparkles, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { AppShell } from "@/components/app-shell";
import { useSpaces } from "@/hooks/use-spaces";
import { useAddToSpaceSheet } from "@/components/add-to-space";
import { emojiFor, gradientFor } from "@/lib/space-accent";
import type { Space } from "@/lib/types";

/** Undoes the base-sera Button defaults (square, uppercase, wide tracking). */
const plain = "rounded-xl tracking-normal normal-case";

export function SpacesView() {
  const { data: spaces, isLoading, isError, refetch } = useSpaces();
  const sheet = useAddToSpaceSheet();

  return (
    <AppShell
      title="Spaces"
      subtitle="Curated knowledge collections — not folders. Each space connects related memories and can be shared as an interactive page."
      actions={
        <Button
          onClick={() => sheet.open()}
          className={`${plain} h-11 gap-2 gradient-primary px-3.5 text-[13px] font-semibold text-white hover:bg-transparent`}
        >
          <Plus className="size-4" /> New space
        </Button>
      }
    >
      {isLoading ? (
        // Reserve the grid's footprint so the page does not jump when data lands.
        <div
          aria-busy="true"
          aria-label="Loading spaces"
          className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 xl:grid-cols-3"
        >
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-64 w-full rounded-[calc(var(--radius)+4px)]" />
          ))}
        </div>
      ) : isError ? (
        <Card className="gap-0 rounded-3xl border border-destructive/30 bg-destructive/5 py-0 shadow-none ring-0">
          <CardContent className="px-6 py-12 text-center" role="alert">
            <h2 className="font-display text-[20px] tracking-tight text-destructive">
              We couldn&rsquo;t load your spaces
            </h2>
            <p className="mx-auto mt-1.5 max-w-sm text-[13px] leading-relaxed text-destructive/85">
              Your spaces are saved — this is just the list failing to load.
            </p>
            <Button
              variant="ghost"
              onClick={() => refetch()}
              className={`${plain} mt-4 h-11 px-4 text-[13.5px] font-semibold text-destructive hover:bg-destructive/10`}
            >
              Try again
            </Button>
          </CardContent>
        </Card>
      ) : !spaces?.length ? (
        <Card className="gap-0 rounded-3xl border border-dashed border-border bg-secondary/30 py-0 shadow-none ring-0">
          <CardContent className="px-6 py-14 text-center">
            <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-primary-soft text-primary">
              <Sparkles className="h-5 w-5" />
            </div>
            <h2 className="mt-4 font-display text-[22px] tracking-tight">No spaces yet</h2>
            <p className="mx-auto mt-1.5 max-w-md text-[13px] leading-relaxed text-muted-foreground">
              A space is a context, not a folder — pick a few related memories in your vault
              and Recall will suggest one for you.
            </p>
            <Button
              onClick={() => sheet.open()}
              className={`${plain} mt-5 h-11 gap-2 gradient-primary px-4 text-[13.5px] font-semibold text-white hover:bg-transparent`}
            >
              <Plus className="size-4" /> New space
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <p aria-live="polite" className="sr-only">
            {spaces.length} {spaces.length === 1 ? "space" : "spaces"}
          </p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 xl:grid-cols-3">
            {spaces.map((s) => (
              <SpaceCard key={s.id} space={s} />
            ))}
          </div>
        </>
      )}
    </AppShell>
  );
}

function SpaceCard({ space }: { space: Space }) {
  const others = space.member_count - 1;
  return (
    <Card className="card-soft card-lift group gap-0 overflow-hidden rounded-[calc(var(--radius)+4px)] py-0 shadow-none ring-0">
      <Link
        href={`/spaces/${space.id}`}
        className="block focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        <div className={`relative h-32 bg-linear-to-br sm:h-36 ${gradientFor(space)}`}>
          <div className="absolute inset-0 grid-dots opacity-50" />
          <div className="absolute left-5 top-5 grid h-12 w-12 place-items-center rounded-2xl bg-white/85 text-[22px] text-primary shadow-sm backdrop-blur">
            {emojiFor(space)}
          </div>
          {space.pinned && (
            <Badge className="absolute right-4 top-4 rounded-full bg-white/85 px-2 py-0.5 text-[10.5px] font-medium tracking-normal text-primary normal-case backdrop-blur">
              Pinned
            </Badge>
          )}
        </div>
        <CardContent className="p-4 sm:p-5">
          <div className="flex items-start justify-between gap-3">
            <h3 className="text-[18px] font-semibold tracking-tight">{space.name}</h3>
            <div className="shrink-0 text-[11px] tabular-nums text-muted-foreground">
              {space.memory_count}
              {/* Only when it has actually been computed. Null means "never measured",
                  and printing 0 for that is a claim about the space that is not true. */}
              {space.connection_count !== null && <> · {space.connection_count}↔</>}
            </div>
          </div>
          <p className="mt-2 line-clamp-2 text-[13px] leading-relaxed text-muted-foreground">
            {space.ai_overview ? (
              <Sparkles className="mr-1 inline h-3 w-3 text-primary" />
            ) : null}
            {space.ai_overview ??
              space.description ??
              "No description yet — open the space to add one."}
          </p>
          <div className="mt-4 flex items-center justify-between text-[11.5px] text-muted-foreground">
            <span className="capitalize">{space.role}</span>
            {others > 0 && (
              <span className="flex items-center gap-1.5">
                <Users className="h-3 w-3" /> {others}{" "}
                {others === 1 ? "collaborator" : "collaborators"}
              </span>
            )}
          </div>
        </CardContent>
      </Link>
    </Card>
  );
}
