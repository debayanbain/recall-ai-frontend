/**
 * The gradient a memory's banner and tile draw with.
 *
 * Every memory gets its own colour, generated from its id rather than picked from a
 * short list. The list was six Tailwind class pairs indexed by `id % 6`, so a wall of
 * cards repeated the same six washes every sixth item and two memories side by side were
 * routinely the same colour — the accent stopped telling one card from another, which is
 * the only job it has.
 *
 * Three properties hold this together:
 *
 * * **Deterministic, not random.** `Math.random()` would give a card a different colour
 *   on every refetch and disagree with the server-rendered HTML, which makes React throw
 *   the tree away. The hash is FNV-1a rather than the `h * 31 + c` one used for card
 *   heights: ids differing in one character (`…a1` / `…a2`) must land far apart in hue,
 *   and the multiply-add hash puts them next to each other.
 * * **CSS, not Tailwind classes.** Tailwind scans source text for literals, so
 *   `from-${hue}` is a class that never reaches the stylesheet. The value is an inline
 *   `background-image` instead — and it is built only from numbers this module computed,
 *   never from the id's characters, so an id is not a route into the style attribute.
 * * **Pastel, by construction.** Lightness and chroma are pinned to the range the old
 *   `-100 → -50` pairs occupied, so the white type badge and the dark text over the
 *   banner keep the contrast they were designed against. Hue is the only free dimension.
 */

/** oklch lightness per stop: light, lighter, lightest — the old 100 → 50 ramp. */
const LIGHTNESS = [0.938, 0.957, 0.975] as const;

/** Chroma falls toward the pale end, so the gradient reads as one colour thinning out. */
const CHROMA_FALLOFF = [1, 0.72, 0.42] as const;

/** Matches `bg-linear-to-br`, which is what every accent surface used before. */
const ANGLE = 135;

/**
 * FNV-1a, 32-bit. Chosen for avalanche: one changed character in a uuid moves the whole
 * hash, and therefore the hue, rather than nudging it a few degrees.
 */
function hash32(value: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < value.length; i++) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/**
 * A CSS `linear-gradient(...)` unique to `id`.
 *
 * Three stops rather than two: the second hue is offset from the first by 22°-66°, which
 * is wide enough to read as a blend of two colours and narrow enough to stay analogous —
 * complements at this lightness mix through grey and the card looks dirty. The direction
 * of the offset comes from the hash too, so a hue is approached from both sides across
 * the collection.
 *
 * ~3600 base hues x 5 spreads x 2 directions x 4 chromas, which is not a guarantee of
 * uniqueness (nothing stateless can give one) but is far past the point where two cards
 * on a screen collide.
 */
export function memoryGradient(id: string): string {
  const h = hash32(id);

  const base = (h % 3600) / 10;
  const spread = (22 + ((h >>> 12) % 5) * 11) * ((h >>> 17) & 1 ? 1 : -1);
  const chroma = 0.048 + ((h >>> 20) % 4) * 0.009;

  const stops = LIGHTNESS.map((lightness, i) => {
    const hue =
      (((base + spread * (i / (LIGHTNESS.length - 1))) % 360) + 360) % 360;
    const c = (chroma * CHROMA_FALLOFF[i]).toFixed(4);
    return `oklch(${lightness} ${c} ${hue.toFixed(1)}) ${i * 50}%`;
  });

  return `linear-gradient(${ANGLE}deg, ${stops.join(", ")})`;
}

/** The same value as a style object, since every call site sets `background-image`. */
export function memoryAccent(id: string): { backgroundImage: string } {
  return { backgroundImage: memoryGradient(id) };
}
