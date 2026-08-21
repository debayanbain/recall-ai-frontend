"use client";

import { useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Check, Mic, Paperclip, Plus, Send, Sparkles } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { addMemory, removeMemory } from "@/lib/store";
import { fadeUp, motionVariants } from "@/lib/motion";

type Bubble =
  | { id: number; from: "bot" | "user"; text: string }
  | { id: number; from: "bot"; saved: { title: string; summary: string; tags: string[]; id: string } };

const seed: Bubble[] = [
  { id: 1, from: "bot", text: "Hey Maya 👋 send me anything you want to remember." },
  { id: 2, from: "user", text: "I just had an idea." },
  { id: 3, from: "bot", text: "Tell me." },
];

const plain = "rounded-xl tracking-normal normal-case";

export function TelegramChat() {
  const [bubbles, setBubbles] = useState<Bubble[]>(seed);
  const [value, setValue] = useState("");
  const nextId = useRef(100);
  const router = useRouter();

  const send = () => {
    const text = value.trim();
    if (!text) return;
    const memory = addMemory({ title: text, kind: "note", source: "Telegram · @recallai_bot" });
    setBubbles((current) => [
      ...current,
      { id: nextId.current++, from: "user", text },
      {
        id: nextId.current++,
        from: "bot",
        saved: {
          id: memory.id,
          title: memory.title,
          summary: memory.summary,
          tags: memory.tags.map((t) => `#${t}`),
        },
      },
    ]);
    setValue("");
    toast.success("Saved from Telegram", {
      description: memory.title,
      action: { label: "Undo", onClick: () => removeMemory(memory.id) },
    });
  };

  return (
    <Card className="mx-auto w-full max-w-md gap-0 overflow-hidden rounded-[28px] border border-border bg-card py-0 shadow-[0_30px_80px_-30px_oklch(0.55_0.19_285/0.4)] ring-0 sm:rounded-[36px]">
      <CardContent className="flex items-center gap-3 bg-linear-to-b from-primary-soft to-white px-4 py-3.5 sm:px-5">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full gradient-primary text-white">
          <Sparkles className="h-4 w-4" />
        </div>
        <div className="leading-tight">
          <div className="text-[14px] font-semibold">Recall bot</div>
          <div className="text-[11px] text-emerald-600">online · saves in 2s</div>
        </div>
      </CardContent>
      <Separator />

      <CardContent className="max-h-[55dvh] space-y-3 overflow-y-auto overscroll-contain bg-secondary/40 p-4 sm:max-h-none">
        <AnimatePresence initial={false}>
        {bubbles.map((b) =>
          "saved" in b ? (
            <Msg key={b.id} from="bot" rich>
              <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-primary">
                <Check className="h-3 w-3 shrink-0" /> Saved
              </div>
              <div className="mt-2 text-[14px] font-semibold text-foreground">{b.saved.title}</div>
              <div className="mt-1 text-[12.5px] leading-relaxed text-muted-foreground">
                {b.saved.summary}
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {b.saved.tags.map((t) => (
                  <Badge
                    key={t}
                    variant="secondary"
                    className="rounded-full bg-secondary px-2 py-0.5 text-[10.5px] font-normal tracking-normal text-muted-foreground normal-case"
                  >
                    {t}
                  </Badge>
                ))}
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  onClick={() => toast.success("Connected", { description: "Linked to Building RecallAI." })}
                  className={`${plain} h-9 gradient-primary px-3 text-[12px] font-semibold text-white hover:bg-transparent`}
                >
                  Yes, connect
                </Button>
                <Button
                  variant="outline"
                  onClick={() => toast.info("Left unconnected")}
                  className={`${plain} h-9 border-border bg-card px-3 text-[12px] font-medium text-foreground/80`}
                >
                  Not now
                </Button>
                <Button
                  variant="outline"
                  onClick={() => router.push(`/memory/${b.saved.id}`)}
                  className={`${plain} h-9 border-border bg-card px-3 text-[12px] font-medium text-foreground/80`}
                >
                  Open memory
                </Button>
              </div>
            </Msg>
          ) : (
            <Msg key={b.id} from={b.from}>
              {b.text}
            </Msg>
          ),
        )}
        </AnimatePresence>
      </CardContent>

      <Separator />
      <CardContent className="flex items-center gap-2 bg-card px-3 py-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => toast.info("Attachments coming soon")}
          aria-label="Add attachment"
          className={`${plain} shrink-0 rounded-full text-muted-foreground hover:bg-secondary`}
        >
          <Plus className="size-4" />
        </Button>
        <div className="flex h-11 flex-1 items-center gap-2 rounded-full bg-secondary px-3">
          <Input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send()}
            aria-label="Message the Recall bot"
            className="h-full min-w-0 border-transparent px-0 text-[14px] focus-visible:border-transparent sm:text-[13px]"
            placeholder="Type or hold to talk…"
          />
          <Paperclip className="hidden h-3.5 w-3.5 shrink-0 text-muted-foreground sm:block" />
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => toast.info("Hold to record")}
          aria-label="Record a voice note"
          className={`${plain} shrink-0 rounded-full text-muted-foreground hover:bg-secondary`}
        >
          <Mic className="size-4" />
        </Button>
        <Button
          size="icon"
          onClick={send}
          aria-label="Send message"
          className="size-11 shrink-0 rounded-full gradient-primary text-white hover:bg-transparent"
        >
          <Send className="size-4" />
        </Button>
      </CardContent>
    </Card>
  );
}

function Msg({ from, rich, children }: { from: "user" | "bot"; rich?: boolean; children: ReactNode }) {
  const reduced = useReducedMotion();
  const variants = motionVariants(reduced, fadeUp);
  if (from === "user") {
    return (
      <motion.div
        variants={variants}
        initial="hidden"
        animate="show"
        exit="exit"
        className="ml-auto max-w-[80%] rounded-2xl rounded-tr-md gradient-primary px-3.5 py-2 text-[13.5px] text-white"
      >
        {children}
      </motion.div>
    );
  }
  return (
    <motion.div variants={variants} initial="hidden" animate="show" exit="exit">
      <Card className="max-w-[85%] gap-0 rounded-2xl rounded-tl-md border border-border bg-card py-0 text-[13.5px] text-foreground/85 shadow-none ring-0">
        <CardContent className={`px-3.5 ${rich ? "py-3" : "py-2"}`}>{children}</CardContent>
      </Card>
    </motion.div>
  );
}
