"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { Link2, Mic, StickyNote, Upload, X } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { addMemory, removeMemory } from "@/lib/store";
import { useIsMobile } from "@/hooks/use-mobile";
import type { MemoryKind } from "@/lib/mock-data";
import { motionVariants, stagger, fadeUp, transition } from "@/lib/motion";

type CaptureKind = "link" | "note" | "pdf" | "voice";

const kinds: { id: CaptureKind; label: string; hint: string; icon: typeof Link2 }[] = [
  { id: "link", label: "Paste link", hint: "Auto-detect & summarize", icon: Link2 },
  { id: "note", label: "Quick note", hint: "Title comes later", icon: StickyNote },
  { id: "pdf", label: "Upload file", hint: "PDF, image, audio", icon: Upload },
  { id: "voice", label: "Voice note", hint: "Hold to speak", icon: Mic },
];

const CaptureContext = createContext<{ open: (kind?: CaptureKind) => void } | null>(null);

export function useCapture() {
  const ctx = useContext(CaptureContext);
  if (!ctx) throw new Error("useCapture must be used inside <CaptureProvider>");
  return ctx;
}

export function CaptureProvider({ children }: { children: ReactNode }) {
  const [openKind, setOpenKind] = useState<CaptureKind | null>(null);
  const open = useCallback((kind: CaptureKind = "note") => setOpenKind(kind), []);
  const value = useMemo(() => ({ open }), [open]);
  const isMobile = useIsMobile();

  const onOpenChange = (next: boolean) => {
    if (!next) setOpenKind(null);
  };

  return (
    <CaptureContext.Provider value={value}>
      {children}
      {isMobile ? (
        <Sheet open={openKind !== null} onOpenChange={onOpenChange}>
          <SheetContent
            side="bottom"
            showCloseButton={false}
            className="max-h-[92dvh] gap-0 overflow-y-auto overscroll-contain rounded-t-[28px] border-border bg-card p-5 pb-[calc(env(safe-area-inset-bottom)+1.25rem)] text-card-foreground"
          >
            <div aria-hidden className="mx-auto mb-4 h-1 w-10 rounded-full bg-border" />
            <CaptureForm
              kind={openKind ?? "note"}
              onDone={() => setOpenKind(null)}
              CloseButton={SheetClose}
              TitleSlot={SheetTitle}
              DescriptionSlot={SheetDescription}
            />
          </SheetContent>
        </Sheet>
      ) : (
        <Dialog open={openKind !== null} onOpenChange={onOpenChange}>
          <DialogContent
            showCloseButton={false}
            className="max-w-lg gap-0 rounded-3xl border-border bg-card p-5 text-card-foreground ring-0 sm:max-w-lg"
          >
            <CaptureForm
              kind={openKind ?? "note"}
              onDone={() => setOpenKind(null)}
              CloseButton={DialogClose}
              TitleSlot={DialogTitle}
              DescriptionSlot={DialogDescription}
            />
          </DialogContent>
        </Dialog>
      )}
    </CaptureContext.Provider>
  );
}

