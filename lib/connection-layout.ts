import { Position } from "@xyflow/react";

/**
 * Where each connected memory sits on the canvas, and which side its edge leaves from.
 *
 * This replaces six hand-placed `{x, y}` pairs that only ever described one fixture. Pure
 * and deterministic — no `Math.random()` — so the server and the client agree on the first
 * render, the same constraint `lib/space-accent.ts` and `lib/vault-adapter.ts` are written
 * under.
 *
 * An **ellipse, not a circle**: the cards are 210x96, so equal radii crowd horizontally
 * long before they crowd vertically. The first node sits at top-centre, which is where the
 * hand-placed layout started too.
 *
 * The handle each edge docks to follows the angle's dominant axis, which is exactly what
 * the old `from`/`to` values encoded by hand — it is what keeps the bezier from doubling
 * back across its own card.
 */
export type NodePlacement = {
  position: { x: number; y: number };
  /** Which side of the neighbour the edge leaves from. */
  from: Position;
  /** Which side of the focus card it arrives at. */
  to: Position;
};

//: The ring has to fit *inside* the canvas, which is 600px tall (720 at `lg`) and as wide
//: as the page. A `radiusY` of 300 put the top and bottom cards 600px apart before their
//: own height was counted, so the ring was taller than the box that holds it and the outer
//: cards were cut off. Height is the scarce axis here; width is not.
const DEFAULT_RADIUS_X = 460;
const DEFAULT_RADIUS_Y = 200;

/**
 * Past this many nodes a single ring stops being readable — the labels collide and the
 * picture says less than the list beside it. The graph shows this many and says so; the
 * cards show everything.
 */
export const MAX_GRAPH_NODES = 12;

/**
 * Radii that put the whole ring inside a canvas of this size, so React Flow's `fitView`
 * has nothing left to shrink.
 *
 * Fixed radii were legible only on a wide monitor: 460x200 needs about 1130x508, which at
 * a 1024px window (a ~700px canvas) forced 0.54 zoom and a 7px title. Scaling instead
 * means the ring tightens as the window narrows and the cards stay readable -- the graph
 * gets denser rather than smaller.
 *
 * `card` is the neighbour's own size, which has to come out of the budget: a node's
 * position is its top-left corner, so the ring's extent is twice the radius *plus* one
 * card. The floors stop the ring collapsing into the focus card on a very small canvas;
 * the ceilings stop it sprawling on a very large one, where more space should read as
 * generous rather than as a bigger diagram.
 */
export function fittedRadii(
  canvas: { width: number; height: number },
  card: { width: number; height: number },
): { radiusX: number; radiusY: number } {
  // The same 12% breathing room `fitViewOptions` asks for, taken up front.
  const usableX = canvas.width * 0.88 - card.width;
  const usableY = canvas.height * 0.88 - card.height;
  return {
    radiusX: Math.min(DEFAULT_RADIUS_X, Math.max(150, usableX / 2)),
    radiusY: Math.min(DEFAULT_RADIUS_Y, Math.max(110, usableY / 2)),
  };
}

export function radialLayout(
  count: number,
  options: { radiusX?: number; radiusY?: number } = {},
): NodePlacement[] {
  const radiusX = options.radiusX ?? DEFAULT_RADIUS_X;
  const radiusY = options.radiusY ?? DEFAULT_RADIUS_Y;
  if (count <= 0) return [];

  // **Where the ring starts depends on how many are on it.** With one or two neighbours a
  // ring is not a ring, it is a line -- and starting at twelve o'clock makes it a
  // *vertical* line, which is the worst possible use of a canvas far wider than it is
  // tall: two cards stacked in a column, the whole width empty, and both ends clipped.
  // Starting at three o'clock lays those cases out left-and-right instead. From three
  // neighbours up there is a real ring, and twelve o'clock is the natural top of it.
  const start = count <= 2 ? 0 : -Math.PI / 2;

  return Array.from({ length: count }, (_, index) => {
    const angle = start + (index * 2 * Math.PI) / count;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    // Which way the edge should run: whichever axis this node is further along.
    const horizontal = Math.abs(cos) > Math.abs(sin);
    return {
      position: { x: cos * radiusX, y: sin * radiusY },
      from: horizontal
        ? cos > 0
          ? Position.Left
          : Position.Right
        : sin > 0
          ? Position.Top
          : Position.Bottom,
      to: horizontal
        ? cos > 0
          ? Position.Right
          : Position.Left
        : sin > 0
          ? Position.Bottom
          : Position.Top,
    };
  });
}
