"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Copy, Globe, Sparkles } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MemoryCard } from "@/components/memory-card";
import { useStore } from "@/lib/store";
import { fadeUp, motionVariants, transition } from "@/lib/motion";
import type { SpaceData } from "@/lib/mock-data";

const tabs = ["Overview", "Topics", "Timeline", "Memories", "Connections", "Ask AI"] as const;

const topics = ["second brain", "validation", "spaces", "AI", "writing", "growth", "design"];
const featured = [
  ["Second brain", "How to Take Smart Notes"],
  ["PARA Method", "Building RecallAI"],
  ["Lean Startup", "Business Plan Ideas"],
];

const plain = "rounded-xl tracking-normal normal-case";
const softCard = "card-soft gap-0 rounded-[calc(var(--radius)+4px)] py-0 shadow-none ring-0";
const tabTrigger =
  "flex-none px-3 py-3 text-[13px] font-medium tracking-normal text-muted-foreground normal-case hover:text-foreground data-active:bg-transparent data-active:text-foreground group-data-horizontal/tabs:after:inset-x-2 group-data-horizontal/tabs:after:bottom-0 group-data-horizontal/tabs:after:h-0.5 group-data-horizontal/tabs:after:rounded-full after:hidden sm:px-4";

export function PublicSpaceView({ space }: { space: SpaceData }) {
  const { memories } = useStore();
  const [tab, setTab] = useState<string>("Overview");
  const reduced = useReducedMotion();
  const panelVariants = motionVariants(reduced, fadeUp);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<string | null>(null);

  const items = memories.slice(0, 9);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast.success("Link copied", { description: `${space.title} · public page` });
    } catch {
      toast.info("Couldn't copy automatically");
    }
  };

  const ask = () => {
    const q = question.trim();
    if (!q) {
      toast.info("Type a question first");
      return;
    }
    setAnswer(
      `“${q}” — across this space the recurring answer is that capture should never block on categorization. ${space.memoryCount} memories back it up, and the strongest source is “${items[0]?.title ?? "the first memory"}”.`,
    );
    setQuestion("");
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
              className={`${plain} h-10 gap-1.5 border-border bg-card px-3 text-[12.5px] font-medium text-foreground/80 hover:bg-secondary`}
            >
              <Copy className="size-3.5" />
              <span className="hidden sm:inline">Duplicate as template</span>
              <span className="sm:hidden">Copy</span>
            </Button>
            <Button
              nativeButton={false}
              render={<Link href="/" />}
              className={`${plain} h-10 gap-1.5 gradient-primary px-3.5 text-[12.5px] font-semibold text-white hover:bg-transparent`}
            >
              Sign up <ArrowUpRight className="size-3.5" />
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
        <div className={`relative overflow-hidden rounded-[24px] border border-border bg-linear-to-br p-6 sm:rounded-[32px] sm:p-10 md:p-14 ${space.gradient}`}>
          <div className="absolute inset-0 grid-dots opacity-50" />
          <div className="relative mx-auto max-w-3xl text-center">
            <Badge className="gap-1.5 rounded-full bg-white/85 px-3 py-1 text-[11.5px] font-medium tracking-normal text-primary normal-case backdrop-blur">
              <span>{space.emoji}</span> by Maya Aoki · {space.memoryCount} memories
            </Badge>
            <h1 className="mt-4 font-display text-[36px] leading-[1.05] tracking-tight sm:mt-5 sm:text-[52px] md:text-[72px]">
              {space.title}
            </h1>
            <p className="mx-auto mt-3 max-w-xl text-[14px] leading-relaxed text-foreground/75 sm:mt-4 sm:text-[15px]">
              {space.summary}
            </p>
            <div className="mt-5 flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5 text-[12.5px] text-foreground/70 sm:mt-6">
              <span className="tabular-nums">{space.connectionCount} connections</span>
              <span aria-hidden="true">·</span>
              <span>~18 min read</span>
              <span aria-hidden="true">·</span>
              <span>Updated today</span>
            </div>
          </div>
        </div>

        <Tabs value={tab} onValueChange={(value) => setTab(String(value))} className="mt-6 gap-0">
          <TabsList
            variant="line"
            aria-label="Space sections"
            className="sticky top-0 z-20 -mx-4 h-auto w-auto justify-start gap-1 overflow-x-auto rounded-none border-b border-border bg-background/90 px-4 backdrop-blur sm:-mx-6 sm:px-6"
          >
            {tabs.map((t) => (
              <TabsTrigger key={t} value={t} className={tabTrigger}>
                <span className="relative">{t}</span>
                {tab === t && (
                  <motion.span
                    layoutId="public-tab"
                    aria-hidden
                    className="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-primary"
                    transition={reduced ? { duration: 0 } : transition.spring}
                  />
                )}
              </TabsTrigger>
            ))}
          </TabsList>

          <section className="mt-7 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-7">
            <div className="min-w-0">
              <TabsContent
            value="Overview"
            render={<motion.div variants={panelVariants} initial="hidden" animate="show" />}
          >
                <Card className={softCard}>
                  <CardContent className="p-5 sm:p-6">
                    <div className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-wider text-primary">
                      <Sparkles className="h-3.5 w-3.5 shrink-0" /> AI summary of this space
                    </div>
                    <p className="mt-3 text-[14.5px] leading-relaxed text-foreground/85 sm:text-[15px]">
                      {space.summary} A throughline appears: capture should never block on
                      categorization, and connection beats hierarchy. The space pairs founder-grade
                      business notes with method-level PKM thinking.
                    </p>
                    <div className="mt-5 flex flex-wrap gap-1.5">
                      {["product", "PKM", "research", "founder", "design"].map((t) => (
                        <Badge
                          key={t}
                          variant="secondary"
                          className="rounded-full bg-secondary px-2.5 py-1 text-[11.5px] font-normal tracking-normal text-muted-foreground normal-case"
                        >
                          #{t}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <h2 className="mb-4 mt-7 font-display text-[24px] tracking-tight sm:text-[26px]">
                  Memories
                </h2>
                <div className="columns-1 gap-4 sm:columns-2 [column-fill:_balance]">
                  {items.map((m) => (
                    <div key={m.id} className="mb-4 break-inside-avoid">
                      <MemoryCard m={m} />
                    </div>
                  ))}
                </div>
              </TabsContent>

              <TabsContent
            value="Memories"
            render={<motion.div variants={panelVariants} initial="hidden" animate="show" />}
          >
                <div className="columns-1 gap-4 sm:columns-2 [column-fill:_balance]">
                  {memories.map((m) => (
                    <div key={m.id} className="mb-4 break-inside-avoid">
                      <MemoryCard m={m} />
                    </div>
                  ))}
                </div>
              </TabsContent>

              <TabsContent
            value="Topics"
            render={<motion.div variants={panelVariants} initial="hidden" animate="show" />}
          >
                <Card className={softCard}>
                  <CardContent className="p-5 sm:p-6">
                    <div className="text-[12px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Topics in this space
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {topics.map((t) => (
                        <Badge
                          key={t}
                          variant="outline"
                          className="rounded-full border border-border bg-card px-3 py-1.5 text-[12.5px] font-normal tracking-normal text-foreground/80 normal-case"
                        >
                          {t}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent
            value="Timeline"
            render={<motion.div variants={panelVariants} initial="hidden" animate="show" />}
          >
                <div className="space-y-6">
                  {[
                    { label: "This week", items: memories.filter((m) => m.savedDays <= 7) },
                    { label: "Earlier", items: memories.filter((m) => m.savedDays > 7) },
                  ]
                    .filter((g) => g.items.length)
                    .map((g) => (
                      <div key={g.label}>
                        <h3 className="font-display text-[22px] tracking-tight">{g.label}</h3>
                        <div className="mt-3 columns-1 gap-4 sm:columns-2 [column-fill:_balance]">
                          {g.items.map((m) => (
                            <div key={m.id} className="mb-4 break-inside-avoid">
                              <MemoryCard m={m} compact />
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                </div>
              </TabsContent>

              <TabsContent
            value="Connections"
            render={<motion.div variants={panelVariants} initial="hidden" animate="show" />}
          >
                <Card className={softCard}>
                  <CardContent className="p-5 sm:p-6">
                    <div className="text-[12px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Featured connections
                    </div>
                    <div className="mt-4 space-y-2 text-[12.5px]">
                      {featured.map(([a, b]) => (
                        <div
                          key={a}
                          className="flex items-center gap-2 rounded-xl border border-border bg-secondary/40 px-3 py-2.5 text-foreground/80"
                        >
                          <span className="truncate">{a}</span>
                          <span className="shrink-0 text-primary">↔</span>
                          <span className="truncate">{b}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent
            value="Ask AI"
            render={<motion.div variants={panelVariants} initial="hidden" animate="show" />}
          >
                <Card className={softCard}>
                  <CardContent className="p-5 sm:p-6">
                    <div className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-wider text-primary">
                      <Sparkles className="h-3.5 w-3.5 shrink-0" /> Ask about this space
                    </div>
                    <p className="mt-2 text-[12.5px] leading-relaxed text-muted-foreground">
                      Anyone reading this can chat with Recall — no account needed.
                    </p>
                    {answer && (
                      <p className="mt-4 rounded-2xl border border-border bg-secondary/40 p-4 text-[14px] leading-relaxed text-foreground/85">
                        {answer}
                      </p>
                    )}
                    <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                      <Input
                        value={question}
                        onChange={(e) => setQuestion(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && ask()}
                        aria-label={`Ask about ${space.title}`}
                        placeholder="What's the core idea here?"
                        className="h-11 rounded-xl border border-border bg-secondary/50 px-3 text-[14px] focus-visible:border-primary/40 focus-visible:bg-white focus-visible:ring-4 focus-visible:ring-primary/10"
                      />
                      <Button
                        onClick={ask}
                        className={`${plain} h-11 shrink-0 gradient-primary px-4 text-[13.5px] font-semibold text-white hover:bg-transparent`}
                      >
                        Ask Recall
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </div>

            <aside className="min-w-0 space-y-5 lg:sticky lg:top-24 lg:self-start">
              <Card className={`${softCard} bg-linear-to-b from-white to-primary-soft`}>
                <CardContent className="p-5">
                  <div className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-wider text-primary">
                    <Sparkles className="h-3.5 w-3.5 shrink-0" /> Ask AI about this space
                  </div>
                  <p className="mt-2 text-[12.5px] leading-relaxed text-muted-foreground">
                    No account needed — Recall answers from the memories in this space.
                  </p>
                  <Button
                    onClick={() => setTab("Ask AI")}
                    className={`${plain} mt-3 h-11 w-full gradient-primary text-[12.5px] font-semibold text-white hover:bg-transparent`}
                  >
                    Ask a question
                  </Button>
                </CardContent>
              </Card>
              <Card className={softCard}>
                <CardContent className="p-5">
                  <div className="text-[12px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Topics
                  </div>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {topics.map((t) => (
                      <Button
                        key={t}
                        variant="outline"
                        onClick={() => setTab("Topics")}
                        className={`${plain} h-auto rounded-full border-border bg-card px-2.5 py-1 text-[11.5px] font-normal text-foreground/80 hover:border-primary/30 hover:bg-primary-soft`}
                      >
                        {t}
                      </Button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </aside>
          </section>
        </Tabs>

        <Card className={`${softCard} mt-14 border border-border bg-linear-to-b from-white to-primary-soft sm:mt-16`}>
          <CardContent className="p-7 text-center sm:p-10">
            <div className="font-display text-[26px] tracking-tight sm:text-[32px]">
              Start your own second brain
            </div>
            <p className="mx-auto mt-2 max-w-md text-[13.5px] leading-relaxed text-muted-foreground">
              Capture anything you don&rsquo;t want to forget — and turn it into spaces like this one.
            </p>
            <Button
              nativeButton={false}
              render={<Link href="/" />}
              className={`${plain} mt-5 h-12 gap-2 gradient-primary px-5 text-[14px] font-semibold text-white hover:bg-transparent`}
            >
              Try RecallAI free <ArrowUpRight className="size-4" />
            </Button>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
