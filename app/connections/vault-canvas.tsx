"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Background,
  BackgroundVariant,
  ConnectionMode,
  Controls,
  EdgeLabelRenderer,
  Handle,
  MarkerType,
  Panel,
  Position,
  ReactFlow,
  ReactFlowProvider,
  applyNodeChanges,
  getBezierPath,
  useInternalNode,
  useReactFlow,
  type Connection,
  type ConnectionLineComponentProps,
  type Edge,
  type EdgeProps,
  type EdgeTypes,
  type Node,
  type NodeChange,
  type NodeProps,
  type NodeTypes,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Link2, Sparkles } from "lucide-react";
import { useReducedMotion } from "motion/react";
import { Card, CardContent } from "@/components/ui/card";
import { NODE_SIZE, forceLayout, type LayoutEdge } from "@/lib/graph-layout";
import { getEdgeAnchors } from "@/lib/floating-edge";
import { relationStyle } from "@/lib/connection-style";
import { toMemory } from "@/lib/vault-adapter";
import type { GraphEdge, Relation, VaultGraph, VaultItem } from "@/lib/types";
import { nodeStyle } from "./graph-data";

/**
 * The vault as a canvas you manage, rather than a picture of one you read.
 *
 * `connection-graph.tsx` draws a ring of neighbours around one memory and is read-only.
 * This is the other half of the feature: the whole graph, where **both** ways an edge can
 * come into existence are the same gesture on the same surface — a model proposes one and
 * it appears as a ghost you accept in place, or you drag one card onto another and it is
 * yours. Both are kept; they answer different questions and a focus ring is still the
 * better answer to "how does *this* memory relate to things".
 *
 * Seven things here are decisions rather than details.
 *
 * **Positions are solved once and then owned by the person.** `forceLayout` runs
 * synchronously to completion (see that module for why it does not animate), and from
 * then on React Flow owns dragging. A refetch that re-solved the layout would rearrange
 * the picture under a cursor every thirty seconds; `placed` is keyed by the *topology*, so
 * a poll that changes nothing moves nothing.
 *
 * **Edges float; they do not dock.** Each end is computed from the two cards' geometry
 * (`lib/floating-edge.ts`), so a connection always leaves the side facing the memory it
 * points at. The fixed right-to-left handles this replaced were correct only for the
 * targets that happened to sit to the right — every other edge left the far side of its
 * card and looped back across it.
 *
 * **The canvas draws confirmed edges only.** A vault's worth of derived suggestions is
 * two dozen dashed lines and as many chips over a dozen cards, and the picture stops
 * being readable at exactly the moment it has something to say -- those crossings are the
 * model's guesses, not the person's vault. Suggestions have a surface already: the review
 * panel beside this one, where each is a decision with two buttons rather than a thread
 * to squint at. Accepting one there makes it appear here, which is the honest order.
 * `RelEdge` keeps its ghost styling for the moment that changes back.
 *
 * **Dismissed edges are never drawn.** The row is kept server-side so the derivation
 * cannot re-propose the pair, but putting somebody's own "no" back on the canvas makes a
 * decision they already took look undone.
 *
 * **Selecting a node dims everything it does not touch.** With a few hundred edges the
 * useful question is never "what does the whole vault look like" — it is "what does this
 * one sit next to", and dimming answers it without navigating away.
 *
 * **Every action here is also in the review list beside it.** A canvas is a pointer
 * device, and drag-to-connect has no keyboard equivalent worth pretending about; the list
 * is the accessible path and it is not a fallback view, it is the same actions rendered
 * for a different input. That is why this component does not try to make its own
 * affordances keyboard-reachable beyond what React Flow already does (nodes are focusable
 * and openable; edges are selectable).
 *
 * **It owns no server state.** Every mutation is the caller's, so one place invalidates
 * and the list and the canvas cannot disagree about what just happened.
 */

export type CanvasProps = {
  graph: VaultGraph;
  /** The edge the inspector is open on, or null. Owned by the caller. */
  selectedEdgeId: string | null;
  onSelectEdge: (edgeId: string | null) => void;
  /** A card dragged onto another. The caller asks which relation and writes the edge. */
  onDraw: (sourceId: string, targetId: string) => void;
  /** Edges with a mutation in flight, drawn as busy rather than as gone. */
  busyEdgeIds?: ReadonlySet<string>;
};

