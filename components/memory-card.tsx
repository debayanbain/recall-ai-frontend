"use client";

import { useState } from "react";
import Link from "next/link";
import {
  FileText,
  Link as LinkIcon,
  Play,
  Mic,
  StickyNote,
  Image as ImageIcon,
  GitBranch,
  Heart,
  Share2,
  Sparkles,
} from "lucide-react";
import { toast } from "@/lib/toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { MemoryBanner } from "@/components/memory-banner";
import { FilePlaque, useAttachmentCover } from "@/components/attachment-preview";
import type { LucideIcon } from "lucide-react";
import type { Memory, MemoryKind } from "@/lib/mock-data";
import { kindMeta } from "@/lib/mock-data";
import { toggleFavorite, useStore } from "@/lib/store";

const kindIcon: Record<MemoryKind, LucideIcon> = {
  article: LinkIcon,
  video: Play,
  note: StickyNote,
  pdf: FileText,
  document: FileText,
  voice: Mic,
  image: ImageIcon,
  tweet: LinkIcon,
  github: GitBranch,
  link: LinkIcon,
};

/** Strips the base-sera Card chrome so the RecallAI card-soft surface shows through. */
const cardReset = "gap-0 rounded-[calc(var(--radius)+4px)] py-0 shadow-none ring-0";
/** Strips the base-sera Badge/Button typography defaults. */
const badgeReset = "tracking-normal normal-case";

function favoriteToast(title: string, next: boolean) {
  const fn = next ? toast.success : toast.info;
  fn(next ? "Added to favorites" : "Removed from favorites", { description: title });
}

async function copyMemoryLink(memory: Memory) {
  try {
    await navigator.clipboard.writeText(`${window.location.origin}/memory/${memory.id}`);
    toast.success("Link copied", { description: memory.title });
  } catch {
    toast.info("Couldn't copy automatically", {
      description: `Open ${memory.title} and copy the address bar.`,
    });
  }
}

