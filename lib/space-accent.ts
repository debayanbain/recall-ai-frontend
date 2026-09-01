/**
 * Space accent keys → the gradient classes the cards draw with, and the colour the
 * Space's icon is drawn in over them.
 *
 * The backend stores a *key* ("violet"), never a class string. A column holding
 * `from-violet-200 via-indigo-100 to-purple-50` is a column coupled to a Tailwind
 * version, and it breaks silently on their next major — the class stops existing, the
 * card renders with no background, and nothing errors.
 *
 * The class strings are written out in full rather than interpolated, because Tailwind
 * scans source text for literals: `from-${color}-200` is a class that never reaches the
 * stylesheet.
 *
 * `icon` is a `-700` (or `-800` for the warm hues, which are lighter at the same step)
 * against a `-200 → -50` wash, so the glyph clears WCAG's 3:1 for non-text and stays
 * legible in the 20px tile the sidebar draws it in. A `-500` reads as decoration and
 * disappears on the pale end of the gradient.
 */

export const SPACE_ACCENTS = {
  violet: {
    label: "Violet",
    gradient: "from-violet-200 via-indigo-100 to-purple-50",
    swatch: "bg-violet-300",
    icon: "text-violet-700",
  },
  indigo: {
    label: "Indigo",
    gradient: "from-indigo-200 via-blue-100 to-violet-50",
    swatch: "bg-indigo-300",
    icon: "text-indigo-700",
  },
  blue: {
    label: "Blue",
    gradient: "from-blue-200 via-sky-100 to-indigo-50",
    swatch: "bg-blue-300",
    icon: "text-blue-700",
  },
  sky: {
    label: "Sky",
    gradient: "from-sky-200 via-cyan-100 to-blue-50",
    swatch: "bg-sky-300",
    icon: "text-sky-700",
  },
  cyan: {
    label: "Cyan",
    gradient: "from-cyan-200 via-teal-100 to-sky-50",
    swatch: "bg-cyan-300",
    icon: "text-cyan-700",
  },
  teal: {
    label: "Teal",
    gradient: "from-teal-200 via-emerald-100 to-cyan-50",
    swatch: "bg-teal-300",
    icon: "text-teal-700",
  },
  emerald: {
    label: "Emerald",
    gradient: "from-emerald-200 via-teal-100 to-cyan-50",
    swatch: "bg-emerald-300",
    icon: "text-emerald-700",
  },
  green: {
    label: "Green",
    gradient: "from-green-200 via-lime-100 to-emerald-50",
    swatch: "bg-green-300",
    icon: "text-green-700",
  },
  lime: {
    label: "Lime",
    gradient: "from-lime-200 via-green-100 to-yellow-50",
    swatch: "bg-lime-300",
    icon: "text-lime-800",
  },
  amber: {
    label: "Amber",
    gradient: "from-amber-200 via-yellow-100 to-orange-50",
    swatch: "bg-amber-300",
    icon: "text-amber-800",
  },
  orange: {
    label: "Orange",
    gradient: "from-orange-200 via-amber-100 to-red-50",
    swatch: "bg-orange-300",
    icon: "text-orange-800",
  },
  red: {
    label: "Red",
    gradient: "from-red-200 via-orange-100 to-rose-50",
    swatch: "bg-red-300",
    icon: "text-red-700",
  },
  rose: {
    label: "Rose",
    gradient: "from-rose-200 via-orange-100 to-amber-50",
    swatch: "bg-rose-300",
    icon: "text-rose-700",
  },
  pink: {
    label: "Pink",
    gradient: "from-pink-200 via-rose-100 to-fuchsia-50",
    swatch: "bg-pink-300",
    icon: "text-pink-700",
  },
  fuchsia: {
    label: "Fuchsia",
    gradient: "from-fuchsia-200 via-pink-100 to-rose-50",
    swatch: "bg-fuchsia-300",
    icon: "text-fuchsia-700",
  },
  purple: {
    label: "Purple",
    gradient: "from-purple-200 via-fuchsia-100 to-violet-50",
    swatch: "bg-purple-300",
    icon: "text-purple-700",
  },
  slate: {
    label: "Slate",
    gradient: "from-slate-200 via-zinc-100 to-slate-50",
    swatch: "bg-slate-300",
    icon: "text-slate-700",
  },
  stone: {
    label: "Stone",
    gradient: "from-stone-200 via-amber-100 to-stone-50",
    swatch: "bg-stone-300",
    icon: "text-stone-700",
  },
} as const;

export type SpaceAccent = keyof typeof SPACE_ACCENTS;

export const ACCENT_KEYS = Object.keys(SPACE_ACCENTS) as SpaceAccent[];

/**
 * Stable pseudo-random index from a string.
 *
 * The same hash `lib/vault-adapter.ts` uses for card heights, and for the same reason:
 * `Math.random()` would give a Space a different colour on every refetch and disagree
 * with the server-rendered HTML, which makes React throw away the tree.
 */
function hash(value: string): number {
  let h = 0;
  for (let i = 0; i < value.length; i++) h = (h * 31 + value.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/**
 * The accent a Space draws with.
 *
 * An unset accent falls back to a hash of the id rather than to one default colour, so a
 * wall of Spaces nobody has styled still reads as distinct cards. An accent key the
 * client does not recognise — an older or newer server — falls back the same way instead
 * of rendering nothing.
 */
export function accentFor(space: {
  id: string;
  accent: string | null;
}): SpaceAccent {
  if (space.accent && space.accent in SPACE_ACCENTS)
    return space.accent as SpaceAccent;
  return ACCENT_KEYS[hash(space.id) % ACCENT_KEYS.length];
}

export function gradientFor(space: {
  id: string;
  accent: string | null;
}): string {
  return SPACE_ACCENTS[accentFor(space)].gradient;
}

/** The text colour a Space's icon is drawn in, over `gradientFor`'s wash. */
export function iconColorFor(space: {
  id: string;
  accent: string | null;
}): string {
  return SPACE_ACCENTS[accentFor(space)].icon;
}

/**
 * The glyph on a Space's tile.
 *
 * Falls back to a neutral mark, never to a random emoji: a picture nobody chose reads as
 * meaning something it does not.
 */
export function emojiFor(space: { emoji: string | null }): string {
  return space.emoji?.trim() || "◆";
}
