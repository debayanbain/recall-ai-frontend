import { Position, type InternalNode, type Node } from "@xyflow/react";

/**
 * Where an edge should touch the two cards it joins.
 *
 * The canvas used to dock every edge on a fixed pair of handles — out of the source's
 * right side, into the target's left. That is correct exactly when the target happens to
 * sit to the right, and a force layout has no such rule: half the edges left the card on
 * the far side from where they were going, looped back around it, and crossed their own
 * node on the way. It reads as a broken graph rather than as a curve.
 *
 * A *floating* edge has no fixed dock. Each end is the point where the straight line
 * between the two card centres crosses that card's rectangle, so an edge always leaves
 * facing the memory it points at, from whichever side that is. Three things about it:
 *
 * **It is geometry, not a per-frame guess.** The intersection is a closed-form solution
 * on the rectangle, recomputed only when a node actually moves — React Flow re-renders an
 * edge when either endpoint's internal position changes, and nothing else ticks.
 *
 * **`Position` is still derived**, because the bezier control points come off it: a curve
 * leaving a left edge has to bulge left or it kinks against the card it just left. It is
 * read from which side the intersection landed on, not from the angle, so a point a pixel
 * inside a corner picks the side it is actually on.
 *
 * **A node with no measurement yet yields nothing.** React Flow measures on the first
 * frame; before that `measured.width` is undefined and every intersection collapses to the
 * node origin, which draws every edge as a line to the top-left corner of the canvas.
 * Returning null draws no edge for one frame instead.
 */

export type EdgeAnchors = {
  sx: number;
  sy: number;
  tx: number;
  ty: number;
  sourcePos: Position;
  targetPos: Position;
};

type Box = { x: number; y: number; w: number; h: number };

function boxOf(node: InternalNode<Node>): Box | null {
  const w = node.measured?.width;
  const h = node.measured?.height;
  const at = node.internals?.positionAbsolute;
  if (!w || !h || !at) return null;
  return { x: at.x, y: at.y, w, h };
}

/** The point where the line toward `toward` leaves the rectangle `box`. */
function intersect(box: Box, toward: Box): { x: number; y: number } {
  const w = box.w / 2;
  const h = box.h / 2;
  const cx = box.x + w;
  const cy = box.y + h;
  const dx = toward.x + toward.w / 2 - cx;
  const dy = toward.y + toward.h / 2 - cy;

  // Two cards stacked exactly on top of each other have no direction to leave in; the
  // centre is the only answer that is not a NaN.
  if (dx === 0 && dy === 0) return { x: cx, y: cy };

  // Scale the direction until it touches the nearer of the two rectangle bounds.
  const scale = Math.min(
    dx === 0 ? Number.POSITIVE_INFINITY : w / Math.abs(dx),
    dy === 0 ? Number.POSITIVE_INFINITY : h / Math.abs(dy),
  );
  return { x: cx + dx * scale, y: cy + dy * scale };
}

/** Which side of `box` the point `p` sits on. Ties go to the horizontal sides. */
function sideOf(box: Box, p: { x: number; y: number }): Position {
  const left = Math.abs(p.x - box.x);
  const right = Math.abs(p.x - (box.x + box.w));
  const top = Math.abs(p.y - box.y);
  const bottom = Math.abs(p.y - (box.y + box.h));
  const nearest = Math.min(left, right, top, bottom);
  if (nearest === left) return Position.Left;
  if (nearest === right) return Position.Right;
  if (nearest === top) return Position.Top;
  return Position.Bottom;
}

export function getEdgeAnchors(
  source: InternalNode<Node> | undefined,
  target: InternalNode<Node> | undefined,
): EdgeAnchors | null {
  if (!source || !target) return null;
  const a = boxOf(source);
  const b = boxOf(target);
  if (!a || !b) return null;

  const from = intersect(a, b);
  const to = intersect(b, a);
  return {
    sx: from.x,
    sy: from.y,
    tx: to.x,
    ty: to.y,
    sourcePos: sideOf(a, from),
    targetPos: sideOf(b, to),
  };
}