function CaptureForm({
  kind: initialKind,
  onDone,
  CloseButton,
  TitleSlot,
  DescriptionSlot,
}: {
  kind: CaptureKind;
  onDone: () => void;
  CloseButton: typeof SheetClose;
  TitleSlot: typeof SheetTitle;
  DescriptionSlot: typeof SheetDescription;
}) {
  const [kind, setKind] = useState<CaptureKind>(initialKind);
  const [title, setTitle] = useState("");
  const [details, setDetails] = useState("");
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const reduced = useReducedMotion();
  const groupVariants = motionVariants(reduced, stagger(0.045));
  const itemVariants = motionVariants(reduced, fadeUp);

  const submit = () => {
    const value = title.trim();
    if (!value) {
      setError("Give it a few words so Recall can find it later.");
      return;
    }
    const memory = addMemory({
      title: value,
      kind: kind as MemoryKind,
      summary: details.trim() || undefined,
      source: kinds.find((k) => k.id === kind)?.label ?? "Quick capture",
    });
    onDone();
    toast.success("Saved to your vault", {
      description: memory.title,
      action: { label: "Undo", onClick: () => removeMemory(memory.id) },
    });
    router.refresh();
  };

  return (
    <>
      <div className="flex items-start justify-between gap-3">
        <div>
          <DescriptionSlot className="mt-0 text-[11px] font-semibold tracking-wider text-primary uppercase">
            Capture
          </DescriptionSlot>
          <TitleSlot className="font-display text-[22px] leading-tight tracking-tight text-foreground normal-case">
            What do you want to remember?
          </TitleSlot>
        </div>
        <CloseButton
          render={
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Close capture"
              className="size-9 shrink-0 rounded-full text-muted-foreground"
            />
          }
        >
          <X className="size-4" />
        </CloseButton>
      </div>

      <ToggleGroup
        value={[kind]}
        onValueChange={(next) => next[0] && setKind(next[0] as CaptureKind)}
        render={<motion.div variants={groupVariants} initial="hidden" animate="show" />}
        className="mt-4 grid w-full grid-cols-2 gap-2"
      >
        {kinds.map((k) => (
          <ToggleGroupItem
            key={k.id}
            value={k.id}
            aria-label={k.label}
            render={<motion.button variants={itemVariants} />}
            className="relative h-auto min-w-0 flex-col items-start gap-0 whitespace-normal rounded-2xl border border-border bg-card px-3 py-3 text-left tracking-normal normal-case hover:bg-secondary/60"
          >
            {kind === k.id && (
              <motion.span
                layoutId="capture-kind"
                aria-hidden
                className="absolute inset-0 rounded-2xl border border-primary/40 bg-primary-soft"
                transition={reduced ? { duration: 0 } : transition.spring}
              />
            )}
            <span
              className={`relative grid h-8 w-8 place-items-center rounded-lg transition-colors ${
                kind === k.id ? "gradient-primary text-white" : "bg-secondary text-primary"
              }`}
            >
              <k.icon className="size-4" />
            </span>
            <span className="relative mt-2 text-[12.5px] font-semibold text-foreground">{k.label}</span>
            <span className="relative text-[10.5px] font-normal leading-snug text-muted-foreground">
              {k.hint}
            </span>
          </ToggleGroupItem>
        ))}
      </ToggleGroup>

      <div className="mt-4">
        <Label
          htmlFor="capture-input"
          className="text-[12px] font-medium tracking-normal text-foreground/80 normal-case"
        >
          Title
        </Label>
        <Input
          id="capture-input"
          autoFocus
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            if (error) setError(null);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") submit();
          }}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? "capture-error" : "capture-hint"}
          placeholder={kind === "link" ? "https://…" : "An idea, a quote, a plan…"}
          className="mt-1.5 h-11 rounded-xl border border-border bg-secondary/50 px-3 text-[15px] focus-visible:border-primary/40 focus-visible:bg-white focus-visible:ring-4 focus-visible:ring-primary/10"
        />
        {error ? (
          <p id="capture-error" role="alert" className="mt-1.5 text-[12px] text-destructive">
            {error}
          </p>
        ) : (
          <p id="capture-hint" className="mt-1.5 text-[12px] text-muted-foreground">
            No folder needed — Recall tags and connects it for you.
          </p>
        )}
      </div>

      <div className="mt-3">
        <Label
          htmlFor="capture-details"
          className="text-[12px] font-medium tracking-normal text-foreground/80 normal-case"
        >
          Details <span className="font-normal text-muted-foreground">(optional)</span>
        </Label>
        <Textarea
          id="capture-details"
          value={details}
          onChange={(e) => setDetails(e.target.value)}
          rows={3}
          placeholder="Anything worth keeping alongside it…"
          className="mt-1.5 min-h-20 rounded-xl border border-border bg-secondary/50 px-3 py-2.5 text-[14px] focus-visible:border-primary/40 focus-visible:bg-white focus-visible:ring-4 focus-visible:ring-primary/10"
        />
      </div>

      <div className="mt-4 flex items-center gap-2">
        <Button
          onClick={submit}
          className="h-11 flex-1 rounded-xl gradient-primary text-[14px] font-semibold tracking-normal text-white normal-case shadow-[0_8px_24px_-10px_oklch(0.55_0.19_285/0.7)] hover:bg-transparent"
        >
          Remember it
        </Button>
        <CloseButton
          render={
            <Button
              variant="outline"
              className="h-11 rounded-xl border-border bg-card px-4 text-[14px] font-medium tracking-normal text-foreground/80 normal-case"
            />
          }
        >
          Cancel
        </CloseButton>
      </div>
    </>
  );
}