export function MemoryCard({ m, compact = false }: { m: Memory; compact?: boolean }) {
  const Icon = kindIcon[m.kind];
  const meta = kindMeta[m.kind];
  const { favorites } = useStore();
  const favorited = favorites.includes(m.id);

  // An uploaded picture becomes the banner, exactly like a scraped still: same wash, same
  // fallback, same pill treatment for the badges over it. A scraped still still wins where
  // there is one -- it is already loaded and costs nothing to keep.
  const { ref: viewRef, src: uploadCover, onImageError, resolving } = useAttachmentCover(m);
  const cover = m.cover ?? uploadCover;
  // Nothing to draw and something to name. Voice notes are excluded: their filename is
  // one this server invented, so a plaque reading "voice-note.webm" tells its owner less
  // than the Voice badge already sitting in the corner.
  const plaque = !cover && !resolving && m.kind !== "voice" ? m.file : undefined;

  const heightClass = compact
    ? "h-28 sm:h-32"
    : m.height === "lg"
      ? "h-44 sm:h-56"
      : m.height === "md"
        ? "h-36 sm:h-40"
        : "h-28";

  return (
    <div ref={viewRef} className="group block break-inside-avoid">
      <Card className={`card-soft card-lift relative overflow-hidden ${cardReset}`}>
        {/* Full-card navigation target. Kept as a sibling overlay so the hover
            actions below stay real buttons instead of nested inside an <a>. */}
        <Link
          href={`/memory/${m.id}`}
          aria-label={m.title}
          className="absolute inset-0 z-10 rounded-[calc(var(--radius)+4px)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        />
        <MemoryBanner
          cover={cover}
          accent={m.accent}
          alt={cover ? m.title : ""}
          onImageError={onImageError}
          className={heightClass}
        >
          {plaque && <FilePlaque file={plaque} />}
          <Badge
            className={`${badgeReset} absolute left-3.5 top-3.5 gap-1.5 rounded-full border border-white/80 bg-white/80 px-2 py-1 text-[10.5px] font-medium text-foreground/80 backdrop-blur`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
            {meta.label}
          </Badge>
          {/* Always visible on touch, revealed on hover/focus on pointer devices */}
          <div className="absolute right-2.5 top-2.5 z-20 flex gap-3 opacity-100 transition-opacity focus-within:opacity-100 sm:opacity-0 sm:group-hover:opacity-100">
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={favorited ? `Remove ${m.title} from favorites` : `Favorite ${m.title}`}
              aria-pressed={favorited}
              onClick={() => favoriteToast(m.title, toggleFavorite(m.id))}
              className={`relative size-8 rounded-full bg-white/95 shadow-sm before:absolute before:-inset-1.5 before:content-[''] hover:bg-white ${
                favorited ? "text-rose-500" : "text-muted-foreground hover:text-primary"
              }`}
            >
              <Heart className="relative size-3.5" fill={favorited ? "currentColor" : "none"} />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={`Copy link to ${m.title}`}
              onClick={() => copyMemoryLink(m)}
              className="relative size-8 rounded-full bg-white/95 text-muted-foreground shadow-sm before:absolute before:-inset-1.5 before:content-[''] hover:bg-white hover:text-primary"
            >
              <Share2 className="relative size-3.5" />
            </Button>
          </div>
          {/* Over a still the accent has faded out by this point, so the source line needs
              its own ground -- the same white pill the type badge uses, rather than dark
              text laid straight on someone's photo. */}
          <div
            className={`absolute bottom-3 left-3.5 flex max-w-[calc(100%-1.75rem)] items-center gap-2 text-[11px] ${
              cover
                ? "rounded-full border border-white/80 bg-white/85 px-2 py-1 text-foreground/80 backdrop-blur"
                : "right-3.5 text-foreground/60"
            }`}
          >
            <Icon className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{m.source}</span>
          </div>
        </MemoryBanner>
        <CardContent className="space-y-2 p-4">
          {/* The AI's name for this specific memory, above the title on purpose: in a
              grid where every card is tagged [jobs], this is the line that tells two of
              them apart. */}
          {m.label && (
            <div className="flex items-center gap-1.5 text-[11px] font-medium text-brand-accent">
              <Sparkles className="size-3 shrink-0" aria-hidden />
              <span className="truncate">{m.label}</span>
            </div>
          )}
          <h3 className="text-[14.5px] font-semibold leading-snug tracking-tight">{m.title}</h3>
          {!compact && (
            <p className="line-clamp-2 text-[12.5px] leading-relaxed text-muted-foreground">
              {m.summary}
            </p>
          )}
          <div className="flex items-center justify-between gap-2 pt-1">
            <div className="flex flex-wrap gap-1">
              {m.tags.slice(0, 2).map((t) => (
                <Badge
                  key={t}
                  variant="secondary"
                  className={`${badgeReset} rounded-md bg-secondary px-1.5 py-0.5 text-[10.5px] font-medium text-muted-foreground`}
                >
                  #{t}
                </Badge>
              ))}
            </div>
            <span className="shrink-0 text-[10.5px] text-muted-foreground">{m.savedAt}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export function MemoryRow({ m }: { m: Memory }) {
  const Icon = kindIcon[m.kind];
  const meta = kindMeta[m.kind];
  const { favorites } = useStore();
  const favorited = favorites.includes(m.id);
  // The list view gets the same picture the card does, at thumbnail size. A row is what
  // someone scans when they already half-know what they are looking for, which is exactly
  // when a photo beats a generic icon.
  const { ref: viewRef, src: uploadCover, onImageError } = useAttachmentCover(m);
  // A dead thumbnail falls back to the kind icon rather than to the browser's broken-image
  // glyph. Keyed by the URL that failed, so a re-mint of an expired link -- the common
  // case -- is drawn rather than discarded by a latch nobody cleared.
  const [failedThumb, setFailedThumb] = useState<string | null>(null);
  const candidate = m.cover ?? uploadCover;
  const thumb = candidate && candidate !== failedThumb ? candidate : undefined;

  return (
    <Card
      ref={viewRef}
      className={`${cardReset} group relative flex-row items-center gap-3 rounded-2xl border border-border p-3 transition-colors hover:border-primary/25 sm:gap-4 sm:p-3.5`}
    >
      <Link
        href={`/memory/${m.id}`}
        aria-label={m.title}
        className="absolute inset-0 z-10 rounded-2xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      />
      <div
        className={`relative grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-xl bg-linear-to-br sm:h-14 sm:w-14 ${m.accent}`}
      >
        {thumb ? (
          /* eslint-disable-next-line @next/next/no-img-element -- same reason as the
             banner: a signed, expiring URL on a host that varies, so there is nothing for
             next/image to cache or to configure a remote pattern against. */
          <img
            src={thumb}
            alt=""
            loading="lazy"
            decoding="async"
            referrerPolicy="no-referrer"
            onError={() => {
              setFailedThumb(candidate ?? null);
              onImageError();
            }}
            className="absolute inset-0 size-full object-cover"
          />
        ) : (
          <Icon className="h-4 w-4 text-foreground/50" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${meta.dot}`} />
          <Badge variant="secondary" className="px-0 text-[10.5px] tracking-wider text-muted-foreground">
            {meta.label}
          </Badge>
        </div>
        <div className="mt-0.5 line-clamp-1 text-[13.5px] font-semibold">{m.title}</div>
        <div className="line-clamp-1 text-[11.5px] text-muted-foreground">
          {m.source} · {m.savedAt}
        </div>
      </div>
      <Button
        variant="ghost"
        size="icon"
        aria-label={favorited ? `Remove ${m.title} from favorites` : `Favorite ${m.title}`}
        aria-pressed={favorited}
        onClick={() => favoriteToast(m.title, toggleFavorite(m.id))}
        className={`relative z-20 size-10 shrink-0 rounded-full ${
          favorited ? "text-rose-500" : "text-muted-foreground hover:bg-secondary hover:text-primary"
        }`}
      >
        <Heart className="size-4" fill={favorited ? "currentColor" : "none"} />
      </Button>
    </Card>
  );
}

export function ConnectChip({ label }: { label: string }) {
  return (
    <Badge className="gap-1 rounded-full bg-primary-soft px-2.5 py-1 text-[11px] font-medium tracking-normal text-accent-foreground normal-case">
      <Sparkles className="h-3 w-3 shrink-0 text-primary" /> {label}
    </Badge>
  );
}
