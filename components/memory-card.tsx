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
  Check,
  Heart,
  Plus,
  Share2,
  Sparkles,
} from "lucide-react";
import { toast } from "@/lib/toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { MemoryBanner } from "@/components/memory-banner";
import {
  FilePlaque,
  useAttachmentCover,
} from "@/components/attachment-preview";
import type { LucideIcon } from "lucide-react";
import type { Memory, MemoryKind } from "@/lib/mock-data";
import { kindMeta } from "@/lib/mock-data";
import { toggleFavorite, useStore } from "@/lib/store";
import { useIsSelected, useSelectionStore } from "@/lib/stores/selection-store";

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
const cardReset =
  "gap-0 rounded-[calc(var(--radius)+4px)] py-0 shadow-none ring-0";
/** Strips the base-sera Badge/Button typography defaults. */
const badgeReset = "tracking-normal normal-case";

function favoriteToast(title: string, next: boolean) {
  const fn = next ? toast.success : toast.info;
  fn(next ? "Added to favorites" : "Removed from favorites", {
    description: title,
  });
}

async function copyMemoryLink(memory: Memory) {
  try {
    await navigator.clipboard.writeText(
      `${window.location.origin}/memory/${memory.id}`,
    );
    toast.success("Link copied", { description: memory.title });
  } catch {
    toast.info("Couldn't copy automatically", {
      description: `Open ${memory.title} and copy the address bar.`,
    });
  }
}

