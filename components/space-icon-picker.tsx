"use client";

import { useId, useMemo, useRef, useState } from "react";
import { Ban, ChevronDown, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SpaceGlyph } from "@/components/space-icon";
import { ACCENT_KEYS, SPACE_ACCENTS, gradientFor } from "@/lib/space-accent";
import { SPACE_ICON_GROUPS, SPACE_ICONS, searchIcons } from "@/lib/space-icons";

/**
 * Pick a Space's icon and the colour it is drawn in.
 *
 * It replaces a text box that asked people to *type an emoji* — which on a desktop
 * browser means knowing a keyboard shortcut, and which quietly accepted any eight
 * characters, so the field's real behaviour was "whatever you paste is your icon".
 *
 * Deliberately **inline rather than a popover**. This form lives inside a Dialog on
 * desktop and a bottom Sheet on mobile; a popover inside either is a second portal with a
 * second focus trap over the first, and on the sheet it would open past the bottom of the
 * screen. Disclosure inside the form scrolls with the form and has no such problem.
 *
 * The colour and the icon are one control because they are one decision: the icon is
 * drawn *on* the accent's wash, so choosing them apart is choosing half a result and
 * finding out afterwards. It is also the Space's own colour everywhere else — the card
 * header, the detail hero — so this panel is a preview of the thing being made, not a
 * settings pair.
 */

/** Fixed, because the arrow-key stepping below is `± COLUMNS` and has to match. */
const COLUMNS = 6;

const iconButton =
  "grid size-11 place-items-center rounded-xl border border-transparent text-foreground/70 transition-colors hover:bg-background hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary aria-pressed:border-primary/40 aria-pressed:bg-background aria-pressed:text-foreground sm:size-10";

