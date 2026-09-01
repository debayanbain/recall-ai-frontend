"use client";

import { useState } from "react";
import { Check, Globe, Link2, Lock, Share2, X } from "lucide-react";
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
import { useUpdateSpace } from "@/hooks/use-spaces";
import type { Visibility } from "@/lib/types";

/**
 * Publishing a Space, and only what the server can actually do.
 *
 * This dialog used to offer four modes — read-only, "interactive experience",
 * collaborate, export — none of which existed. Three of them still do not, and a control
 * that promises a capability is worse than a missing control: the user turns it on and
 * believes it.
 *
 * What exists is one decision: private, or readable by anyone holding the link. The
 * backend's `unlisted` value is deliberately not offered — `GET /public/{slug}` serves
 * only `public`, nothing anywhere lists public Spaces, so "unlisted" and "public" would
 * be the same setting with two names.
 *
 * Owner-only, and the server enforces that regardless: `PATCH /spaces/{id}` refuses a
 * visibility change from an editor.
 */

const plain = "rounded-xl tracking-normal normal-case";

const options = [
  {
    id: "private" as const,
    icon: Lock,
    title: "Private",
    desc: "Only you and the people you have invited can open this space.",
  },
  {
    id: "public" as const,
    icon: Globe,
    title: "Anyone with the link",
    desc: "A public page showing the memory cards in this space — titles, summaries and tags. Never the full text of a memory, and never its files.",
  },
];

export function ShareButton({
  spaceId,
  spaceSlug,
  spaceTitle,
  visibility,
}: {
  spaceId: string;
  spaceSlug: string;
  spaceTitle: string;
  visibility: Visibility;
}) {
  const [copied, setCopied] = useState(false);
  const update = useUpdateSpace(spaceId);
  // `unlisted` is not offered, so anything that is not `public` shows as private.
  const mode: "private" | "public" = visibility === "public" ? "public" : "private";
  const url =
    typeof window === "undefined"
      ? `/share/${spaceSlug}`
      : `${window.location.origin}/share/${spaceSlug}`;

  const setMode = (next: "private" | "public") => {
    if (next === mode) return;
    update.mutate(
      { visibility: next },
      {
        onSuccess: () =>
          toast.success(
            next === "public" ? "Space published" : "Space is private again",
            {
              description:
                next === "public"
                  ? `${spaceTitle} · anyone with the link can read it`
                  : `${spaceTitle} · the public link no longer works`,
            },
          ),
        onError: () =>
          toast.error("Couldn't change who can see this", {
            description: "Nothing was published. Try again in a moment.",
          }),
      },
    );
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success("Public link copied", { description: spaceTitle });
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
              Who can open this?
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
          onValueChange={(next) => next[0] && setMode(next[0] as "private" | "public")}
          orientation="vertical"
          aria-label="Who can open this space"
          className="w-full gap-2 p-4 sm:p-5"
        >
          {options.map((o) => (
            <ToggleGroupItem
              key={o.id}
              value={o.id}
              disabled={update.isPending}
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

        {/* The link is shown only while it works. Offering a copyable URL for a private
            space hands someone a link that answers 404 to everyone they send it to. */}
        {mode === "public" && (
          <>
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
              <p className="mt-3 text-[11.5px] leading-relaxed text-muted-foreground">
                The page follows the space: memories you add appear on it, and memories you
                delete disappear from it.
              </p>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