type MemoryNodeData = {
  item: VaultItem;
  dim: boolean;
  /** How many live edges touch this memory. Rendered as a count, not as a size. */
  degree: number;
  /** A card currently being dragged over, which dropping would connect to. */
  dropTarget: boolean;
};
type RelEdgeData = {
  edge: GraphEdge;
  dim: boolean;
  busy: boolean;
  selected: boolean;
};

type MemoryFlowNode = Node<MemoryNodeData, "memory">;
type RelFlowEdge = Edge<RelEdgeData, "rel">;

/**
 * Handles exist so a drag has somewhere to start and somewhere to land.
 *
 * Four per card and all of them `source`: `ConnectionMode.Loose` lets a source accept a
 * drop, so every dot is both ends of the gesture and nobody has to find the one that
 * isn't. They carry no meaning for *drawing* an edge — a rendered edge computes its own
 * anchors — so which one a person grabs never shows up in the picture.
 */
const handleClass =
  "!size-3 !border-2 !border-background !bg-primary !opacity-0 !shadow-sm transition-opacity duration-150 group-hover:!opacity-100 group-focus-within:!opacity-100";

const SIDES = [Position.Top, Position.Right, Position.Bottom, Position.Left];

function NodeHandles() {
  return (
    <>
      {SIDES.map((position) => (
        <Handle
          key={position}
          id={position}
          type="source"
          position={position}
          isConnectable
          className={handleClass}
        />
      ))}
    </>
  );
}

function MemoryNode({ data, selected }: NodeProps<MemoryFlowNode>) {
  const memory = toMemory(data.item);
  const style = nodeStyle[memory.kind];
  const { dropTarget } = data;

  return (
    <div
      style={NODE_SIZE}
      className={`group relative transition-opacity duration-200 ${
        data.dim ? "opacity-25" : "opacity-100"
      }`}
    >
      <NodeHandles />
      <Card
        className={`h-full gap-0 overflow-hidden rounded-2xl border py-0 transition-[box-shadow,border-color] duration-200 ${
          dropTarget
            ? "border-primary bg-primary/[0.04] shadow-[0_20px_48px_-20px_oklch(0.55_0.19_285/0.5)] ring-2 ring-primary/50"
            : selected
              ? "border-primary/60 shadow-[0_16px_40px_-20px_oklch(0.55_0.19_285/0.45)] ring-1 ring-primary/30"
              : "border-border/60 shadow-[0_8px_24px_-18px_rgba(15,23,42,0.35)] group-hover:border-border group-hover:shadow-[0_14px_34px_-20px_rgba(15,23,42,0.4)]"
        }`}
      >
        <CardContent className="flex h-full flex-col p-3.5">
          <div className="flex items-center gap-2">
            <span className={`grid size-6 shrink-0 place-items-center rounded-md ${style.tone}`}>
              <style.icon className="size-3.5" />
            </span>
            <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              {style.label}
            </span>
            {/* The count is only worth the ink when there is something to count -- a "0"
                on every card in an unconnected vault is a column of noise. */}
            {data.degree > 0 && (
              <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-secondary/70 px-1.5 py-0.5 text-[10px] font-medium tabular-nums text-muted-foreground">
                <Link2 className="size-2.5" />
                {data.degree}
              </span>
            )}
          </div>
          {/* Clamped with the full string on hover: a scraped caption is a paragraph and
              the card is a fixed height, so unclamped it runs through the bottom edge.
              `truncation-strategy` -- ellipsis, never a hard cut. */}
          <div
            title={memory.title}
            className="mt-2 line-clamp-2 text-[13px] font-semibold leading-snug tracking-tight"
          >
            {memory.title}
          </div>
        </CardContent>
      </Card>
      {/* Named, not just coloured: a ring says "something is about to happen here" and
          this says which one. `color-not-only`. */}
      {dropTarget && (
        <span className="pointer-events-none absolute -top-2.5 left-1/2 -translate-x-1/2 rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold tracking-wide text-primary-foreground shadow-sm">
          Connect
        </span>
      )}
    </div>
  );
}

