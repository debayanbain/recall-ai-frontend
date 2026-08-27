"use client";

import { useState } from "react";
import { Sparkles, Share2, Link2, Eye, Pencil, Download, X, Check } from "lucide-react";
import { toast } from "@/lib/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const options = [
  { id: "read", icon: Eye, title: "Read only", desc: "A public link anyone can view — no edits, no AI questions." },
  { id: "interactive", icon: Sparkles, title: "Interactive experience", desc: "Visitors can ask Recall AI about this space and explore connections." },
  { id: "collab", icon: Pencil, title: "Collaborate", desc: "Invited friends can add and edit memories together." },
  { id: "export", icon: Download, title: "Export", desc: "Markdown, PDF, or a Notion-ready bundle." },
];

const plain = "rounded-xl tracking-normal normal-case";

export function ShareButton({ spaceId, spaceTitle }: { spaceId: string; spaceTitle: string }) {
  const [mode, setMode] = useState("interactive");
  const [copied, setCopied] = useState(false);
  const url =
    typeof window === "undefined" ? `/share/${spaceId}` : `${window.location.origin}/share/${spaceId}`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success("Public link copied", { description: `${spaceTitle} · ${mode} mode` });
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.info("Couldn't copy automatically", {
        description: "Select the link and copy it manually.",
      });
    }
  };

  return (
    <Dialog>
      <DialogTrigger
        render={
          <Button
            className={`${plain} h-11 gap-2 gradient-primary px-3.5 text-[13px] font-semibold text-white shadow-[0_8px_24px_-10px_oklch(0.55_0.19_285/0.7)] hover:bg-transparent`}
          />
        }
      >
        <Share2 className="size-4" /> Share
      </DialogTrigger>
      <DialogContent
        showCloseButton={false}
        className="max-h-[92dvh] max-w-lg gap-0 overflow-y-auto overscroll-contain rounded-3xl border-border bg-card p-0 text-card-foreground ring-0 sm:max-w-lg"
      >
        <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-border bg-card px-5 py-4 sm:px-6">
          <div className="min-w-0">
            <DialogDescription className="mt-0 text-[11px] font-semibold uppercase tracking-wider text-primary">
              Share space
            </DialogDescription>
            <DialogTitle className="font-display text-[20px] leading-tight tracking-tight text-foreground normal-case sm:text-[22px]">
              How should people experience this?
            </DialogTitle>
          </div>
          <DialogClose
            render={
              <Button
                variant="ghost"
                size="icon"
                aria-label="Close share dialog"
                className={`${plain} size-10 shrink-0 rounded-full text-muted-foreground`}
              />
            }
          >
            <X className="size-4" />
          </DialogClose>
        </div>

        <ToggleGroup
          value={[mode]}
          onValueChange={(next) => next[0] && setMode(next[0])}
          orientation="vertical"
          className="w-full gap-2 p-4 sm:p-5"
        >
          {options.map((o) => (
            <ToggleGroupItem
              key={o.id}
              value={o.id}
              className="h-auto min-w-0 items-start gap-3 rounded-2xl border border-border bg-card p-3.5 text-left tracking-normal normal-case hover:bg-secondary/50 aria-pressed:border-primary/40 aria-pressed:bg-primary-soft sm:p-4"
            >
              <span
                className={`grid size-9 shrink-0 place-items-center rounded-xl ${
                  mode === o.id ? "gradient-primary text-white" : "bg-secondary text-foreground/70"
                }`}
              >
                <o.icon className="size-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center justify-between gap-2">
                  <span className="text-[14px] font-semibold text-foreground">{o.title}</span>
                  {mode === o.id && <Check className="size-4 shrink-0 text-primary" />}
                </span>
                <span className="block text-[12.5px] font-normal leading-relaxed text-muted-foreground">
                  {o.desc}
                </span>
              </span>
            </ToggleGroupItem>
          ))}
        </ToggleGroup>

        <Separator />

        <div className="bg-secondary/30 p-4 sm:p-5">
          <div className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2">
            <Link2 className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <Input
              value={url}
              readOnly
              onFocus={(e) => e.currentTarget.select()}
              aria-label="Public link to this space"
              className="h-8 min-w-0 border-transparent px-0 text-[13px] focus-visible:border-transparent"
            />
            <Button
              onClick={copy}
              className={`${plain} h-auto shrink-0 rounded-lg gradient-primary px-3 py-2 text-[12px] font-semibold text-white hover:bg-transparent`}
            >
              {copied ? "Copied" : "Copy link"}
            </Button>
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[11.5px] text-muted-foreground">
            <span>Anyone with the link · {mode} mode</span>
            <span className="inline-flex items-center gap-1 text-emerald-600">
              <Check className="h-3 w-3 shrink-0" /> Auto-updates as you add memories
            </span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
