"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Globe, Sparkles, Users } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { toast } from "@/lib/toast";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MemoryCard } from "@/components/memory-card";
import { useStore } from "@/lib/store";
import { fadeUp, motionVariants, transition } from "@/lib/motion";
import type { SpaceData } from "@/lib/mock-data";

const tabs = ["Overview", "Memories", "Timeline", "Connections", "Ask AI", "Members"] as const;

const members = [
  { n: "Maya Aoki", r: "Owner", c: "from-amber-200 to-rose-200" },
  { n: "Liam Park", r: "Editor", c: "from-emerald-200 to-teal-200" },
  { n: "Sara Chen", r: "Viewer", c: "from-indigo-200 to-violet-200" },
];

const connections = [
  ["Second brain", "How to Take Smart Notes", "Expands"],
  ["PARA Method", "Building RecallAI", "Part of"],
  ["Lean Startup", "Business Plan Ideas", "Inspired by"],
  ["Validation sprint", "Meeting with Alex", "Related to"],
];

const plain = "rounded-xl tracking-normal normal-case";
const softCard = "card-soft gap-0 rounded-[calc(var(--radius)+4px)] py-0 shadow-none ring-0";
const tabTrigger =
  "flex-none px-3 py-3 text-[13px] font-medium tracking-normal text-muted-foreground normal-case hover:text-foreground data-active:bg-transparent data-active:text-foreground group-data-horizontal/tabs:after:inset-x-2 group-data-horizontal/tabs:after:bottom-0 group-data-horizontal/tabs:after:h-0.5 group-data-horizontal/tabs:after:rounded-full after:hidden sm:px-4";

