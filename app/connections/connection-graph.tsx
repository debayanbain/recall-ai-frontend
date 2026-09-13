"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  Background,
  BackgroundVariant,
  EdgeLabelRenderer,
  Handle,
  Position,
  ReactFlow,
  getBezierPath,
  type Edge,
  type EdgeProps,
  type Node,
  type NodeProps,
  type NodeTypes,
  type EdgeTypes,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Link2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { fittedRadii, radialLayout } from "@/lib/connection-layout";
import { relationStyle } from "@/lib/connection-style";
import { toMemory } from "@/lib/vault-adapter";
import type { Relation, VaultItem } from "@/lib/types";
import type { MemoryKind } from "@/lib/mock-data";
import { nodeStyle, type GraphNode } from "./graph-data";

/** Card sizes drive both the layout and React Flow's own measurements. */
//: Both of these are a *fixed* height that React Flow also measures for layout, so they
//: have to be at least as tall as the card's own content -- a card shorter than its text
//: does not scroll or grow, it clips mid-word. Measured from the padding and line boxes
//: below: a memory card is 28 (p-3.5) + 28 (badge row) + 10 (mt-2.5) + 37 (two clamped
//: lines at 13.5px) = 103, and the focus card is 32 + 36 + 12 + 50 + 8 + 16 = 154. Both
//: were under that and both clipped. If you change the padding or the type scale inside
//: either node, re-add it up.
const MEMORY_SIZE = { width: 210, height: 108 };
const FOCUS_SIZE = { width: 300, height: 168 };

type MemoryNodeData = {
  node: GraphNode;
  dim: boolean;
  onHover: (id: string | null) => void;
};
type FocusNodeData = { title: string; count: number; href: string; kind: MemoryKind };
type RelEdgeData = { relation: Relation; label: string; dim: boolean };

type MemoryFlowNode = Node<MemoryNodeData, "memory">;
type FocusFlowNode = Node<FocusNodeData, "focus">;
type FlowNode = MemoryFlowNode | FocusFlowNode;
type RelFlowEdge = Edge<RelEdgeData, "rel">;

/** Handles exist only so edges have somewhere to dock — never shown. */
const handleClass = "!size-0 !min-h-0 !min-w-0 !border-0 !bg-transparent";

function NodeHandles() {
  return (
    <>
      {[Position.Top, Position.Right, Position.Bottom, Position.Left].flatMap((position) =>
        (["source", "target"] as const).map((type) => (
          <Handle
            key={`${type}-${position}`}
            id={`${type}-${position}`}
            type={type}
            position={position}
            isConnectable={false}
            className={handleClass}
          />
        )),
      )}
    </>
  );
}

function MemoryNode({ data }: NodeProps<MemoryFlowNode>) {
  const { node, dim, onHover } = data;
  const memory = toMemory(node.item);
  const style = nodeStyle[memory.kind];

  return (
    <div
      style={MEMORY_SIZE}
      className={`transition-opacity duration-200 ${dim ? "opacity-40" : "opacity-100"}`}
    >
      <NodeHandles />
      <Card className="h-full gap-0 rounded-2xl border border-border/70 py-0 shadow-[0_10px_30px_-18px_rgba(15,23,42,0.25)] ring-0 transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-[0_18px_40px_-18px_rgba(15,23,42,0.3)]">
        <Link
          href={node.href}
          aria-label={`Open memory: ${memory.title}`}
          onMouseEnter={() => onHover(node.id)}
          onMouseLeave={() => onHover(null)}
          onFocus={() => onHover(node.id)}
          onBlur={() => onHover(null)}
          className="block h-full rounded-2xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          <CardContent className="p-3.5">
            <div className="flex items-center gap-2">
              <span className={`grid size-7 shrink-0 place-items-center rounded-lg ${style.tone}`}>
                <style.icon className="size-3.5" />
              </span>
              <Badge
                className={`rounded-none px-0 font-mono text-[10.5px] tracking-wider ${style.tone.split(" ")[0]}`}
              >
                {style.label}
              </Badge>
            </div>
            <div
              title={memory.title}
              className="mt-2.5 line-clamp-2 text-[13.5px] font-semibold leading-snug tracking-tight"
            >
              {memory.title}
            </div>
          </CardContent>
        </Link>
      </Card>
    </div>
  );
}

function FocusNode({ data }: NodeProps<FocusFlowNode>) {
  const style = nodeStyle[data.kind];
  return (
    <div style={FOCUS_SIZE}>
      <NodeHandles />
      <Card className="h-full gap-0 rounded-2xl border-2 border-primary/70 py-0 shadow-[0_20px_60px_-20px_oklch(0.55_0.19_285/0.35)] ring-0 transition-shadow duration-200 hover:shadow-[0_24px_70px_-20px_oklch(0.55_0.19_285/0.45)]">
        <Link
          href={data.href}
          aria-label={`Open memory: ${data.title}`}
          className="block h-full rounded-2xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
        <CardContent className="p-4">
          <div className="flex items-center gap-2.5">
            <span className={`grid size-9 place-items-center rounded-xl ${style.tone}`}>
              <style.icon className="size-4" />
            </span>
            <Badge className="rounded-none px-0 font-mono text-[11px] tracking-wider text-primary">
              Focus
            </Badge>
          </div>
          {/* Clamped, with the full text on hover. An Instagram caption is a paragraph,
              and this card is 300px wide with a fixed height -- unclamped it ran straight
              through the bottom edge and took the count line with it. `truncation-strategy`:
              ellipsis, never a hard cut, and the whole string still reachable. */}
          <div
            title={data.title}
            className="mt-3 line-clamp-2 text-[18px] font-semibold leading-snug tracking-tight"
          >
            {data.title}
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-[12px] text-muted-foreground">
            <Link2 className="size-3.5 shrink-0 text-primary" />
            <span>
              {data.count} connected {data.count === 1 ? "memory" : "memories"}
            </span>
          </div>
        </CardContent>
        </Link>
      </Card>
    </div>
  );
}