/** The stroke a relation is drawn in. Written out — see `lib/connection-style.ts`. */
const strokeFor: Record<string, string> = {
  "bg-sky-400": "oklch(0.7 0.13 235)",
  "bg-orange-400": "oklch(0.72 0.16 62)",
  "bg-emerald-400": "oklch(0.71 0.15 163)",
  "bg-teal-400": "oklch(0.7 0.12 183)",
  "bg-rose-400": "oklch(0.68 0.19 15)",
  "bg-violet-400": "oklch(0.66 0.17 295)",
  "bg-slate-400": "oklch(0.66 0.02 256)",
  "bg-cyan-400": "oklch(0.71 0.12 212)",
  "bg-amber-400": "oklch(0.76 0.15 82)",
};

const FALLBACK_STROKE = "oklch(0.7 0.06 285)";

function edgeStroke(relation: Relation): string {
  return strokeFor[relationStyle[relation].dot] ?? FALLBACK_STROKE;
}

/**
 * Relations that read the same from both ends, and so get no arrowhead.
 *
 * The backend normalises these to point from the lower id, which makes their stored
 * direction an implementation detail. Drawing an arrow on one would assert a direction
 * nobody chose — the same inversion `relationLabel` exists to avoid.
 */
const SYMMETRIC = new Set<Relation>(["related_to", "duplicate_of", "contradicts"]);

function RelEdge({ id, source, target, markerEnd, data }: EdgeProps<RelFlowEdge>) {
  const sourceNode = useInternalNode(source);
  const targetNode = useInternalNode(target);
  const anchors = getEdgeAnchors(sourceNode, targetNode);

  // One frame before React Flow has measured the cards. See `lib/floating-edge.ts`.
  if (!anchors) return null;

  const [path, labelX, labelY] = getBezierPath({
    sourceX: anchors.sx,
    sourceY: anchors.sy,
    targetX: anchors.tx,
    targetY: anchors.ty,
    sourcePosition: anchors.sourcePos,
    targetPosition: anchors.targetPos,
    curvature: 0.22,
  });
  const edge = data?.edge;
  const relation = edge?.relation ?? "related_to";
  const style = relationStyle[relation];
  const suggested = edge?.status === "suggested";
  const dim = data?.dim ?? false;
  const selected = data?.selected ?? false;

  return (
    <>
      {/* A wide transparent path under the visible one. A 1.9px stroke is well under the
          44px a pointer target wants, and an edge nobody can hit is an inspector nobody
          opens. */}
      <path
        d={path}
        fill="none"
        strokeWidth={20}
        stroke="transparent"
        strokeLinecap="round"
        className="cursor-pointer"
      />
      <path
        d={path}
        fill="none"
        strokeWidth={selected ? 2.6 : suggested ? 1.5 : 2}
        // Dashed for a proposal, solid for an accepted edge. The single most important
        // visual distinction on this canvas.
        strokeDasharray={suggested ? "5 6" : undefined}
        stroke={edgeStroke(relation)}
        strokeOpacity={dim ? 0.1 : suggested ? 0.6 : 0.95}
        strokeLinecap="round"
        markerEnd={dim ? undefined : markerEnd}
        className={`pointer-events-none transition-[stroke-opacity,stroke-width] duration-200 ${
          data?.busy ? "animate-pulse" : ""
        }`}
      />
      <EdgeLabelRenderer>
        <div
          style={{ transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)` }}
          className={`nodrag nopan absolute transition-opacity duration-200 ${
            dim ? "pointer-events-none opacity-0" : "opacity-100"
          }`}
        >
          <span
            aria-hidden
            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium tracking-normal shadow-sm ring-1 backdrop-blur-sm ${style.chip} ${
              suggested ? "border border-dashed border-current/40" : ""
            } ${selected ? "outline outline-2 outline-offset-1 outline-primary" : ""}`}
          >
            {suggested && <Sparkles className="size-2.5" />}
            {style.outgoing}
          </span>
        </div>
      </EdgeLabelRenderer>
      {/* The accessible name for the edge React Flow has already made selectable. */}
      <title>{`${style.outgoing}${suggested ? " (suggested)" : ""}`}</title>
      <desc id={`edge-${id}-desc`}>{edge?.ai_reason ?? edge?.note ?? ""}</desc>
    </>
  );
}

