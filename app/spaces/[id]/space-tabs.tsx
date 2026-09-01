"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus } from "lucide-react";
import { Globe, Sparkles, Users } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MemoryCard } from "@/components/memory-card";
import { toMemories } from "@/lib/vault-adapter";
import { enterSelection } from "@/lib/stores/selection-store";
import { fadeUp, motionVariants, transition } from "@/lib/motion";
import type { Memory } from "@/lib/mock-data";
import type { SpaceDetail, SpaceMember } from "@/lib/types";

const tabs = ["Overview", "Memories", "Timeline", "Connections", "Ask AI", "Members"] as const;

const plain = "rounded-xl tracking-normal normal-case";
const softCard = "card-soft gap-0 rounded-[calc(var(--radius)+4px)] py-0 shadow-none ring-0";
const tabTrigger =
  "flex-none px-3 py-3 text-[13px] font-medium tracking-normal text-muted-foreground normal-case hover:text-foreground data-active:bg-transparent data-active:text-foreground group-data-horizontal/tabs:after:inset-x-2 group-data-horizontal/tabs:after:bottom-0 group-data-horizontal/tabs:after:h-0.5 group-data-horizontal/tabs:after:rounded-full after:hidden sm:px-4";

export function SpaceTabs({ space }: { space: SpaceDetail }) {
  const [tab, setTab] = useState<string>("Overview");
  const router = useRouter();
  const reduced = useReducedMotion();
  const panelVariants = motionVariants(reduced, fadeUp);
  const memories = useMemo(() => toMemories(space.items), [space.items]);
  const recent = useMemo(() => memories.slice(0, 8), [memories]);

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
            {space.ai_overview ? (
              <Card className={softCard}>
                <CardContent className="p-5 sm:p-6">
                  {/* Labelled as machine-written wherever it appears, the same way a
                      vision-derived memory body is. An account of your memories that
                      reads exactly like something you wrote is the one way this lies. */}
                  <div className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-wider text-primary">
                    <Sparkles className="h-3.5 w-3.5 shrink-0" /> AI overview
                  </div>
                  <p className="mt-3 text-[14.5px] leading-relaxed text-foreground/85 sm:text-[15px]">
                    {space.ai_overview}
                  </p>
                  {space.ai_topics.length > 0 && (
                    <div className="mt-5 flex flex-wrap gap-1.5">
                      {space.ai_topics.map((t) => (
                        <Badge
                          key={t}
                          variant="secondary"
                          className="rounded-full bg-secondary px-2.5 py-1 text-[11.5px] font-normal tracking-normal text-muted-foreground normal-case"
                        >
                          #{t}
                        </Badge>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ) : (
              <EmptyPanel
                title="No overview yet"
                body="Once this space has a few memories, Recall can read them and write a short account of what belongs here."
              />
            )}

            {recent.length > 0 && (
              <>
                <h2 className="mt-7 mb-4 font-display text-[22px] tracking-tight sm:text-[24px]">
                  Recent memories
                </h2>
                <MemoryColumns items={recent} />
              </>
            )}
          </TabsContent>

          <TabsContent
            value="Memories"
            render={<motion.div variants={panelVariants} initial="hidden" animate="show" />}
          >
            {/* Adding happens in the vault, not here: the memories to choose from are
                the whole library, and the picker for that already exists.

                Picking mode is switched on *before* navigating rather than passed as a
                query parameter. `useSearchParams` in a client component needs a Suspense
                boundary or the page opts out of static rendering, and the selection store
                is module state that survives a client-side route change anyway. */}
            {space.role !== "viewer" && (
              <Button
                variant="outline"
                onClick={() => {
                  enterSelection();
                  router.push("/vault");
                }}
                className={`${plain} mb-4 h-11 gap-2 border-dashed border-border bg-secondary/40 px-4 text-[13px] font-medium text-muted-foreground hover:text-foreground`}
              >
                <Plus className="size-4" /> Add memories from your vault
              </Button>
            )}
            {memories.length ? (
              <MemoryColumns items={memories} />
            ) : (
              <EmptyPanel
                title="Nothing in this space yet"
                body="Select a few memories in your vault and add them here — a space is a context you assemble, not a folder you file into."
              />
            )}
          </TabsContent>

          <TabsContent
            value="Timeline"
            render={<motion.div variants={panelVariants} initial="hidden" animate="show" />}
          >
            <SpaceTimeline items={memories} />
          </TabsContent>

          <TabsContent
            value="Connections"
            render={<motion.div variants={panelVariants} initial="hidden" animate="show" />}
          >
            {/* Derived from the memories' own embeddings, not stored — so until that runs
                there is nothing honest to draw. A placeholder graph here would be a
                picture of data that does not exist. */}
            <EmptyPanel
              title="Connections aren't mapped yet"
              body="Recall finds these by comparing the memories in this space to each other. Nothing has been measured for this space so far."
            />
          </TabsContent>

          <TabsContent
            value="Ask AI"
            render={<motion.div variants={panelVariants} initial="hidden" animate="show" />}
          >
            <EmptyPanel
              title="Ask isn't wired up here yet"
              body="When it is, it will answer only from the memories in this space — and say so plainly when none of them match."
            />
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
                  {space.members.map((m) => (
                    <MemberRow key={m.user_id} member={m} size="lg" />
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
                {space.members.map((m) => (
                  <MemberRow key={m.user_id} member={m} size="sm" />
                ))}
              </div>
              {space.role === "owner" && (
                <Button
                  variant="outline"
                  onClick={() => setTab("Members")}
                  className={`${plain} mt-4 h-11 w-full border-dashed border-border bg-secondary/50 text-[12px] font-medium text-muted-foreground hover:text-foreground`}
                >
                  + Invite collaborator
                </Button>
              )}
            </CardContent>
          </Card>

          {space.visibility === "public" && (
            <Card className={`${softCard} bg-linear-to-b from-white to-primary-soft`}>
              <CardContent className="p-5">
                <div className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-wider text-primary">
                  <Globe className="h-3.5 w-3.5 shrink-0" /> Published
                </div>
                <p className="mt-2 text-[12.5px] leading-relaxed text-muted-foreground">
                  Anyone with the link can read this space. Only the memory cards are
                  shared — never the full text of a memory.
                </p>
                <Button
                  nativeButton={false}
                  variant="ghost"
                  render={<Link href={`/share/${space.slug}`} />}
                  className={`${plain} mt-3 h-11 gap-1.5 px-0 text-[12.5px] font-semibold text-primary hover:bg-transparent`}
                >
                  View public page →
                </Button>
              </CardContent>
            </Card>
          )}

          <Card className={softCard}>
            <CardContent className="p-5">
              <div className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-wider text-muted-foreground">
                <Users className="h-3.5 w-3.5 shrink-0" /> Activity
              </div>
              <p className="mt-2 text-[12.5px] leading-relaxed tabular-nums text-muted-foreground">
                {space.memory_count} {space.memory_count === 1 ? "memory" : "memories"} ·{" "}
                {space.member_count} {space.member_count === 1 ? "member" : "members"}
              </p>
            </CardContent>
          </Card>
        </aside>
      </div>
    </Tabs>
  );
}

function MemoryColumns({ items }: { items: Memory[] }) {
  return (
    <div className="columns-1 gap-4 sm:columns-2 [column-fill:_balance]">
      {items.map((m) => (
        <div key={m.id} className="mb-4 break-inside-avoid">
          <MemoryCard m={m} />
        </div>
      ))}
    </div>
  );
}

function EmptyPanel({ title, body }: { title: string; body: string }) {
  return (
    <Card className="gap-0 rounded-[calc(var(--radius)+4px)] border border-dashed border-border bg-secondary/30 py-0 shadow-none ring-0">
      <CardContent className="px-6 py-12 text-center">
        <h3 className="font-display text-[20px] tracking-tight">{title}</h3>
        <p className="mx-auto mt-1.5 max-w-md text-[13px] leading-relaxed text-muted-foreground">
          {body}
        </p>
      </CardContent>
    </Card>
  );
}

/** Initials from a display name, or a neutral mark when the account has none. */
function initials(name: string | null): string {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean).slice(0, 2);
  return parts.length ? parts.map((p) => p[0]!.toUpperCase()).join("") : "·";
}

function MemberRow({ member, size }: { member: SpaceMember; size: "sm" | "lg" }) {
  const big = size === "lg";
  return (
    <div className="flex items-center gap-3">
      <Avatar className={`${big ? "size-10" : "size-8"} after:hidden`}>
        {member.avatar_url && <AvatarImage src={member.avatar_url} alt="" />}
        <AvatarFallback
          className={`rounded-full bg-linear-to-br from-indigo-200 to-violet-200 ${
            big ? "text-[12px]" : "text-[11px]"
          } font-semibold`}
        >
          {initials(member.name)}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 leading-tight">
        <div className={`truncate ${big ? "text-[13.5px]" : "text-[13px]"} font-medium`}>
          {/* Never an email address: a space puts people who may not know each other in
              one list, and the API deliberately does not send one. */}
          {member.name ?? "Someone at Recall"}
        </div>
        <div className={`${big ? "text-[11.5px]" : "text-[11px]"} capitalize text-muted-foreground`}>
          {member.role}
        </div>
      </div>
    </div>
  );
}

function SpaceTimeline({ items }: { items: Memory[] }) {
  const groups = [
    { label: "This week", items: items.filter((m) => m.savedDays <= 7) },
    {
      label: "Earlier this month",
      items: items.filter((m) => m.savedDays > 7 && m.savedDays <= 30),
    },
    { label: "Older", items: items.filter((m) => m.savedDays > 30) },
  ].filter((g) => g.items.length > 0);

  if (!groups.length) {
    return (
      <EmptyPanel
        title="Nothing on the timeline"
        body="Memories appear here in the order you saved them, once this space has some."
      />
    );
  }

  return (
    <div className="space-y-8">
      {groups.map((g) => (
        <div key={g.label} className="relative md:pl-8">
          <div className="absolute left-0 top-2 hidden h-3 w-3 rounded-full border-4 border-white bg-primary md:block" />
          <div className="flex items-baseline gap-3">
            <h3 className="font-display text-[22px] tracking-tight">{g.label}</h3>
            <span className="text-[12px] tabular-nums text-muted-foreground">
              {g.items.length}
            </span>
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
