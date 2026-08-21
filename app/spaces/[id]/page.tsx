import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Pencil, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AppShell } from "@/components/app-shell";
import { spaces } from "@/lib/mock-data";
import { ShareButton } from "./share-button";
import { SpaceTabs } from "./space-tabs";

type Params = { id: string };

export function generateStaticParams(): Params[] {
  return spaces.map((s) => ({ id: s.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { id } = await params;
  const space = spaces.find((s) => s.id === id);
  return {
    title: `${space?.title ?? "Space"} · RecallAI`,
    description: space?.summary,
  };
}

export default async function SpaceDetail({ params }: { params: Promise<Params> }) {
  const { id } = await params;
  const space = spaces.find((s) => s.id === id);
  if (!space) notFound();

  return (
    <AppShell>
      <div className={`relative overflow-hidden rounded-[24px] border border-border bg-linear-to-br sm:rounded-[28px] ${space.gradient}`}>
        <div className="absolute inset-0 grid-dots opacity-50" />
        <div className="relative flex flex-col gap-5 p-6 sm:p-8 md:flex-row md:items-end md:justify-between md:gap-6 md:p-12">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-white/85 px-3 py-1 text-[11.5px] font-medium text-primary backdrop-blur">
              <span>{space.emoji}</span> Space · curated by you
            </div>
            <h1 className="mt-4 font-display text-[32px] leading-[1.05] tracking-tight sm:text-[44px] md:text-[64px]">
              {space.title}
            </h1>
            <p className="mt-3 max-w-xl text-[14px] leading-relaxed text-foreground/75 sm:text-[14.5px]">
              {space.summary}
            </p>
            <div className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[12px] text-foreground/70">
              <span className="tabular-nums">{space.memoryCount} memories</span>
              <span aria-hidden="true">·</span>
              <span className="tabular-nums">{space.connectionCount} connections</span>
              <span aria-hidden="true">·</span>
              <span>~18 min read</span>
              <span aria-hidden="true">·</span>
              <span className="flex items-center gap-1.5">
                <Users className="h-3 w-3 shrink-0" /> 3 collaborators
              </span>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <ShareButton spaceId={space.id} spaceTitle={space.title} />
            <Button
              variant="outline"
              className="h-11 gap-2 rounded-xl border-border bg-white/90 px-3.5 text-[13px] font-semibold tracking-normal normal-case backdrop-blur"
            >
              <Pencil className="size-4" /> Edit
            </Button>
          </div>
        </div>
      </div>

      <SpaceTabs space={space} />
    </AppShell>
  );
}
