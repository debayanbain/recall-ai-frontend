"use client";

import { useRef, useState } from "react";
import { ArrowUpRight, Mic, Paperclip, Sparkles } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { toast } from "@/lib/toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { MemoryCard } from "@/components/memory-card";
import { useStore } from "@/lib/store";
import type { Memory } from "@/lib/mock-data";
import { fadeUp, motionVariants, scaleIn } from "@/lib/motion";

const examples = [
  "Where did I save the SaaS pricing idea?",
  "Show me everything about Japan.",
  "What did I learn about FastAPI?",
  "Summarize my notes on second brain methods.",
];

type Message =
  | { id: number; role: "user"; text: string }
  | { id: number; role: "assistant"; text: string; matches: Memory[]; spaces: string[] };

const stopWords = new Set([
  "the", "a", "an", "and", "or", "of", "to", "in", "on", "for", "about", "what", "where",
  "did", "do", "i", "my", "me", "show", "everything", "save", "saved", "learn", "learned",
  "summarize", "notes", "note", "is", "was", "it",
]);

function search(memories: Memory[], query: string) {
  const terms = query
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 2 && !stopWords.has(t));
  if (terms.length === 0) return memories.slice(0, 3);

  return memories
    .map((m) => {
      const haystack = `${m.title} ${m.summary} ${m.tags.join(" ")} ${m.space ?? ""} ${m.source}`.toLowerCase();
      const score = terms.reduce((total, t) => (haystack.includes(t) ? total + 1 : total), 0);
      return { m, score };
    })
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((r) => r.m);
}

const plain = "rounded-xl tracking-normal normal-case";
const softCard = "card-soft gap-0 rounded-[calc(var(--radius)+4px)] py-0 shadow-none ring-0";
const sourceBadge =
  "rounded-full bg-secondary px-2.5 py-1 text-[11px] font-normal tracking-normal text-muted-foreground normal-case";