export function MemoryCard({
  m,
  compact = false,
  readOnly = false,
  onAddToSpace,
}: {
  m: Memory;
  compact?: boolean;
  /**
   * A card a stranger is looking at, on a public Space page. No favourite (it writes to
   * the viewer's own store, which is not a thing they asked for), no copy-link (it points
   * at `/memory/{id}`, which answers 404 to anyone but the owner), and no navigation --
   * the card is the whole of what is shared.
   */
  readOnly?: boolean;
  /** Opens the "add to space" sheet for this one memory. Omitted where there is none. */
  onAddToSpace?: (id: string) => void;
}) {
  const Icon = kindIcon[m.kind];
  const meta = kindMeta[m.kind];
  const { favorites } = useStore();
  const favorited = favorites.includes(m.id);
  // Selection is off entirely on a public page: there is nothing a visitor could do with
  // a selection, and the bar it summons acts on the vault.
  const selecting = useSelectionStore((s) => s.active) && !readOnly;
  const selected = useIsSelected(m.id) && !readOnly;
  const toggle = useSelectionStore((s) => s.toggle);

  // An uploaded picture becomes the banner, exactly like a scraped still: same wash, same
  // fallback, same pill treatment for the badges over it. A scraped still still wins where
  // there is one -- it is already loaded and costs nothing to keep.
  const {
    ref: viewRef,
    src: uploadCover,
    onImageError,
    resolving,
  } = useAttachmentCover(m);
  const cover = m.cover ?? uploadCover;
  // Nothing to draw and something to name. Voice notes are excluded: their filename is
  // one this server invented, so a plaque reading "voice-note.webm" tells its owner less
  // than the Voice badge already sitting in the corner.
  const plaque =
    !cover && !resolving && m.kind !== "voice" ? m.file : undefined;

  const heightClass = compact
    ? "h-28 sm:h-32"
    : m.height === "lg"
      ? "h-44 sm:h-56"
      : m.height === "md"
        ? "h-36 sm:h-40"
        : "h-28";

  return (
    <div ref={viewRef} className="group block break-inside-avoid">
      <Card
        className={`card-soft card-lift relative overflow-hidden ${cardReset} ${
          selected
            ? "ring-2 ring-primary ring-offset-2 ring-offset-background"
            : ""
        }`}
      >
        {/* One overlay, three modes. Kept as a sibling of the content so the hover
            actions below stay real buttons instead of nested inside an <a>.

            While picking, the card must not navigate -- tapping it is the choice. The
            control is a real checkbox rather than a styled div so it is announced,
            focusable and toggled by Space like every other checkbox on the platform. */}
        {selecting ? (
          <label className="absolute inset-0 z-10 cursor-pointer rounded-[calc(var(--radius)+4px)] focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-primary">
            <input
              type="checkbox"
              className="sr-only"
              checked={selected}
              onChange={() => toggle(m.id)}
            />
            <span className="sr-only">{m.title}</span>
          </label>
        ) : (
          !readOnly && (
            <Link
              href={`/memory/${m.id}`}
              aria-label={m.title}
              className="absolute inset-0 z-10 rounded-[calc(var(--radius)+4px)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            />
          )
        )}
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
          {/* The state of the checkbox above, drawn. `aria-hidden` because the input
              already announces it -- two announcements for one control is worse than
              none. Sits where the hover actions do, which are hidden while picking. */}
          {selecting && (
            <span
              aria-hidden
              className={`absolute right-2.5 top-2.5 z-20 grid size-8 place-items-center rounded-full border shadow-sm transition-colors ${
                selected
                  ? "border-primary bg-primary text-white"
                  : "border-white/80 bg-white/95 text-transparent"
              }`}
            >
              <Check className="size-4" />
            </span>
          )}
          {/* Always visible on touch, revealed on hover/focus on pointer devices */}
          <div
            className={`absolute right-2.5 top-2.5 z-20 flex gap-3 opacity-100 transition-opacity focus-within:opacity-100 sm:opacity-0 sm:group-hover:opacity-100 ${
              selecting || readOnly ? "hidden" : ""
            }`}
          >
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={
                favorited
                  ? `Remove ${m.title} from favorites`
                  : `Favorite ${m.title}`
              }
              aria-pressed={favorited}
              onClick={() => favoriteToast(m.title, toggleFavorite(m.id))}
              className={`relative size-8 rounded-full bg-white/95 shadow-sm before:absolute before:-inset-1.5 before:content-[''] hover:bg-white ${
                favorited
                  ? "text-rose-500"
                  : "text-muted-foreground hover:text-primary"
              }`}
            >
              <Heart
                className="relative size-3.5"
                fill={favorited ? "currentColor" : "none"}
              />
            </Button>
            {onAddToSpace && (
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={`Add ${m.title} to a space`}
                onClick={() => onAddToSpace(m.id)}
                className="relative size-8 rounded-full bg-white/95 text-muted-foreground shadow-sm before:absolute before:-inset-1.5 before:content-[''] hover:bg-white hover:text-primary"
              >
                <Plus className="relative size-3.5" />
              </Button>
            )}
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
          <h3 className="text-[14.5px] font-semibold leading-snug tracking-tight">
            {m.title}
          </h3>
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
            <span className="shrink-0 text-[10.5px] text-muted-foreground">
              {m.savedAt}
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * A row owns its own full-bleed link, so a caller must never wrap one in another
 * `<Link>` -- nested anchors are invalid HTML and React reports it as a hydration error.
 * A caller that wants the row to go somewhere else passes `href` instead.
 */
export function MemoryRow({
  m,
  href,
  label,
  interactive = true,
}: {
  m: Memory;
  /**
   * Whether the row navigates and can be favourited. Off inside a dialog: the row is
   * there to say *which* memory this is about, and a full-card link in a modal is a tap
   * that throws the decision away to go somewhere else -- along with a heart that nobody
   * came here to press.
   */
  interactive?: boolean;
  /** Where the row goes. Defaults to the memory's own page. */
  href?: string;
  /** What a screen reader hears. Defaults to the title, which is right when the row
   *  opens the memory and wrong when `href` sends it anywhere else -- "Building a Second
   *  Brain" read aloud for a link that actually opens a connections map describes the
   *  destination incorrectly. */
  label?: string;
}) {
  const Icon = kindIcon[m.kind];
  const meta = kindMeta[m.kind];
  const { favorites } = useStore();
  const favorited = favorites.includes(m.id);
  // The list view gets the same picture the card does, at thumbnail size. A row is what
  // someone scans when they already half-know what they are looking for, which is exactly
  // when a photo beats a generic icon.
  const {
    ref: viewRef,
    src: uploadCover,
    onImageError,
  } = useAttachmentCover(m);
  // A dead thumbnail falls back to the kind icon rather than to the browser's broken-image
  // glyph. Keyed by the URL that failed, so a re-mint of an expired link -- the common
  // case -- is drawn rather than discarded by a latch nobody cleared.
  const [failedThumb, setFailedThumb] = useState<string | null>(null);
  const candidate = m.cover ?? uploadCover;
  const thumb = candidate && candidate !== failedThumb ? candidate : undefined;

  return (
    <Card
      ref={viewRef}
      className={`${cardReset} group relative w-full min-w-0 flex-row items-center gap-3 overflow-hidden rounded-2xl border border-border p-3 transition-colors sm:gap-4 sm:p-3.5 ${
        interactive ? "hover:border-primary/25" : ""
      }`}
    >
      {interactive && (
        <Link
          href={href ?? `/memory/${m.id}`}
          aria-label={label ?? m.title}
          className="absolute inset-0 z-10 rounded-2xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        />
      )}
      <div
        className="relative grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-xl sm:h-14 sm:w-14"
        style={{ backgroundImage: m.accent }}
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
          <Badge
            variant="secondary"
            className="px-0 text-[10.5px] tracking-wider text-muted-foreground"
          >
            {meta.label}
          </Badge>
        </div>
        <div className="mt-0.5 line-clamp-1 text-[13.5px] font-semibold">
          {m.title}
        </div>
        <div className="line-clamp-1 text-[11.5px] text-muted-foreground">
          {m.source} · {m.savedAt}
        </div>
      </div>
      {interactive && (
        <Button
          variant="ghost"
          size="icon"
          aria-label={
            favorited ? `Remove ${m.title} from favorites` : `Favorite ${m.title}`
          }
          aria-pressed={favorited}
          onClick={() => favoriteToast(m.title, toggleFavorite(m.id))}
          className={`relative z-20 size-10 shrink-0 rounded-full ${
            favorited
              ? "text-rose-500"
              : "text-muted-foreground hover:bg-secondary hover:text-primary"
          }`}
        >
          <Heart className="size-4" fill={favorited ? "currentColor" : "none"} />
        </Button>
      )}
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
