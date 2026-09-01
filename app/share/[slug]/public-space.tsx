"use client";

import Link from "next/link";
import { ArrowUpRight, Copy, Globe, Sparkles } from "lucide-react";
import { toast } from "@/lib/toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { MemoryCard } from "@/components/memory-card";
import { toMemories } from "@/lib/vault-adapter";
import { SpaceGlyph } from "@/components/space-icon";
import { gradientFor } from "@/lib/space-accent";
import type { PublicSpace } from "@/lib/types";

/**
 * The public face of a Space.
 *
 * Deliberately smaller than the owner's view, and the difference is the point. There is
 * no Ask AI here (a stranger must not be able to spend the owner's model budget), no
 * Connections and no Timeline (nothing behind them for a visitor), no member list, and
 * no "duplicate as template" — that was a button in the mock with nothing behind it.
 *
 * What a visitor gets is what the API sends: the name, the overview, and the memory
 * *cards*. Never a memory's body, its highlights or its files — the server does not send
 * those, and this component could not render them if it wanted to.
 */

const plain = "rounded-xl tracking-normal normal-case";
const softCard =
  "card-soft gap-0 rounded-[calc(var(--radius)+4px)] py-0 shadow-none ring-0";

export function PublicSpaceView({ space }: { space: PublicSpace }) {
  const items = toMemories(space.items);
  // `gradientFor` keys off an id; a public Space sends none, so its name is the stable
  // input — the same name always draws the same colour.
  const skin = {
    id: space.name,
    accent: space.accent,
    icon: space.icon,
    emoji: space.emoji,
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast.success("Link copied", { description: space.name });
    } catch {
      toast.info("Couldn't copy automatically", {
        description: "Copy the address from the bar instead.",
      });
    }
  };

  return (
    <div className="min-h-dvh bg-background">
      <header className="border-b border-border/70 bg-white/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3.5 sm:px-6 sm:py-4">
          <Button
            nativeButton={false}
            variant="ghost"
            render={<Link href="/" />}
            className={`${plain} h-11 min-w-0 justify-start gap-2.5 px-0 hover:bg-transparent`}
          >
            <span className="grid size-8 shrink-0 place-items-center rounded-lg gradient-primary text-white">
              <Sparkles className="size-4" />
            </span>
            <span className="truncate text-[14px] font-semibold tracking-tight">
              Recall<span className="text-gradient">AI</span>
            </span>
            <Badge
              variant="secondary"
              className="hidden shrink-0 gap-1 rounded-full border border-border bg-secondary px-2 py-0.5 text-[10.5px] font-normal tracking-normal text-muted-foreground normal-case sm:inline-flex"
            >
              <Globe className="h-2.5 w-2.5" /> Public space
            </Badge>
          </Button>
          <div className="flex shrink-0 items-center gap-2">
            <Button
              variant="outline"
              onClick={copyLink}
              className={`${plain} h-11 gap-1.5 border-border bg-card px-3 text-[12.5px] font-medium text-foreground/80 hover:bg-secondary`}
            >
              <Copy className="size-3.5" /> Copy link
            </Button>
            <Button
              nativeButton={false}
              render={<Link href="/sign-up" />}
              className={`${plain} h-11 gap-1.5 gradient-primary px-3.5 text-[12.5px] font-semibold text-white hover:bg-transparent`}
            >
              Sign up <ArrowUpRight className="size-3.5" />
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
        <div
          className={`relative overflow-hidden rounded-[24px] border border-border bg-linear-to-br p-6 sm:rounded-[32px] sm:p-10 md:p-14 ${gradientFor(skin)}`}
        >
          <div className="absolute inset-0 grid-dots opacity-50" />
          <div className="relative mx-auto max-w-3xl text-center">
            <Badge className="gap-1.5 rounded-full bg-white/85 px-3 py-1 text-[11.5px] font-medium tracking-normal text-primary normal-case backdrop-blur">
              <SpaceGlyph space={skin} /> {items.length}{" "}
              {items.length === 1 ? "memory" : "memories"}
            </Badge>
            <h1 className="mt-4 font-display text-[36px] leading-[1.05] tracking-tight sm:mt-5 sm:text-[52px] md:text-[72px]">
              {space.name}
            </h1>
            {space.description && (
              <p className="mx-auto mt-3 max-w-xl text-[14px] leading-relaxed text-foreground/75 sm:mt-4 sm:text-[15px]">
                {space.description}
              </p>
            )}
          </div>
        </div>

        {space.ai_overview && (
          <Card className={`${softCard} mt-6`}>
            <CardContent className="p-5 sm:p-6">
              <div className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-wider text-primary">
                <Sparkles className="h-3.5 w-3.5 shrink-0" /> AI overview
              </div>
              <p className="mt-3 text-[14.5px] leading-relaxed text-foreground/85 sm:text-[15px]">
                {space.ai_overview}
              </p>
            </CardContent>
          </Card>
        )}

        <h2 className="mb-4 mt-7 font-display text-[24px] tracking-tight sm:text-[26px]">
          Memories
        </h2>
        {items.length ? (
          <div className="columns-1 gap-4 sm:columns-2 lg:columns-3 [column-fill:_balance]">
            {items.map((m) => (
              <div key={m.id} className="mb-4 break-inside-avoid">
                <MemoryCard m={m} readOnly />
              </div>
            ))}
          </div>
        ) : (
          <Card className="gap-0 rounded-[calc(var(--radius)+4px)] border border-dashed border-border bg-secondary/30 py-0 shadow-none ring-0">
            <CardContent className="px-6 py-12 text-center">
              <p className="text-[13px] text-muted-foreground">
                This space is published but has nothing in it yet.
              </p>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