export function ChatView() {
  const { memories } = useStore();
  const [messages, setMessages] = useState<Message[]>([]);
  const [value, setValue] = useState("");
  const nextId = useRef(1);
  const reduced = useReducedMotion();
  const bubbleVariants = motionVariants(reduced, fadeUp);
  const emptyVariants = motionVariants(reduced, scaleIn);

  const send = (raw?: string) => {
    const text = (raw ?? value).trim();
    if (!text) {
      toast.info("Ask something first");
      return;
    }
    const matches = search(memories, text);
    const spaces = [...new Set(matches.map((m) => m.space).filter(Boolean))] as string[];
    const answer: Message = {
      id: nextId.current++,
      role: "assistant",
      matches,
      spaces,
      text: matches.length
        ? `Found ${matches.length} ${matches.length === 1 ? "memory" : "memories"} that answer this. The closest is “${matches[0].title}” — saved ${matches[0].savedAt} from ${matches[0].source}. ${
            matches.length > 1 ? `It connects to ${matches.length - 1} more in your vault.` : ""
          }`
        : "Nothing in your vault matches that yet. Capture it and Recall will connect it to what you already know.",
    };
    setMessages((current) => [...current, { id: nextId.current++, role: "user", text }, answer]);
    setValue("");
  };

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-7">
      <div className="flex min-w-0 flex-col gap-4 sm:gap-5">
        {messages.length === 0 && (
          <motion.div variants={emptyVariants} initial="hidden" animate="show">
          <Card className={softCard}>
            <CardContent className="p-5 sm:p-6">
              <div className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-wider text-primary">
                <Sparkles className="h-3.5 w-3.5 shrink-0" /> Recall is ready
              </div>
              <p className="mt-3 text-[14.5px] leading-relaxed text-foreground/85">
                Ask in plain language. Recall searches every memory you have captured — titles,
                summaries, tags and spaces — and answers with the sources it used.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {examples.slice(0, 2).map((e) => (
                  <Button
                    key={e}
                    variant="outline"
                    onClick={() => send(e)}
                    className={`${plain} h-11 rounded-full border-border bg-card px-4 text-[12.5px] font-medium text-foreground/80 hover:border-primary/30 hover:bg-primary-soft`}
                  >
                    {e}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
          </motion.div>
        )}

        <AnimatePresence initial={false}>
        {messages.map((m) =>
          m.role === "user" ? (
            <motion.div
              key={m.id}
              variants={bubbleVariants}
              initial="hidden"
              animate="show"
              exit="exit"
              className="ml-auto max-w-[85%] rounded-2xl rounded-tr-md gradient-primary px-4 py-3 text-[14px] text-white shadow-[0_8px_24px_-12px_oklch(0.55_0.19_285/0.6)] sm:max-w-xl"
            >
              {m.text}
            </motion.div>
          ) : (
            <motion.div key={m.id} variants={bubbleVariants} initial="hidden" animate="show" exit="exit">
            <Card className={softCard}>
              <CardContent className="p-5 sm:p-6">
                <div className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-wider text-primary">
                  <Sparkles className="h-3.5 w-3.5 shrink-0" /> Recall · {m.matches.length} matched
                </div>
                <p className="mt-3 text-[14px] leading-relaxed text-foreground/85 sm:text-[14.5px]">
                  {m.text}
                </p>
                {m.matches.length > 0 && (
                  <div className="mt-5 grid gap-3 sm:grid-cols-2">
                    {m.matches.map((mem) => (
                      <MemoryCard key={mem.id} m={mem} compact />
                    ))}
                  </div>
                )}
                {m.spaces.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-1.5">
                    <Badge variant="secondary" className={sourceBadge}>
                      From: {m.spaces.join(", ")}
                    </Badge>
                    <Badge variant="secondary" className={sourceBadge}>
                      Confidence: {m.matches.length > 1 ? "high" : "medium"}
                    </Badge>
                  </div>
                )}
              </CardContent>
            </Card>
            </motion.div>
          ),
        )}
        </AnimatePresence>

        <Card
          className={`${softCard} sticky bottom-[calc(env(safe-area-inset-bottom)+4.5rem)] border border-border bg-card shadow-[0_20px_50px_-20px_oklch(0.55_0.19_285/0.35)] lg:bottom-4`}
        >
          <CardContent className="flex items-center gap-1.5 p-2 sm:gap-2 sm:px-3 sm:py-2">
            <Sparkles className="hidden h-4 w-4 shrink-0 text-primary sm:block" />
            <Input
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
              aria-label="Ask anything about your memories"
              className="h-11 min-w-0 border-transparent px-1.5 text-[15px] focus-visible:border-transparent sm:h-9 sm:text-[14px]"
              placeholder="Ask anything about your memories…"
            />
            <Button
              variant="ghost"
              size="icon"
              onClick={() => toast.info("Attachments coming soon")}
              aria-label="Attach a file"
              className={`${plain} hidden text-muted-foreground hover:bg-secondary sm:inline-flex`}
            >
              <Paperclip className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() =>
                toast.info("Hold to record", { description: "Voice search is on the roadmap." })
              }
              aria-label="Ask by voice"
              className={`${plain} hidden text-muted-foreground hover:bg-secondary sm:inline-flex`}
            >
              <Mic className="size-4" />
            </Button>
            <Button
              onClick={() => send()}
              className={`${plain} h-11 shrink-0 gap-1 gradient-primary px-3.5 text-[13px] font-semibold text-white hover:bg-transparent sm:h-9`}
            >
              Ask <ArrowUpRight className="size-3.5" />
            </Button>
          </CardContent>
        </Card>
      </div>

      <aside className="min-w-0 space-y-5">
        <Card className={softCard}>
          <CardContent className="p-5">
            <div className="text-[12px] font-semibold uppercase tracking-wider text-muted-foreground">
              Try asking
            </div>
            <div className="mt-3 flex flex-col gap-2">
              {examples.map((e) => (
                <Button
                  key={e}
                  variant="outline"
                  onClick={() => send(e)}
                  className={`${plain} h-auto min-h-11 justify-start border-border bg-card px-3 py-2 text-left text-[13px] font-normal text-foreground/85 hover:border-primary/30 hover:bg-primary-soft`}
                >
                  <span className="whitespace-normal">{e}</span>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
        <Card className={`${softCard} bg-linear-to-b from-white to-primary-soft`}>
          <CardContent className="p-5">
            <div className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-wider text-primary">
              <Sparkles className="h-3.5 w-3.5 shrink-0" /> Recall remembers context
            </div>
            <p className="mt-2 text-[12.5px] leading-relaxed text-muted-foreground">
              The longer you use Recall, the better the answers. Every captured memory becomes a
              source the assistant can quote.
            </p>
          </CardContent>
        </Card>
      </aside>
    </div>
  );
}
