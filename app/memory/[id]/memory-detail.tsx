"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Sparkles,
  Share2,
  Bookmark,
  Archive,
  Copy,
  Network,
  ArrowUpRight,
  Clock,
  Tag,
  MessageSquare,
  Search,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { MemoryCard, ConnectChip } from "@/components/memory-card";
import { useCapture } from "@/components/capture-sheet";
import { toggleFavorite, useStore } from "@/lib/store";
import { kindMeta } from "@/lib/mock-data";

const suggestions = [
  "Inspired by · How to Take Smart Notes",
  "Related to · PARA Method",
  "Expands · Business Plan Ideas",
];

const plain = "rounded-xl tracking-normal normal-case";
const softCard = "card-soft gap-0 rounded-[calc(var(--radius)+4px)] py-0 shadow-none ring-0";

export function MemoryDetail({ id }: { id: string }) {
  const { memories, favorites, hydrated } = useStore();
  const memory = memories.find((m) => m.id === id);
  const capture = useCapture();
  const [connected, setConnected] = useState(false);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<string | null>(null);

  if (!memory) {
    return (
      <Card className={`mx-auto max-w-md gap-0 rounded-3xl border border-dashed border-border bg-secondary/30 py-0 shadow-none ring-0`}>
        <CardContent className="px-6 py-16 text-center">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-primary-soft text-primary">
            <Search className="h-5 w-5" />
          </div>
          <h1 className="mt-4 font-display text-[26px] tracking-tight">
            {hydrated ? "Memory not found" : "Looking for that memory…"}
          </h1>
          <p className="mt-2 text-[13.5px] leading-relaxed text-muted-foreground">
            {hydrated
              ? "This memory may have been removed, or the link is out of date."
              : "One moment while your vault loads."}
          </p>
          {hydrated && (
            <div className="mt-6 flex flex-wrap justify-center gap-2">
              <Button
                nativeButton={false}
                render={<Link href="/vault" />}
                className={`${plain} h-11 gradient-primary px-4 text-[13.5px] font-semibold text-white hover:bg-transparent`}
              >
                Back to vault
              </Button>
              <Button
                variant="outline"
                onClick={() => capture.open()}
                className={`${plain} h-11 border-border bg-card px-4 text-[13.5px] font-medium text-foreground/80`}
              >
                Capture something new
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  const related = memories.filter((m) => m.id !== memory.id).slice(0, 6);
  const meta = kindMeta[memory.kind];
  const favorited = favorites.includes(memory.id);

  const actions = [
    {
      i: Network,
      l: "Connect",
      run: () => {
        setConnected(true);
        toast.success("Connected", { description: `${memory.title} linked to 3 memories.` });
      },
    },
    {
      i: Share2,
      l: "Share",
      run: async () => {
        try {
          await navigator.clipboard.writeText(`${window.location.origin}/memory/${memory.id}`);
          toast.success("Link copied", { description: memory.title });
        } catch {
          toast.info("Couldn't copy automatically");
        }
      },
    },
    {
      i: Copy,
      l: "Duplicate",
      run: () =>
        toast.success("Duplicated", { description: `A copy of ${memory.title} is in your inbox.` }),
    },
    {
      i: Bookmark,
      l: favorited ? "Saved" : "Save",
      run: () => {
        const next = toggleFavorite(memory.id);
        const fn = next ? toast.success : toast.info;
        fn(next ? "Added to favorites" : "Removed from favorites", { description: memory.title });
      },
    },
    {
      i: Archive,
      l: "Archive",
      run: () => toast.info("Archived", { description: "Hidden from the vault, still searchable." }),
    },
  ];

  const ask = () => {
    const q = question.trim();
    if (!q) {
      toast.info("Type a question first");
      return;
    }
    setAnswer(
      `On “${q}”: this memory argues that capture should stay cheap and organization lazy. It connects to ${related[0]?.title ?? "your other notes"} and reinforces the idea that retrieval, not storage, is the real test.`,
    );
    setQuestion("");
  };

  return (
    <>
      <Breadcrumb className="mb-5">
        <BreadcrumbList className="gap-2 text-[12.5px] tracking-normal normal-case sm:gap-2">
          <BreadcrumbItem>
            <BreadcrumbLink render={<Link href="/vault" />} className="hover:text-foreground">
              Vault
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator>/</BreadcrumbSeparator>
          <BreadcrumbItem>{memory.space}</BreadcrumbItem>
          <BreadcrumbSeparator>/</BreadcrumbSeparator>
          <BreadcrumbItem>
            <BreadcrumbPage className="max-w-[16rem] truncate text-foreground">
              {memory.title}
            </BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="grid grid-cols-1 gap-7 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-8">
        <article className="min-w-0">
          <div className={`relative h-44 overflow-hidden rounded-[24px] border border-border bg-linear-to-br sm:h-60 sm:rounded-[28px] md:h-72 ${memory.accent}`}>
            <div className="absolute inset-0 grid-dots opacity-60" />
            <Badge className="absolute left-4 top-4 max-w-[calc(100%-2rem)] gap-2 rounded-full border border-white/80 bg-white/85 px-3 py-1.5 text-[12px] font-medium tracking-normal normal-case backdrop-blur sm:left-6 sm:top-6">
              <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${meta.dot}`} /> {meta.label}
              <span className="truncate text-muted-foreground">· {memory.source}</span>
            </Badge>
          </div>

          <div className="mt-6 flex flex-col gap-4 sm:mt-7">
            <div className="min-w-0">
              <h1 className="font-display text-[30px] leading-[1.1] tracking-tight sm:text-[40px] md:text-[52px]">
                {memory.title}
              </h1>
              <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1.5 text-[12.5px] text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 shrink-0" /> Saved {memory.savedAt}
                </span>
                <span aria-hidden="true">·</span>
                <span className="inline-flex items-center gap-1.5">
                  <Tag className="h-3.5 w-3.5 shrink-0" /> {memory.tags.join(", ")}
                </span>
                <span aria-hidden="true">·</span>
                <span>In {memory.space}</span>
              </div>
            </div>
            <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0 sm:pb-0">
              {actions.map((a) => (
                <Button
                  key={a.l}
                  variant="outline"
                  onClick={a.run}
                  className={`${plain} h-10 shrink-0 gap-1.5 border-border bg-card px-3 text-[12.5px] font-medium text-foreground/80 hover:bg-secondary`}
                >
                  <a.i className="size-3.5" /> {a.l}
                </Button>
              ))}
            </div>
          </div>

          <Card className={`${softCard} mt-6 sm:mt-7`}>
            <CardContent className="p-5 sm:p-6">
              <div className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-wider text-primary">
                <Sparkles className="h-3.5 w-3.5 shrink-0" /> AI summary
              </div>
              <p className="mt-3 text-[14.5px] leading-relaxed text-foreground/85 sm:text-[15px]">
                {memory.summary} RecallAI distilled this into a focused note and linked it to your
                ongoing thinking in <span className="font-medium text-foreground">{memory.space}</span>.
                The core idea: capture cheaply, organize lazily, retrieve precisely.
              </p>

              <div className="mt-5 grid gap-3 md:grid-cols-2">
                {[
                  "Capture should never require choosing a folder first.",
                  "Atomic, well-named notes outperform deep hierarchies.",
                  "Connections matter more than categories.",
                  "Retrieval is the real test of a knowledge system.",
                ].map((t) => (
                  <div key={t} className="flex gap-2.5 rounded-2xl border border-border bg-secondary/40 p-3.5">
                    <div className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                    <p className="text-[13px] leading-relaxed text-foreground/80">{t}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="mt-6 space-y-3 text-[15px] leading-relaxed text-foreground/85 sm:text-[16px]">
            <h2 className="font-display text-[22px] sm:text-[24px]">Full content</h2>
            <p>
              The promise of a second brain is not storage — it&rsquo;s leverage. Every captured
              fragment is a future hand-off to a smarter version of you. RecallAI&rsquo;s job is to
              keep the friction near zero on the way in, and make the way out feel like
              remembering, not searching.
            </p>
            <p>
              The deeper the network of memories becomes, the more useful each new capture is. A
              single article saved today might attach itself to a meeting note from last spring, a
              voice memo from a walk, and an idea you forgot you had — all without you doing any
              filing.
            </p>
          </div>
        </article>

        <aside className="min-w-0 space-y-5 lg:sticky lg:top-32 lg:self-start">
          <Card className={softCard}>
            <CardContent className="p-5">
              <div className="flex items-center justify-between gap-2">
                <div className="text-[12px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Suggested connections
                </div>
                <Button
                  nativeButton={false}
                  variant="ghost"
                  render={<Link href="/connections" />}
                  className={`${plain} h-11 px-1 text-[11.5px] font-medium text-primary hover:bg-transparent`}
                >
                  See all
                </Button>
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {suggestions.map((s) => (
                  <ConnectChip key={s} label={s} />
                ))}
              </div>

              {connected ? (
                <p className="mt-5 rounded-xl bg-primary-soft px-3 py-2.5 text-[12.5px] font-medium text-accent-foreground">
                  Connected to 3 memories.
                </p>
              ) : (
                <div className="mt-5 flex items-center gap-2">
                  <Button
                    onClick={() => {
                      setConnected(true);
                      toast.success("Connected", { description: "3 memories linked." });
                    }}
                    className={`${plain} h-11 flex-1 gradient-primary px-3 text-[12.5px] font-semibold text-white hover:bg-transparent`}
                  >
                    Yes, connect
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => toast.info("Dismissed for now")}
                    className={`${plain} h-11 border-border bg-card px-3 text-[12.5px] font-medium text-foreground/80`}
                  >
                    Not now
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className={softCard}>
            <CardContent className="p-5">
              <div className="text-[12px] font-semibold uppercase tracking-wider text-muted-foreground">
                Ask about this memory
              </div>
              {answer && (
                <p className="mt-3 rounded-xl bg-secondary/50 p-3 text-[12.5px] leading-relaxed text-foreground/85">
                  {answer}
                </p>
              )}
              <div className="mt-3 flex items-center gap-2 rounded-xl border border-border bg-secondary/50 px-3">
                <MessageSquare className="h-3.5 w-3.5 shrink-0 text-primary" />
                <Input
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && ask()}
                  aria-label="Ask about this memory"
                  className="h-11 min-w-0 border-transparent px-0 text-[12.5px] focus-visible:border-transparent"
                  placeholder="Summarize the key argument…"
                />
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={ask}
                  aria-label="Ask Recall"
                  className={`${plain} size-10 shrink-0 text-muted-foreground hover:bg-white hover:text-primary`}
                >
                  <ArrowUpRight className="size-3.5" />
                </Button>
              </div>
            </CardContent>
          </Card>

          <div>
            <div className="mb-3 text-[12px] font-semibold uppercase tracking-wider text-muted-foreground">
              Related memories
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-1">
              {related.slice(0, 3).map((m) => (
                <MemoryCard key={m.id} m={m} compact />
              ))}
            </div>
          </div>
        </aside>
      </div>
    </>
  );
}
