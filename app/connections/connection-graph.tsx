"use client";

import { useCallback, useMemo, useState } from "react";
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
import { Link2, Play } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  focusHref,
  graphNodes,
  nodeStyle,
  relStyle,
  type GraphNode,
  type RelKind,
} from "./graph-data";

/** Card sizes drive both the layout and React Flow's own measurements. */
const MEMORY_SIZE = { width: 210, height: 96 };
const FOCUS_SIZE = { width: 300, height: 132 };

type MemoryNodeData = {
  node: GraphNode;
  dim: boolean;
  onHover: (id: string | null) => void;
};
type FocusNodeData = { title: string; count: number };
type RelEdgeData = { rel: RelKind; dim: boolean };

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
  const style = nodeStyle[node.memory.kind];

  return (
    <div
      style={MEMORY_SIZE}
      className={`transition-opacity duration-200 ${dim ? "opacity-40" : "opacity-100"}`}
    >
      <NodeHandles />
      <Card className="h-full gap-0 rounded-2xl border border-border/70 py-0 shadow-[0_10px_30px_-18px_rgba(15,23,42,0.25)] ring-0 transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-[0_18px_40px_-18px_rgba(15,23,42,0.3)]">
        <Link
          href={node.href}
          aria-label={`Open memory: ${node.memory.title}`}
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
            <div className="mt-2.5 line-clamp-2 text-[13.5px] font-semibold leading-snug tracking-tight">
              {node.memory.title}
            </div>
          </CardContent>
        </Link>
      </Card>
    </div>
  );
}

function FocusNode({ data }: NodeProps<FocusFlowNode>) {
  return (
    <div style={FOCUS_SIZE}>
      <NodeHandles />
      <Card className="h-full gap-0 rounded-2xl border-2 border-primary/70 py-0 shadow-[0_20px_60px_-20px_oklch(0.55_0.19_285/0.35)] ring-0 transition-shadow duration-200 hover:shadow-[0_24px_70px_-20px_oklch(0.55_0.19_285/0.45)]">
        <Link
          href={focusHref}
          aria-label={`Open memory: ${data.title}`}
          className="block h-full rounded-2xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
        <CardContent className="p-4">
          <div className="flex items-center gap-2.5">
            <span className="grid size-9 place-items-center rounded-xl bg-rose-50 text-rose-500">
              <Play className="size-4" fill="currentColor" />
            </span>
            <Badge className="rounded-none px-0 font-mono text-[11px] tracking-wider text-rose-500">
              Focus
            </Badge>
          </div>
          <div className="mt-3 text-[18px] font-semibold leading-snug tracking-tight">
            {data.title}
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-[12px] text-muted-foreground">
            <Link2 className="size-3.5 shrink-0 text-primary" />
            <span>{data.count} connected memories</span>
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
  const rel = relStyle[data?.rel ?? "related"];
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
            {rel.label}
          </Badge>
        </div>
      </EdgeLabelRenderer>
    </>
  );
}

const nodeTypes: NodeTypes = { memory: MemoryNode, focus: FocusNode };
const edgeTypes: EdgeTypes = { rel: RelEdge };

export function ConnectionGraph({ centerTitle }: { centerTitle: string }) {
  const [hovered, setHovered] = useState<string | null>(null);
  const onHover = useCallback((id: string | null) => setHovered(id), []);

  const nodes = useMemo<FlowNode[]>(
    () => [
      {
        id: "focus",
        type: "focus",
        position: { x: -FOCUS_SIZE.width / 2, y: -FOCUS_SIZE.height / 2 },
        data: { title: centerTitle, count: graphNodes.length },
        ...FOCUS_SIZE,
      },
      ...graphNodes.map<MemoryFlowNode>((node) => ({
        id: node.id,
        type: "memory",
        position: node.position,
        data: { node, dim: hovered !== null && hovered !== node.id, onHover },
        ...MEMORY_SIZE,
      })),
    ],
    [centerTitle, hovered, onHover],
  );

  const edges = useMemo<RelFlowEdge[]>(
    () =>
      graphNodes.map((node) => ({
        id: `${node.id}-focus`,
        type: "rel",
        source: node.id,
        target: "focus",
        sourceHandle: `source-${node.from}`,
        targetHandle: `target-${node.to}`,
        data: { rel: node.rel, dim: hovered !== null && hovered !== node.id },
      })),
    [hovered],
  );

  return (
    <div className="relative hidden h-150 overflow-hidden rounded-[28px] border border-border/70 bg-card md:block lg:h-180">
      <ReactFlow
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
