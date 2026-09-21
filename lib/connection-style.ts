import type { ConnectionDirection, Relation } from "@/lib/types";

/**
 * How a relation is worded and coloured.
 *
 * **Two labels per relation, because an edge is stored once and read from both ends.**
 * "A is part of B" read from B's page has to say *has part*, not *part of*, or half the
 * connections in the app render backwards. `related_to` and `contradicts` are symmetric
 * and carry one wording for both directions — the backend normalises those so their
 * stored direction is fixed and meaningless.
 *
 * **The classes are written out in full.** Tailwind scans source text for literals, so a
 * template like `bg-${tone}-50` never reaches the stylesheet and the chip renders with no
 * background at all — nothing errors, it just looks broken. Same rule `lib/space-accent.ts`
 * follows for its gradients.
 */
export type RelationStyle = {
  /** What this edge says when read from the memory it points *away* from. */
  outgoing: string;
  /** And from the memory it points *at*. Equal to `outgoing` when symmetric. */
  incoming: string;
  chip: string;
  dot: string;
};

export const relationStyle: Record<Relation, RelationStyle> = {
  related_to: {
    outgoing: "Related to",
    incoming: "Related to",
    chip: "bg-sky-50 text-sky-700 ring-sky-200/70",
    dot: "bg-sky-400",
  },
  duplicate_of: {
    // Symmetric, so one wording both ways — and deliberately not "Duplicate of", which
    // reads as an accusation about which copy is the real one. Neither is.
    outgoing: "Same as",
    incoming: "Same as",
    chip: "bg-orange-50 text-orange-700 ring-orange-200/70",
    dot: "bg-orange-400",
  },
  expands: {
    outgoing: "Expands",
    incoming: "Expanded by",
    chip: "bg-emerald-50 text-emerald-700 ring-emerald-200/70",
    dot: "bg-emerald-400",
  },
  supports: {
    outgoing: "Supports",
    incoming: "Supported by",
    chip: "bg-teal-50 text-teal-700 ring-teal-200/70",
    dot: "bg-teal-400",
  },
  contradicts: {
    outgoing: "Contradicts",
    incoming: "Contradicts",
    chip: "bg-rose-50 text-rose-700 ring-rose-200/70",
    dot: "bg-rose-400",
  },
  inspired_by: {
    outgoing: "Inspired by",
    incoming: "Inspired",
    chip: "bg-violet-50 text-violet-700 ring-violet-200/70",
    dot: "bg-violet-400",
  },
  depends_on: {
    outgoing: "Depends on",
    incoming: "Depended on by",
    chip: "bg-slate-100 text-slate-700 ring-slate-200/70",
    dot: "bg-slate-400",
  },
  example_of: {
    outgoing: "Example of",
    incoming: "Has example",
    chip: "bg-cyan-50 text-cyan-700 ring-cyan-200/70",
    dot: "bg-cyan-400",
  },
  part_of: {
    outgoing: "Part of",
    incoming: "Has part",
    chip: "bg-amber-50 text-amber-700 ring-amber-200/70",
    dot: "bg-amber-400",
  },
};

/**
 * Every relation, in the order a picker should offer them: weakest and most common first.
 *
 * **`Record<Relation, ...>` above is checked by the compiler; this array is not.** Adding
 * `duplicate_of` to the type made `relationStyle` fail to compile until it gained an entry
 * — and left this list quietly one short, which presents as a relation that exists
 * everywhere except in the dropdown a person picks from. The length assertion below is
 * what turns that back into a build error.
 */
export const RELATIONS: Relation[] = [
  "related_to",
  "duplicate_of",
  "expands",
  "supports",
  "example_of",
  "part_of",
  "depends_on",
  "inspired_by",
  "contradicts",
];

// Compile-time only: `RELATIONS` must offer every key `relationStyle` defines. Erased by
// the type checker, so it costs nothing at runtime.
type _EveryRelationIsOffered = Exclude<Relation, (typeof RELATIONS)[number]> extends never
  ? true
  : ["RELATIONS is missing a relation", Exclude<Relation, (typeof RELATIONS)[number]>];
const _relationsAreComplete: _EveryRelationIsOffered = true;
void _relationsAreComplete;

/** The wording for an edge as read from one particular end. */
export function relationLabel(
  relation: Relation,
  direction: ConnectionDirection,
): string {
  const style = relationStyle[relation];
  return direction === "outgoing" ? style.outgoing : style.incoming;
}