export function SpaceTabs({ space }: { space: SpaceData }) {
  const [tab, setTab] = useState<string>("Overview");
  const reduced = useReducedMotion();
  const panelVariants = motionVariants(reduced, fadeUp);
  const { memories } = useStore();
  const items = useMemo(() => memories.slice(0, 8), [memories]);

  return (
    <Tabs value={tab} onValueChange={(value) => setTab(String(value))} className="mt-6 gap-0">
      <TabsList
        variant="line"
        aria-label="Space sections"
        className="-mx-4 h-auto w-auto justify-start gap-1 overflow-x-auto rounded-none border-b border-border bg-transparent px-4 sm:mx-0 sm:flex-wrap sm:gap-1.5 sm:px-0"
      >
        {tabs.map((t) => (
          <TabsTrigger key={t} value={t} className={tabTrigger}>
            <span className="relative">{t}</span>
            {tab === t && (
              <motion.span
                layoutId="space-tab"
                aria-hidden
                className="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-primary"
                transition={reduced ? { duration: 0 } : transition.spring}
              />
            )}
          </TabsTrigger>
        ))}
      </TabsList>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:mt-7 lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-7">
        <div className="min-w-0">
          <TabsContent
            value="Overview"
            render={<motion.div variants={panelVariants} initial="hidden" animate="show" />}
          >
            <Card className={softCard}>
              <CardContent className="p-5 sm:p-6">
                <div className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-wider text-primary">
                  <Sparkles className="h-3.5 w-3.5 shrink-0" /> AI overview
                </div>
                <p className="mt-3 text-[14.5px] leading-relaxed text-foreground/85 sm:text-[15px]">
                  This space tracks the build of RecallAI from first sketch to public beta. Recurring
                  threads: capture friction, AI summaries, sharing as a growth loop, and the philosophy
                  of a personal knowledge graph that you actually return to.
                </p>
                <div className="mt-5 flex flex-wrap gap-1.5">
                  {["product", "design", "research", "ai", "growth", "philosophy"].map((t) => (
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

            <h2 className="mt-7 mb-4 font-display text-[22px] tracking-tight sm:text-[24px]">
              Recent memories
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
            value="Timeline"
            render={<motion.div variants={panelVariants} initial="hidden" animate="show" />}
          >
            <SpaceTimeline />
          </TabsContent>

          <TabsContent
            value="Connections"
            render={<motion.div variants={panelVariants} initial="hidden" animate="show" />}
          >
            <Card className={softCard}>
              <CardContent className="p-5 sm:p-6">
                <div className="text-[12px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {space.connectionCount} connections in this space
                </div>
                <div className="mt-4 space-y-2">
                  {connections.map(([a, b, rel]) => (
                    <div
                      key={`${a}-${b}`}
                      className="flex flex-wrap items-center gap-2 rounded-2xl border border-border bg-secondary/40 px-3 py-2.5 text-[12.5px] text-foreground/85"
                    >
                      <span className="truncate font-medium">{a}</span>
                      <Badge className="rounded-full bg-primary-soft px-2 py-0.5 text-[10.5px] font-medium tracking-normal text-accent-foreground normal-case">
                        {rel}
                      </Badge>
                      <span className="truncate">{b}</span>
                    </div>
                  ))}
                </div>
                <Button
                  nativeButton={false}
                  variant="ghost"
                  render={<Link href="/connections" />}
                  className={`${plain} mt-5 h-11 gap-1.5 px-0 text-[12.5px] font-semibold text-primary hover:bg-transparent`}
                >
                  Open the connection map <ArrowUpRight className="size-3.5" />
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent
            value="Ask AI"
            render={<motion.div variants={panelVariants} initial="hidden" animate="show" />}
          >
            <AskSpace space={space} />
          </TabsContent>

          <TabsContent
            value="Members"
            render={<motion.div variants={panelVariants} initial="hidden" animate="show" />}
          >
            <Card className={softCard}>
              <CardContent className="p-5 sm:p-6">
                <div className="text-[12px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Collaborators
                </div>
                <div className="mt-4 space-y-3">
                  {members.map((p) => (
                    <div key={p.n} className="flex items-center gap-3">
                      <Avatar className="size-10 after:hidden">
                        <AvatarFallback
                          className={`rounded-full bg-linear-to-br ${p.c} text-[12px] font-semibold`}
                        >
                          {p.n.split(" ").map((x) => x[0]).join("")}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 leading-tight">
                        <div className="truncate text-[13.5px] font-medium">{p.n}</div>
                        <div className="text-[11.5px] text-muted-foreground">{p.r}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </div>

        <aside className="min-w-0 space-y-5">
          <Card className={softCard}>
            <CardContent className="p-5">
              <div className="text-[12px] font-semibold uppercase tracking-wider text-muted-foreground">
                Members
              </div>
              <div className="mt-3 space-y-2.5">
                {members.map((p) => (
                  <div key={p.n} className="flex items-center gap-3">
                    <Avatar className="size-8 after:hidden">
                      <AvatarFallback
                        className={`rounded-full bg-linear-to-br ${p.c} text-[11px] font-semibold`}
                      >
                        {p.n.split(" ").map((x) => x[0]).join("")}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 leading-tight">
                      <div className="truncate text-[13px] font-medium">{p.n}</div>
                      <div className="text-[11px] text-muted-foreground">{p.r}</div>
                    </div>
                  </div>
                ))}
              </div>
              <Button
                variant="outline"
                onClick={() => setTab("Members")}
                className={`${plain} mt-4 h-11 w-full border-dashed border-border bg-secondary/50 text-[12px] font-medium text-muted-foreground hover:text-foreground`}
              >
                + Invite collaborator
              </Button>
            </CardContent>
          </Card>

          <Card className={`${softCard} bg-linear-to-b from-white to-primary-soft`}>
            <CardContent className="p-5">
              <div className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-wider text-primary">
                <Globe className="h-3.5 w-3.5 shrink-0" /> Publish as page
              </div>
              <p className="mt-2 text-[12.5px] leading-relaxed text-muted-foreground">
                Turn this space into a beautiful public page that visitors can read, explore, or chat with.
              </p>
              <Button
                nativeButton={false}
                variant="ghost"
                render={<Link href={`/share/${space.id}`} />}
                className={`${plain} mt-3 h-11 gap-1.5 px-0 text-[12.5px] font-semibold text-primary hover:bg-transparent`}
              >
                View public page →
              </Button>
            </CardContent>
          </Card>

          <Card className={softCard}>
            <CardContent className="p-5">
              <div className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-wider text-muted-foreground">
                <Users className="h-3.5 w-3.5 shrink-0" /> Activity
              </div>
              <p className="mt-2 text-[12.5px] leading-relaxed text-muted-foreground">
                {space.memoryCount} memories · {space.connectionCount} connections · updated today.
              </p>
            </CardContent>
          </Card>
        </aside>
      </div>
    </Tabs>
  );
}

function SpaceTimeline() {
  const { memories } = useStore();
  const groups = [
    { label: "This week", items: memories.filter((m) => m.savedDays <= 7) },
    { label: "Earlier this month", items: memories.filter((m) => m.savedDays > 7 && m.savedDays <= 30) },
    { label: "Older", items: memories.filter((m) => m.savedDays > 30) },
  ].filter((g) => g.items.length > 0);

  return (
    <div className="space-y-8">
      {groups.map((g) => (
        <div key={g.label} className="relative md:pl-8">
          <div className="absolute left-0 top-2 hidden h-3 w-3 rounded-full border-4 border-white bg-primary md:block" />
          <div className="flex items-baseline gap-3">
            <h3 className="font-display text-[22px] tracking-tight">{g.label}</h3>
            <span className="text-[12px] tabular-nums text-muted-foreground">{g.items.length}</span>
          </div>
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
  );
}

function AskSpace({ space }: { space: SpaceData }) {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<string | null>(null);

  const ask = () => {
    const q = question.trim();
    if (!q) {
      toast.info("Type a question first");
      return;
    }
    setAnswer(
      `Across ${space.memoryCount} memories in ${space.title}, the throughline for “${q}” is that capture should never block on categorization — connection beats hierarchy. Three memories back this up, and two push against the timeline.`,
    );
    setQuestion("");
  };

  return (
    <Card className={softCard}>
      <CardContent className="p-5 sm:p-6">
        <div className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-wider text-primary">
          <Sparkles className="h-3.5 w-3.5 shrink-0" /> Ask about this space
        </div>
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
  );
}