export function SpaceIconPicker({
  icon,
  accent,
  onIconChange,
  onAccentChange,
}: {
  /** The stored icon name, or null for "no icon". */
  icon: string | null;
  accent: string;
  onIconChange: (icon: string | null) => void;
  onAccentChange: (accent: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const panelId = useId();
  const gridRef = useRef<HTMLDivElement>(null);

  const preview = { id: "preview", icon, emoji: null, accent };
  const results = useMemo(() => searchIcons(query), [query]);
  const selectedLabel = useMemo(
    () => SPACE_ICONS.find((i) => i.name === icon)?.label ?? "No icon",
    [icon],
  );

  /**
   * Roving focus. Without it the grid is ~100 tab stops between the search box and the
   * Create button, which is the difference between a keyboard-usable picker and a
   * keyboard trap that technically passes.
   */
  const onGridKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const step: Record<string, number> = {
      ArrowRight: 1,
      ArrowLeft: -1,
      ArrowDown: COLUMNS,
      ArrowUp: -COLUMNS,
    };
    const delta = step[e.key];
    if (delta === undefined) return;
    const buttons = Array.from(
      gridRef.current?.querySelectorAll<HTMLButtonElement>("[data-icon-btn]") ??
        [],
    );
    const index = buttons.indexOf(document.activeElement as HTMLButtonElement);
    if (index < 0) return;
    const next =
      buttons[Math.min(buttons.length - 1, Math.max(0, index + delta))];
    if (next) {
      e.preventDefault();
      next.focus();
    }
  };

  // Exactly one button in the grid is tabbable: the chosen icon, or the "no icon" cell
  // when nothing is chosen. Everything else is reached with the arrow keys.
  const tabbable = (name: string | null) => (icon === name ? 0 : -1);

  const renderIcon = (i: (typeof SPACE_ICONS)[number]) => (
    <button
      key={i.name}
      type="button"
      data-icon-btn
      tabIndex={tabbable(i.name)}
      aria-pressed={icon === i.name}
      aria-label={i.label}
      title={i.label}
      onClick={() => onIconChange(i.name)}
      className={iconButton}
    >
      <i.Icon className="size-5" strokeWidth={1.75} aria-hidden />
    </button>
  );

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls={panelId}
          aria-label={`Icon and colour: ${selectedLabel}, ${SPACE_ACCENTS[accent as keyof typeof SPACE_ACCENTS]?.label ?? "Violet"}. Change`}
          className={`grid size-12 shrink-0 place-items-center rounded-2xl border border-border bg-linear-to-br text-[20px] transition-shadow hover:shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${gradientFor(preview)}`}
        >
          <SpaceGlyph space={preview} />
        </button>

        <div className="min-w-0">
          <p className="truncate text-[13.5px] font-medium text-foreground">
            {selectedLabel}
          </p>
          <p className="truncate text-[11.5px] text-muted-foreground">
            {SPACE_ACCENTS[accent as keyof typeof SPACE_ACCENTS]?.label ??
              "Violet"}
          </p>
        </div>

        <Button
          type="button"
          variant="ghost"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls={panelId}
          className="ml-auto h-11 gap-1.5 rounded-xl px-3 text-[12.5px] font-medium normal-case tracking-normal text-muted-foreground hover:text-foreground"
        >
          {open ? "Done" : "Change"}
          <ChevronDown
            aria-hidden
            className={`size-4 transition-transform ${open ? "rotate-180" : ""}`}
          />
        </Button>
      </div>

      {open && (
        <div
          id={panelId}
          className="space-y-3 rounded-2xl border border-border bg-secondary/30 p-3"
        >
          <fieldset>
            <legend className="sr-only">Colour</legend>
            <div className="flex flex-wrap gap-1">
              {ACCENT_KEYS.map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => onAccentChange(key)}
                  aria-pressed={accent === key}
                  aria-label={SPACE_ACCENTS[key].label}
                  title={SPACE_ACCENTS[key].label}
                  className="grid size-11 place-items-center rounded-xl border border-transparent transition-colors hover:bg-background focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary aria-pressed:border-primary/40 aria-pressed:bg-background sm:size-9"
                >
                  {/* The ring, not a tick: a checkmark over a pastel swatch is either
                      invisible or has to be dark enough to change the colour it sits on. */}
                  <span
                    aria-hidden
                    className={`size-6 rounded-full ring-1 ring-black/5 sm:size-5 ${SPACE_ACCENTS[key].swatch}`}
                  />
                </button>
              ))}
            </div>
          </fieldset>

          <div className="relative">
            <Search
              aria-hidden
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search icons"
              aria-label="Search icons"
              className="h-11 rounded-xl border border-border bg-card pl-9 text-[13.5px] focus-visible:border-primary/40 focus-visible:ring-4 focus-visible:ring-primary/10"
            />
          </div>

          <div
            ref={gridRef}
            onKeyDown={onGridKeyDown}
            role="group"
            aria-label="Icons"
            className="max-h-56 space-y-3 overflow-y-auto overscroll-contain pr-1"
          >
            <div className="grid grid-cols-6 gap-1">
              <button
                type="button"
                data-icon-btn
                tabIndex={tabbable(null)}
                aria-pressed={icon === null}
                aria-label="No icon"
                title="No icon"
                onClick={() => onIconChange(null)}
                className={iconButton}
              >
                <Ban className="size-5" strokeWidth={1.75} aria-hidden />
              </button>
            </div>

            {results ? (
              results.length ? (
                <div className="grid grid-cols-6 gap-1">
                  {results.map(renderIcon)}
                </div>
              ) : (
                <p className="px-1 py-6 text-center text-[12.5px] text-muted-foreground">
                  No icons match “{query.trim()}”.
                </p>
              )
            ) : (
              SPACE_ICON_GROUPS.map((group) => (
                <div key={group.label} className="space-y-1">
                  <p className="px-1 text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {group.label}
                  </p>
                  <div className="grid grid-cols-6 gap-1">
                    {group.icons.map(renderIcon)}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
