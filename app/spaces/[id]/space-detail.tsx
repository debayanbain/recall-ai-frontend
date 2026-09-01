"use client";

import { use } from "react";
import { Pencil, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { AppShell } from "@/components/app-shell";
import { useSpace } from "@/hooks/use-spaces";
import { emojiFor, gradientFor } from "@/lib/space-accent";
import { ShareButton } from "./share-button";
import { SpaceTabs } from "./space-tabs";

const plain = "rounded-xl tracking-normal normal-case";

/**
 * Fetched on the client, like `/memory/[id]` is.
 *
 * A Space belongs to one account and its id is a UUID, so there is nothing to prerender
 * and nothing a server component could fetch without the session cookie. The previous
 * version called `generateStaticParams` over the six mock ids, which would 404 every real
 * Space the moment the data became real.
 */
export function SpaceDetailView({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: space, isLoading, isError, refetch } = useSpace(id);

  if (isLoading) {
    return (
      <AppShell>
        {/* Same footprint as the hero, so the page does not jump when it lands. */}
        <Skeleton aria-label="Loading space" className="h-64 w-full rounded-[24px] sm:rounded-[28px] md:h-72" />
        <Skeleton className="mt-6 h-10 w-full max-w-md rounded-xl" />
        <Skeleton className="mt-6 h-48 w-full rounded-[calc(var(--radius)+4px)]" />
      </AppShell>
    );
  }

  if (isError || !space) {
    return (
      <AppShell>
        <Card className="gap-0 rounded-3xl border border-destructive/30 bg-destructive/5 py-0 shadow-none ring-0">
          <CardContent className="px-6 py-14 text-center" role="alert">
            <h1 className="font-display text-[22px] tracking-tight text-destructive">
              We couldn&rsquo;t open this space
            </h1>
            <p className="mx-auto mt-1.5 max-w-sm text-[13px] leading-relaxed text-destructive/85">
              It may have been deleted, or you may no longer be a member of it.
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
      </AppShell>
    );
  }

  const others = space.member_count - 1;

  return (
    <AppShell>
      <div
        className={`relative overflow-hidden rounded-[24px] border border-border bg-linear-to-br sm:rounded-[28px] ${gradientFor(space)}`}
      >
        <div className="absolute inset-0 grid-dots opacity-50" />
        <div className="relative flex flex-col gap-5 p-6 sm:p-8 md:flex-row md:items-end md:justify-between md:gap-6 md:p-12">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-white/85 px-3 py-1 text-[11.5px] font-medium text-primary backdrop-blur">
              <span aria-hidden>{emojiFor(space)}</span>{" "}
              {space.role === "owner" ? "Space · curated by you" : `Space · you're an ${space.role}`}
            </div>
            <h1 className="mt-4 font-display text-[32px] leading-[1.05] tracking-tight sm:text-[44px] md:text-[64px]">
              {space.name}
            </h1>
            {(space.ai_overview ?? space.description) && (
              <p className="mt-3 max-w-xl text-[14px] leading-relaxed text-foreground/75 sm:text-[14.5px]">
                {space.ai_overview ?? space.description}
              </p>
            )}
            <div className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[12px] text-foreground/70">
              <span className="tabular-nums">
                {space.memory_count} {space.memory_count === 1 ? "memory" : "memories"}
              </span>
              {/* Connections and collaborators appear only when there is something true
                  to say. A hardcoded "3 collaborators" was the tell that this page was a
                  mockup; a "0 connections" would be a claim we have not measured. */}
              {space.connection_count !== null && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="tabular-nums">{space.connection_count} connections</span>
                </>
              )}
              {others > 0 && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="flex items-center gap-1.5">
                    <Users className="h-3 w-3 shrink-0" /> {others}{" "}
                    {others === 1 ? "collaborator" : "collaborators"}
                  </span>
                </>
              )}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {/* Sharing is the owner's call: it is what turns a private Space into a
                public page, and the server refuses it from anyone else. */}
            {space.role === "owner" && (
              <ShareButton
                spaceId={space.id}
                spaceSlug={space.slug}
                spaceTitle={space.name}
                visibility={space.visibility}
              />
            )}
            {space.role !== "viewer" && (
              <Button
                variant="outline"
                className="h-11 gap-2 rounded-xl border-border bg-white/90 px-3.5 text-[13px] font-semibold tracking-normal normal-case backdrop-blur"
              >
                <Pencil className="size-4" /> Edit
              </Button>
            )}
          </div>
        </div>
      </div>

      <SpaceTabs space={space} />
    </AppShell>
  );
}