function RelEdge({
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
}: EdgeProps<RelFlowEdge>) {
  const [path, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    curvature: 0.35,
  });
  const rel = relationStyle[data?.relation ?? "related_to"];
  const dim = data?.dim ?? false;

  return (
    <>
      <path
        d={path}
        fill="none"
        strokeWidth={1.5}
        strokeDasharray="4 5"
        stroke="oklch(0.78 0.09 285)"
        strokeOpacity={dim ? 0.2 : 0.65}
        className="transition-[stroke-opacity] duration-200"
      />
      <EdgeLabelRenderer>
        <div
          style={{ transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)` }}
          className={`absolute transition-opacity duration-200 ${dim ? "opacity-30" : "opacity-100"}`}
        >
          <Badge
            className={`rounded-md px-2 py-0.5 font-mono text-[11px] tracking-normal normal-case ring-1 ${rel.chip}`}
          >
            {data?.label ?? rel.outgoing}
          </Badge>
        </div>
      </EdgeLabelRenderer>
    </>
  );
}

const nodeTypes: NodeTypes = { memory: MemoryNode, focus: FocusNode };
const edgeTypes: EdgeTypes = { rel: RelEdge };

export function ConnectionGraph({
  focus,
  nodes: placed,
}: {
  focus: VaultItem;
  nodes: GraphNode[];
}) {
  const [hovered, setHovered] = useState<string | null>(null);
  const onHover = useCallback((id: string | null) => setHovered(id), []);
  const focusMemory = toMemory(focus);

  // Measured, not assumed. The ring's radii come from the real canvas so `fitView` never
  // has to zoom the cards down to fit -- see `fittedRadii`.
  const box = useRef<HTMLDivElement>(null);
  const [canvas, setCanvas] = useState({ width: 1200, height: 600 });
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      if (width > 0 && height > 0) setCanvas({ width, height });
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const layout = useMemo(
    () => radialLayout(placed.length, fittedRadii(canvas, MEMORY_SIZE)),
    [placed.length, canvas],
  );

  const nodes = useMemo<FlowNode[]>(
    () => [
      {
        id: "focus",
        type: "focus",
        position: { x: -FOCUS_SIZE.width / 2, y: -FOCUS_SIZE.height / 2 },
        data: {
          title: focusMemory.title,
          count: placed.length,
          href: `/memory/${focus.id}`,
          kind: focusMemory.kind,
        },
        ...FOCUS_SIZE,
      },
      ...placed.map<MemoryFlowNode>((node, index) => ({
        id: node.id,
        type: "memory",
        position: layout[index].position,
        data: { node, dim: hovered !== null && hovered !== node.id, onHover },
        ...MEMORY_SIZE,
      })),
    ],
    [focus.id, focusMemory.kind, focusMemory.title, hovered, layout, onHover, placed],
  );

  const edges = useMemo<RelFlowEdge[]>(
    () =>
      placed.map((node, index) => ({
        id: `${node.id}-focus`,
        type: "rel",
        source: node.id,
        target: "focus",
        sourceHandle: `source-${layout[index].from}`,
        targetHandle: `target-${layout[index].to}`,
        data: {
          relation: node.connection.relation,
          label: node.label,
          dim: hovered !== null && hovered !== node.id,
        },
      })),
    [hovered, layout, placed],
  );

  return (
    <div
      ref={box}
      className="relative hidden h-150 overflow-hidden rounded-[28px] border border-border/70 bg-card md:block lg:h-180"
    >
      <ReactFlow
        // Keyed on the node count and a coarse width bucket, so a confirm, a dismiss or a
        // real window resize remounts the canvas and re-runs `fitView` -- the prop fits
        // once, on init, and the layout changes with both. Bucketed rather than exact so
        // dragging a window edge does not remount on every pixel.
        key={`${placed.length}-${Math.round(canvas.width / 120)}`}
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        fitViewOptions={{ padding: 0.12 }}
        // Hover handlers also tell React Flow to keep pointer events on nodes,
        // which the fully non-interactive config would otherwise switch off.
        onNodeMouseEnter={(_, node) => setHovered(node.id)}
        onNodeMouseLeave={() => setHovered(null)}
        // Read-only: the graph can be looked at, never edited or moved.
        nodesDraggable={false}
        nodesConnectable={false}
        nodesFocusable={false}
        edgesFocusable={false}
        edgesReconnectable={false}
        elementsSelectable={false}
        panOnDrag={false}
        panOnScroll={false}
        zoomOnScroll={false}
        zoomOnPinch={false}
        zoomOnDoubleClick={false}
        preventScrolling={false}
        className="[&_.react-flow__pane]:cursor-default"
        aria-label="Connection map"
      >
        <Background variant={BackgroundVariant.Dots} gap={18} size={1.4} color="oklch(0.55 0.19 285 / 0.14)" />
      </ReactFlow>
    </div>
  );
}