/**
 * The line under the cursor while a connection is being drawn.
 *
 * React Flow's default is a flat black polyline, which is the one stroke on the canvas
 * that does not look like anything else on it. This is the same bezier an edge is drawn
 * with, dashed because nothing has been written yet, ending in a dot so it is obvious
 * which end the person is holding.
 */
function DraftLine({ fromX, fromY, toX, toY }: ConnectionLineComponentProps) {
  const [path] = getBezierPath({
    sourceX: fromX,
    sourceY: fromY,
    targetX: toX,
    targetY: toY,
    sourcePosition: Position.Right,
    targetPosition: Position.Left,
    curvature: 0.22,
  });
  return (
    <g className="pointer-events-none">
      <path
        d={path}
        fill="none"
        stroke="var(--primary)"
        strokeWidth={2}
        strokeDasharray="6 6"
        strokeLinecap="round"
        strokeOpacity={0.85}
      />
      <circle cx={toX} cy={toY} r={4} fill="var(--primary)" fillOpacity={0.9} />
    </g>
  );
}

/**
 * Dropping one card on another connects them, and this is how much of it has to be over
 * the other before that counts.
 *
 * A gesture the hint text promises has to actually exist: pulling a thread between two
 * small dots is the precise way to draw an edge, and "put this thing on that thing" is
 * the one people try first. It is a *ratio* of the dragged card rather than a distance,
 * so it reads the same at every zoom — at 0.3 the two cards are visibly stacked, which is
 * well past anything a person does by accident while tidying a layout. Nothing is written
 * on the drop either: the caller opens the relation picker, so the worst a mis-drop costs
 * is a dismissed dialog.
 */
const OVERLAP_TO_CONNECT = 0.3;

type Rect = { x: number; y: number; w: number; h: number };

function rectOf(node: MemoryFlowNode): Rect {
  return {
    x: node.position.x,
    y: node.position.y,
    // Measured once React Flow has seen the card; `NODE_SIZE` is what it was rendered at
    // in the meantime, so an overlap computed on the first frame is not computed on zero.
    w: node.measured?.width ?? NODE_SIZE.width,
    h: node.measured?.height ?? NODE_SIZE.height,
  };
}

/** How much of `a` lies over `b`, 0 to 1. */
function overlapRatio(a: Rect, b: Rect): number {
  const w = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
  const h = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
  if (w <= 0 || h <= 0) return 0;
  return (w * h) / (a.w * a.h);
}

const nodeTypes: NodeTypes = { memory: MemoryNode };
const edgeTypes: EdgeTypes = { rel: RelEdge };

export function VaultCanvas(props: CanvasProps) {
  return (
    <ReactFlowProvider>
      <Canvas {...props} />
    </ReactFlowProvider>
  );
}

