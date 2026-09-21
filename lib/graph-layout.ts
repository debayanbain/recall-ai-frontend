import {
  forceCenter,
  forceCollide,
  forceLink,
  forceManyBody,
  forceSimulation,
  forceX,
  forceY,
  type SimulationLinkDatum,
  type SimulationNodeDatum,
} from "d3-force";

/**
 * Where every memory sits on the whole-vault canvas.
 *
 * `lib/connection-layout.ts` answers a different question and both are kept: that one
 * places neighbours on a ring around **one** focus memory, which is a layout only because
 * the shape is known in advance. A vault graph has no focus and no known shape, so the
 * positions have to be solved rather than assigned.
 *
 * Four things about this are decisions.
 *
 * **It runs to completion synchronously and then stops.** `simulation.tick()` in a loop
 * rather than the animated `simulation.restart()` the library defaults to. A graph that
 * is still settling while somebody is trying to click a card is a graph that moves out
 * from under the cursor, and the arrival animation nobody asked for costs the one
 * interaction the page exists for. Positions are computed once and handed to React Flow,
 * which owns dragging from then on.
 *
 * **It is deterministic.** d3-force seeds unpositioned nodes on a phyllotaxis spiral, not
 * randomly, so the same graph lays out the same way twice — which is what makes a
 * re-render after a confirm keep the picture the person was looking at. `seed` is threaded
 * through anyway for the nodes it does place, because the ordering of `nodes` decides it
 * and that ordering comes off the server.
 *
 * **Suggested edges pull more weakly than confirmed ones.** A ghost edge is a question,
 * not a fact, and letting one drag two memories together as hard as an accepted edge would
 * make the picture assert something nobody has agreed to yet.
 *
 * **Collision is sized from the real card, not from a point.** Nodes here are ~210x110
 * rectangles; a collision radius smaller than the card means cards that overlap while the
 * simulation reports itself as settled.
 */

/** The size a node is drawn at. The collision radius is derived from it. */
export const NODE_SIZE = { width: 212, height: 112 };

/** How hard the whole thing is solved. 300 is d3's own default and is plenty here. */
const TICKS = 320;

type Positioned = SimulationNodeDatum & { id: string };
type Pull = SimulationLinkDatum<Positioned> & { strength: number };

export type LayoutEdge = {
  source: string;
  target: string;
  /** A suggestion pulls at roughly a third of the strength — see the module docstring. */
  suggested?: boolean;
};

export type Placement = { x: number; y: number };

/**
 * Solve positions for `nodes`, given `edges` between them.
 *
 * Edges naming a node that is not in `nodes` are dropped rather than throwing: d3-force
 * resolves link endpoints by id and raises on a miss, and the two arrays come from one
 * response over a network — a mismatch is a stale render, not a reason to blank the page.
 */
export function forceLayout(
  nodes: readonly { id: string }[],
  edges: readonly LayoutEdge[],
  { width = 1200, height = 720 }: { width?: number; height?: number } = {},
): Map<string, Placement> {
  if (nodes.length === 0) return new Map();
  if (nodes.length === 1) {
    return new Map([[nodes[0].id, { x: width / 2, y: height / 2 }]]);
  }

  const simNodes: Positioned[] = nodes.map((node) => ({ id: node.id }));
  const present = new Set(simNodes.map((node) => node.id));
  const pulls: Pull[] = edges
    .filter((edge) => present.has(edge.source) && present.has(edge.target))
    .map((edge) => ({
      source: edge.source,
      target: edge.target,
      strength: edge.suggested ? 0.12 : 0.38,
    }));

  const radius = Math.hypot(NODE_SIZE.width, NODE_SIZE.height) / 2;
  // Denser graphs need to spread further or the middle becomes a solid block. Scaled by
  // the square root of the node count, which is how area grows with them.
  const spread = Math.max(180, radius * 1.6 * Math.sqrt(nodes.length) * 0.5);

  const simulation = forceSimulation(simNodes)
    .force(
      "link",
      forceLink<Positioned, Pull>(pulls)
        .id((node) => node.id)
        .distance(spread)
        .strength((link) => link.strength),
    )
    // Repulsion, capped: an uncapped charge over a few hundred nodes is O(n^2) in the
    // browser and the tail of it moves nothing anybody can see.
    .force("charge", forceManyBody<Positioned>().strength(-320).distanceMax(900))
    .force("collide", forceCollide<Positioned>(radius * 1.05).iterations(2))
    .force("center", forceCenter(width / 2, height / 2))
    // Gentle pull toward the middle so disconnected clusters do not drift off the canvas
    // and leave the viewport mostly empty. Weak enough that it does not fight `link`.
    .force("x", forceX<Positioned>(width / 2).strength(0.03))
    .force("y", forceY<Positioned>(height / 2).strength(0.05))
    .stop();

  simulation.tick(TICKS);

  const placed = new Map<string, Placement>();
  for (const node of simNodes) {
    // `x`/`y` are optional on the d3 type and are always set after a tick; the fallback
    // is what stops a NaN becoming a node React Flow renders at the origin, stacked.
    placed.set(node.id, {
      x: Number.isFinite(node.x) ? (node.x as number) : width / 2,
      y: Number.isFinite(node.y) ? (node.y as number) : height / 2,
    });
  }
  return placed;
}
