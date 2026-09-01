/**
 * Space accent keys → the gradient classes the cards draw with.
 *
 * The backend stores a *key* ("violet"), never a class string. A column holding
 * `from-violet-200 via-indigo-100 to-purple-50` is a column coupled to a Tailwind
 * version, and it breaks silently on their next major — the class stops existing, the
 * card renders with no background, and nothing errors.
 *
 * The class strings are written out in full rather than interpolated, because Tailwind
 * scans source text for literals: `from-${color}-200` is a class that never reaches the
 * stylesheet.
 */

export const SPACE_ACCENTS = {
  violet: {
    label: "Violet",
    /** Card header and hero background. */
    gradient: "from-violet-200 via-indigo-100 to-purple-50",
    /** A solid swatch for the picker, where a three-stop gradient reads as mud. */
    swatch: "bg-violet-300",
  },
  rose: {
    label: "Rose",
    gradient: "from-rose-200 via-orange-100 to-amber-50",
    swatch: "bg-rose-300",
  },
  emerald: {
    label: "Emerald",
    gradient: "from-emerald-200 via-teal-100 to-cyan-50",
    swatch: "bg-emerald-300",
  },
  amber: {
    label: "Amber",
    gradient: "from-amber-200 via-yellow-100 to-orange-50",
    swatch: "bg-amber-300",
  },
  sky: {
    label: "Sky",
    gradient: "from-sky-200 via-cyan-100 to-blue-50",
    swatch: "bg-sky-300",
  },
  fuchsia: {
    label: "Fuchsia",
    gradient: "from-fuchsia-200 via-pink-100 to-rose-50",
    swatch: "bg-fuchsia-300",
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
export function accentFor(space: { id: string; accent: string | null }): SpaceAccent {
  if (space.accent && space.accent in SPACE_ACCENTS) return space.accent as SpaceAccent;
  return ACCENT_KEYS[hash(space.id) % ACCENT_KEYS.length];
}

export function gradientFor(space: { id: string; accent: string | null }): string {
  return SPACE_ACCENTS[accentFor(space)].gradient;
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
