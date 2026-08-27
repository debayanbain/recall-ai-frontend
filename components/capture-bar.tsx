"use client";

import { useEffect, useState } from "react";
import { ArrowUpRight, Link2, Loader2, Mic, Sparkles, StickyNote, Upload } from "lucide-react";
import {
  animate,
  motion,
  useMotionValue,
  useReducedMotion,
  useTransform,
} from "motion/react";
import { toast } from "@/lib/toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { useStore } from "@/lib/store";
import {
  useDeleteVaultItem,
  useSaveNote,
  useSaveUrl,
  useVaultItems,
} from "@/hooks/use-vault";
import { ApiError } from "@/lib/api";
import { useCapture } from "@/components/capture-sheet";
import { PdfDrop } from "@/components/pdf-drop";
import { ease, fadeUp, motionVariants, stagger } from "@/lib/motion";

const quickActions = [
  { kind: "link", icon: Link2, label: "Paste link" },
  { kind: "note", icon: StickyNote, label: "Quick note" },
  { kind: "pdf", icon: Upload, label: "Upload PDF" },
  { kind: "voice", icon: Mic, label: "Voice note" },
] as const;

/** Detects the memory type from what was pasted, so capture never asks first. */
function detectKind(value: string) {
  return /^https?:\/\//i.test(value.trim()) ? ("link" as const) : ("note" as const);
}

/** `title` is capped at 512 server-side; trim here so a long paste is not rejected. */
const TITLE_MAX = 512;

const plain = "rounded-xl tracking-normal normal-case";

export function CaptureBar() {
  const [value, setValue] = useState("");
  const { favorites } = useStore();
  const capture = useCapture();
  const reduced = useReducedMotion();
  const statsVariants = motionVariants(reduced, stagger(0.05, 0.1));
  const statVariants = motionVariants(reduced, fadeUp);

  const [pdfOpen, setPdfOpen] = useState(false);
  const vault = useVaultItems({ limit: 20 });
  const saveUrl = useSaveUrl();
  const saveNote = useSaveNote();
  const remove = useDeleteVaultItem();
  const saving = saveUrl.isPending || saveNote.isPending;

  const submit = () => {
    const text = value.trim();
    if (!text) {
      capture.open();
      return;
    }

    const onSuccess = (item: { id: string; title: string | null }) => {
      setValue("");
      toast.success("Saved to your vault", {
        // Nothing is summarized yet — the worker does that out of band, so say so
        // rather than showing an empty card and letting the user wonder.
        description: `${item.title ?? text} · Recall is reading it now`,
        action: { label: "Undo", onClick: () => remove.mutate(item.id) },
      });
    };

    const onError = (error: unknown) => {
      // Surface the API's own message when it has one (a 422 on a malformed URL is
      // actionable); anything else gets generic copy rather than a raw stack.
      const detail =
        error instanceof ApiError && error.status < 500
          ? error.message
          : "Couldn't reach the vault. Your text is still here — try again.";
      toast.error("Not saved", { description: detail });
    };

    if (detectKind(text) === "link") {
      saveUrl.mutate({ url: text }, { onSuccess, onError });
    } else {
      saveNote.mutate(
        { title: text.slice(0, TITLE_MAX), content: text },
        { onSuccess, onError },
      );
    }
  };

  // Only numbers the backend can actually answer for. "Connections" and "Spaces" used
  // to be `memories.length * 2` and a hardcoded 12 — invented figures that stayed put
  // while the real vault changed, which is worse than showing nothing.
  const inFlight = (vault.data?.items ?? []).filter(
    (i) => i.processing_status === "pending" || i.processing_status === "processing",
  ).length;
  const stats = [
    { k: vault.data?.total ?? 0, l: "memories" },
    { k: inFlight, l: "processing" },
    { k: favorites.length, l: "favorites" },
  ];

  return (
    <>
      <PdfDrop open={pdfOpen} onOpenChange={setPdfOpen} />
      <Card className="mt-6 gap-0 rounded-2xl border border-border bg-white/90 py-0 shadow-[0_24px_60px_-30px_oklch(0.55_0.19_285/0.5)] ring-0 backdrop-blur sm:mt-7">
        <CardContent className="flex flex-col gap-2 p-2 sm:flex-row sm:items-center sm:px-3 sm:py-2">
          <Sparkles className="hidden h-4 w-4 shrink-0 text-primary sm:block" />
          <Input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") submit();
            }}
            aria-label="Capture a memory"
            className="h-11 rounded-none border-transparent bg-transparent px-2 text-[15px] focus-visible:border-transparent sm:h-9 sm:text-[14.5px]"
            placeholder="Paste a link, write an idea…"
          />
          <Button
            onClick={submit}
            disabled={saving}
            className={`${plain} h-11 w-full shrink-0 justify-center gap-1.5 gradient-primary px-3.5 text-[13px] font-semibold text-white shadow-[0_8px_20px_-8px_oklch(0.55_0.19_285/0.6)] hover:bg-transparent disabled:opacity-60 sm:h-9 sm:w-auto`}
          >
            {saving ? (
              <>
                Saving <Loader2 className="size-3.5 animate-spin" aria-hidden />
              </>
            ) : (
              <>
                Remember <ArrowUpRight className="size-3.5" />
              </>
            )}
          </Button>
        </CardContent>
        <Separator className="bg-border/70" />
        <CardContent className="flex items-center gap-1 overflow-x-auto px-1 py-1.5 sm:flex-wrap sm:gap-2 sm:overflow-visible sm:px-2 sm:py-2">
          {quickActions.map((q) => (
            <Button
              key={q.label}
              variant="ghost"
              onClick={() => (q.kind === "pdf" ? setPdfOpen(true) : capture.open(q.kind))}
              className={`${plain} h-10 shrink-0 gap-2 px-3 text-[12.5px] font-medium text-muted-foreground hover:bg-secondary hover:text-foreground sm:h-auto sm:py-1.5`}
            >
              <q.icon className="size-3.5 text-primary" /> {q.label}
            </Button>
          ))}
          <span className="ml-auto hidden shrink-0 text-[11px] text-muted-foreground lg:block">
            Auto-detects content · No folders needed
          </span>
        </CardContent>
      </Card>

      <motion.div
        variants={statsVariants}
        initial="hidden"
        animate="show"
        className="mt-5 grid grid-cols-2 gap-2.5 sm:mt-6 sm:grid-cols-4 sm:gap-3"
      >
        {stats.map((s) => (
          <motion.div key={s.l} variants={statVariants}>
          <Card className="gap-0 rounded-2xl border border-border/70 bg-white/70 py-0 shadow-none ring-0 backdrop-blur">
            <CardContent className="px-3.5 py-3 sm:px-4">
              <div className="font-display text-[24px] leading-none tabular-nums sm:text-[26px]">
                <AnimatedCount value={s.k} />
              </div>
              <div className="mt-1 text-[11px] uppercase tracking-wider text-muted-foreground sm:text-[11.5px]">
                {s.l}
              </div>
            </CardContent>
          </Card>
          </motion.div>
        ))}
      </motion.div>
    </>
  );
}

/** Counts a stat up from zero; jumps straight to the value under reduced motion. */
function AnimatedCount({ value }: { value: number }) {
  const reduced = useReducedMotion();
  const count = useMotionValue(0);
  const label = useTransform(count, (v) => Math.round(v).toLocaleString());

  useEffect(() => {
    if (reduced) {
      count.set(value);
      return;
    }
    const controls = animate(count, value, { duration: 0.7, ease });
    return () => controls.stop();
  }, [count, reduced, value]);

  return <motion.span>{label}</motion.span>;
}
