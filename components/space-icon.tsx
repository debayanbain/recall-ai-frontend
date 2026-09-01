import { createElement } from "react";
import { emojiFor, iconColorFor } from "@/lib/space-accent";
import { iconComponent } from "@/lib/space-icons";

/**
 * The mark on a Space's tile: its chosen icon, else the emoji it had before icons
 * existed, else a neutral diamond.
 *
 * Three states rather than two because the fallback order *is* the migration. A Space
 * created before the picker has an emoji its owner typed, and rewriting those into icon
 * names would be a guess at what someone meant — so `icon` wins where it is set, `emoji`
 * still renders where it is not, and neither being present draws a mark nobody chose but
 * that at least says nothing.
 *
 * Sized in `em`, not in a fixed step: every call site already sets a font size on the tile
 * for the emoji it used to draw, so `size-[1em]` makes the icon inherit exactly that and
 * no caller has to learn a second sizing prop.
 */
export function SpaceGlyph({
  space,
  className = "",
}: {
  space: {
    id: string;
    icon?: string | null;
    emoji: string | null;
    accent: string | null;
  };
  /** Goes on the wrapper — set the font size here and the icon follows it. */
  className?: string;
}) {
  // `createElement` rather than `<Icon />`: the value is looked up from a module-level
  // map of static imports, not built here, but a capitalized local rendered as JSX is
  // indistinguishable from a component defined during render to the lint rule.
  const icon = iconComponent(space.icon);
  return (
    <span
      aria-hidden
      className={`inline-flex items-center justify-center ${className}`}
    >
      {icon
        ? createElement(icon, {
            className: `size-[1em] ${iconColorFor(space)}`,
            strokeWidth: 1.75,
          })
        : emojiFor(space)}
    </span>
  );
}