function Canvas({
  graph,
  selectedEdgeId,
  onSelectEdge,
  onDraw,
  busyEdgeIds,
}: CanvasProps) {
  const reduceMotion = useReducedMotion();
  const { fitView, getNodes } = useReactFlow<MemoryFlowNode, RelFlowEdge>();
  const [focusId, setFocusId] = useState<string | null>(null);
  /** The card a dragged card is currently over. Null for most of every drag. */
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);
  /**
   * The node array React Flow reports changes against, held whole.
   *
   * This used to be a `Map<id, position>` with the nodes rebuilt from it every render,
   * which threw away every change that was not a position -- and the one that mattered
   * most is `dimensions`, how React Flow tells a controlled flow what it measured a card
   * to be. Nothing ever wrote `measured` back, so every node stayed *uninitialized* in
   * the store, with two symptoms that looked unrelated: dragging logged React Flow
   * error 015, and `getEdgePosition` returned null for every edge because
   * `isNodeInitialized` was false -- which is why the canvas drew cards and no
   * connections at all. Keep the array, apply every change to it.
   */
  const [nodes, setNodes] = useState<MemoryFlowNode[]>([]);

  // The *shape* of the graph, not its contents. A poll that returns the same nodes and
  // edges leaves this string untouched, so nothing relayouts and no card moves under a
  // cursor. A confirm changes an edge's status but not the topology -- deliberately, so
  // accepting a suggestion recolours an edge rather than rearranging the vault.
  /**
   * What is actually drawn: confirmed edges, and the memories they touch.
   *
   * Nodes are narrowed along with the edges rather than kept whole. The server derives
   * `graph.nodes` from every edge including the undecided ones, so keeping all of them
   * would scatter cards whose only reason to be here is a suggestion nobody has accepted
   * -- a canvas of unattached cards, which is a vault listing with worse ergonomics. The
   * fallback keeps every node when nothing is confirmed yet, because a blank canvas
   * cannot be dragged into a first connection.
   */
  const drawn = useMemo(() => {
    const edges = graph.edges.filter((edge) => edge.status === "confirmed");
    if (edges.length === 0) return { nodes: graph.nodes, edges };
    const touched = new Set(edges.flatMap((edge) => [edge.source_id, edge.target_id]));
    return { nodes: graph.nodes.filter((node) => touched.has(node.id)), edges };
  }, [graph.nodes, graph.edges]);

  /** Not drawn, but said out loud -- otherwise they look lost rather than pending. */
  const suggestedCount = useMemo(
    () => graph.edges.filter((edge) => edge.status === "suggested").length,
    [graph.edges],
  );

  const topology = useMemo(
    () =>
      [
        drawn.nodes.map((node) => node.id).join(","),
        drawn.edges.map((edge) => `${edge.source_id}>${edge.target_id}`).join(","),
      ].join("|"),
    [drawn],
  );

  const layoutRef = useRef<string>("");
  useEffect(() => {
    if (layoutRef.current === topology) return;
    layoutRef.current = topology;
    const pulls: LayoutEdge[] = drawn.edges.map((edge) => ({
      source: edge.source_id,
      target: edge.target_id,
    }));
    const placed = forceLayout(drawn.nodes, pulls);
    setNodes((current) => {
      const kept = new Map(current.map((node) => [node.id, node] as const));
      return drawn.nodes.map((item) => {
        const existing = kept.get(item.id);
        return {
          // Everything React Flow has learned about this card -- `measured` above all --
          // survives a topology change. A memory that was already on the canvas keeps
          // the place its owner dragged it to; only a new one takes a solved position.
          ...existing,
          id: item.id,
          type: "memory" as const,
          position: existing?.position ?? placed.get(item.id) ?? { x: 0, y: 0 },
          width: NODE_SIZE.width,
          height: NODE_SIZE.height,
          data: { item, dim: false, degree: 0, dropTarget: false },
        };
      });
    });
    // Let React Flow measure the new nodes before framing them, and skip the animation
    // when the person asked for less motion.
    const timer = window.setTimeout(
      // Enough margin that the hint panel and the zoom controls sit over the canvas
      // rather than over a card. 0.18 framed cards under both corners.
      () => void fitView({ padding: 0.26, duration: reduceMotion ? 0 : 320 }),
      0,
    );
    return () => window.clearTimeout(timer);
  }, [topology, drawn, fitView, reduceMotion]);

  /** Which memories each memory touches, for the dimming. Built once per graph. */
  const neighbours = useMemo(() => {
    const map = new Map<string, Set<string>>();
    for (const edge of drawn.edges) {
      if (!map.has(edge.source_id)) map.set(edge.source_id, new Set());
      if (!map.has(edge.target_id)) map.set(edge.target_id, new Set());
      map.get(edge.source_id)!.add(edge.target_id);
      map.get(edge.target_id)!.add(edge.source_id);
    }
    return map;
  }, [drawn.edges]);

  const lit = useCallback(
    (id: string) => !focusId || id === focusId || Boolean(neighbours.get(focusId)?.has(id)),
    [focusId, neighbours],
  );

  const itemById = useMemo(
    () => new Map(drawn.nodes.map((item) => [item.id, item] as const)),
    [drawn.nodes],
  );

  /**
   * What is handed to React Flow: the owned nodes, with the view-only fields refreshed.
   *
   * Spread rather than rebuilt, so `measured` and everything else React Flow wrote onto
   * a node survives a re-render. Dimming, the degree count and the drop target change
   * many times a second during a drag and none of them is state React Flow owns.
   */
  const renderNodes = useMemo<MemoryFlowNode[]>(
    () =>
      nodes.map((node) => ({
        ...node,
        selected: node.id === focusId,
        data: {
          item: itemById.get(node.id) ?? node.data.item,
          dim: !lit(node.id),
          degree: neighbours.get(node.id)?.size ?? 0,
          dropTarget: node.id === dropTargetId,
        },
      })),
    [nodes, itemById, focusId, lit, neighbours, dropTargetId],
  );

  const edges = useMemo<RelFlowEdge[]>(
    () =>
      drawn.edges.map((edge) => {
        const dim = !(lit(edge.source_id) && lit(edge.target_id));
        return {
          id: edge.id,
          type: "rel" as const,
          source: edge.source_id,
          target: edge.target_id,
          // No handle ids: both ends are computed from the cards' own geometry, so an
          // edge docks facing the memory it points at rather than always leaving right
          // and arriving left. See `lib/floating-edge.ts`.
          markerEnd: SYMMETRIC.has(edge.relation)
            ? undefined
            : {
                type: MarkerType.ArrowClosed,
                width: 14,
                height: 14,
                color: edgeStroke(edge.relation),
              },
          data: {
            edge,
            dim,
            busy: Boolean(busyEdgeIds?.has(edge.id)),
            selected: edge.id === selectedEdgeId,
          },
        };
      }),
    [drawn.edges, lit, busyEdgeIds, selectedEdgeId],
  );

  const onNodesChange = useCallback((changes: NodeChange<MemoryFlowNode>[]) => {
    // EVERY change, unfiltered. `dimensions` is the one that is easy to think is not
    // wanted here and is the one that breaks the flow -- see the note on `nodes` above.
    // Selection still comes from `focusId`; `renderNodes` overwrites it on the way out,
    // so a `select` change applied here cannot become a second source of truth.
    setNodes((current) => applyNodeChanges(changes, current));
  }, []);

  /** Where the card was picked up, so a drop that connects can put it back. */
  const dragOrigin = useRef<{ id: string; x: number; y: number } | null>(null);

  const onNodeDragStart = useCallback((_event: unknown, node: MemoryFlowNode) => {
    dragOrigin.current = { id: node.id, x: node.position.x, y: node.position.y };
  }, []);

  const onNodeDrag = useCallback(
    (_event: unknown, node: MemoryFlowNode) => {
      const dragged = rectOf(node);
      let best: string | null = null;
      let bestRatio = OVERLAP_TO_CONNECT;
      // `getNodes()` rather than the memo above: during a drag the memo is a frame behind
      // the position React Flow is actually painting, and a drop target that lags the
      // card is one that highlights the wrong memory at the moment somebody lets go.
      for (const other of getNodes()) {
        if (other.id === node.id) continue;
        const ratio = overlapRatio(dragged, rectOf(other));
        if (ratio > bestRatio) {
          bestRatio = ratio;
          best = other.id;
        }
      }
      setDropTargetId((current) => (current === best ? current : best));
    },
    [getNodes],
  );

  const onNodeDragStop = useCallback(
    (_event: unknown, node: MemoryFlowNode) => {
      const origin = dragOrigin.current;
      dragOrigin.current = null;
      const target = dropTargetId;
      setDropTargetId(null);
      if (!target || target === node.id) return;
      // The drop was a gesture, not a move. Leaving the card stacked on the one it was
      // dropped onto would hide both of them behind each other and make the edge that is
      // about to be drawn impossible to see.
      if (origin && origin.id === node.id) {
        setNodes((current) =>
          current.map((row) =>
            row.id === node.id
              ? { ...row, position: { x: origin.x, y: origin.y } }
              : row,
          ),
        );
      }
      onDraw(node.id, target);
    },
    [dropTargetId, onDraw],
  );

  const handleConnect = useCallback(
    (connection: Connection) => {
      if (!connection.source || !connection.target) return;
      // A self-edge is refused here as well as by the schema and by a CHECK constraint.
      // Dropping a card on itself is an easy slip, and a 422 is a worse answer than
      // nothing happening.
      if (connection.source === connection.target) return;
      onDraw(connection.source, connection.target);
    },
    [onDraw],
  );

  return (
    <div
      role="application"
      aria-label="Vault connection map. Drag one memory onto another to connect them. Every action here is also available in the review list."
      className="relative h-[560px] w-full overflow-hidden rounded-[calc(var(--radius)+4px)] border border-border/70 bg-secondary/20 lg:h-[680px]"
    >
      <ReactFlow<MemoryFlowNode, RelFlowEdge>
        nodes={renderNodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodesChange={onNodesChange}
        onConnect={handleConnect}
        onNodeDragStart={onNodeDragStart}
        onNodeDrag={onNodeDrag}
        onNodeDragStop={onNodeDragStop}
        // A drop lands on the handle nearest the pointer within this radius, measured
        // from the handle's centre. The default is 20px, which means a thread has to be
        // let go on a 12px dot -- well under the 44px a pointer target wants, and the
        // reason dropping a thread "on the card" did nothing. A card is 212x112 and its
        // four dots sit at the edge midpoints, so 140 covers every point on it including
        // the corners, and the whole card becomes the drop zone without a second handle
        // stacked over the content.
        connectionRadius={140}
        // A few pixels of travel before a press becomes a drag, so a click that moves
        // slightly still selects the card rather than nudging it. `drag-threshold`.
        nodeDragThreshold={4}
        onNodeClick={(_event, node) =>
          setFocusId((current) => (current === node.id ? null : node.id))
        }
        onEdgeClick={(_event, edge) =>
          onSelectEdge(edge.id === selectedEdgeId ? null : edge.id)
        }
        onPaneClick={() => {
          setFocusId(null);
          onSelectEdge(null);
        }}
        // Every handle is a `source`, and Loose is what lets one accept a drop. Without
        // it half of a symmetric gesture fails for a reason nothing on screen explains.
        connectionMode={ConnectionMode.Loose}
        connectionLineComponent={DraftLine}
        // Edges are drawn by dragging a card onto another, never by editing an existing
        // one's ends: re-pointing an edge is two decisions (unconnect, connect) wearing
        // one gesture, and the undo for it is a dismissal that blocks the pair forever.
        edgesReconnectable={false}
        nodesConnectable
        elevateNodesOnSelect
        elevateEdgesOnSelect
        proOptions={{ hideAttribution: false }}
        minZoom={0.2}
        maxZoom={1.6}
        fitView
      >
        <Background variant={BackgroundVariant.Dots} gap={22} size={1} className="opacity-50" />
        {/* Styled to the app's own chrome. React Flow's default is a white slab with a
            hard shadow, which on a soft canvas reads as a control from another product.
            The minimap it used to sit beside is gone: a second, smaller copy of a picture
            that already fits on screen spent a corner of the canvas to say nothing. */}
        <Controls
          showInteractive={false}
          className="!bottom-4 !left-4 !shadow-none [&>button]:!border-0 [&>button]:!bg-transparent [&>button]:!text-foreground/70 [&>button:hover]:!bg-secondary [&>button:hover]:!text-foreground overflow-hidden rounded-xl border border-border/70 bg-background/85 backdrop-blur [&>button]:size-8 [&_svg]:!fill-current"
        />
        <Panel position="top-left">
          <p className="rounded-lg border border-border/60 bg-background/85 px-2.5 py-1.5 text-[11.5px] leading-relaxed text-muted-foreground shadow-sm backdrop-blur">
            {drawn.edges.length === 0 && "Nothing is connected yet. "}
            Drag a card onto another to connect them, or pull a thread from the dots on
            its edge.
            {suggestedCount > 0 && (
              <>
                {" "}
                {suggestedCount} suggestion{suggestedCount === 1 ? "" : "s"} are waiting in
                the review list.
              </>
            )}
          </p>
        </Panel>
      </ReactFlow>
    </div>
  );
}
