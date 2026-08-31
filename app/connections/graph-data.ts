import {
  FileText,
  GitBranch,
  Image as ImageIcon,
  Link as LinkIcon,
  Mic,
  Newspaper,
  Play,
  StickyNote,
  AtSign,
  type LucideIcon,
} from "lucide-react";
import { Position } from "@xyflow/react";
import { memories, type Memory, type MemoryKind } from "@/lib/mock-data";

export type RelKind =
  | "expands"
  | "related"
  | "inspired"
  | "contradicts"
  | "part"
  | "depends";

export const relStyle: Record<RelKind, { label: string; chip: string; dot: string }> = {
  expands:     { label: "Expands",     chip: "bg-emerald-50 text-emerald-700 ring-emerald-200/70", dot: "bg-emerald-400" },
  related:     { label: "Related to",  chip: "bg-sky-50 text-sky-700 ring-sky-200/70",             dot: "bg-sky-400" },
  inspired:    { label: "Inspired by", chip: "bg-violet-50 text-violet-700 ring-violet-200/70",    dot: "bg-violet-400" },
  contradicts: { label: "Contradicts", chip: "bg-rose-50 text-rose-700 ring-rose-200/70",          dot: "bg-rose-400" },
  part:        { label: "Part of",     chip: "bg-amber-50 text-amber-700 ring-amber-200/70",       dot: "bg-amber-400" },
  depends:     { label: "Depends on",  chip: "bg-slate-100 text-slate-700 ring-slate-200/70",      dot: "bg-slate-400" },
};

export const nodeStyle: Record<MemoryKind, { label: string; icon: LucideIcon; tone: string }> = {
  article: { label: "Article", icon: Newspaper,  tone: "text-emerald-600 bg-emerald-50" },
  video:   { label: "Video",   icon: Play,       tone: "text-rose-500 bg-rose-50" },
  note:    { label: "Note",    icon: StickyNote, tone: "text-amber-600 bg-amber-50" },
  pdf:     { label: "PDF",     icon: FileText,   tone: "text-slate-600 bg-slate-100" },
  document:{ label: "File",    icon: FileText,   tone: "text-slate-600 bg-slate-100" },
  voice:   { label: "Voice",   icon: Mic,        tone: "text-sky-500 bg-sky-50" },
  image:   { label: "Image",   icon: ImageIcon,  tone: "text-fuchsia-600 bg-fuchsia-50" },
  tweet:   { label: "Tweet",   icon: AtSign,     tone: "text-cyan-600 bg-cyan-50" },
  github:  { label: "Code",    icon: GitBranch,  tone: "text-slate-700 bg-slate-100" },
  link:    { label: "Link",    icon: LinkIcon,   tone: "text-violet-600 bg-violet-50" },
};

/** The memory the map is centred on. */
export const FOCUS_ID = "second-brain";

type GraphEdge = {
  /** Memory id — also the route the node opens. */
  id: string;
  rel: RelKind;
  /** Canvas position in px; the focus card sits at the origin. */
  position: { x: number; y: number };
  /** Which side each end of the edge leaves from, so curves stay readable. */
  from: Position;
  to: Position;
};

const layout: GraphEdge[] = [
  { id: "smart-notes",   rel: "expands",     position: { x: -520, y: -300 }, from: Position.Bottom, to: Position.Top },
  { id: "para",          rel: "related",     position: { x:  330, y: -330 }, from: Position.Bottom, to: Position.Top },
  { id: "validate-saas", rel: "contradicts", position: { x: -640, y:  -20 }, from: Position.Right,  to: Position.Left },
  { id: "lean-startup",  rel: "inspired",    position: { x:  450, y:  -20 }, from: Position.Left,   to: Position.Right },
  { id: "business-plan", rel: "part",        position: { x: -430, y:  280 }, from: Position.Top,    to: Position.Bottom },
  { id: "fastapi-deep",  rel: "depends",     position: { x:  320, y:  300 }, from: Position.Top,    to: Position.Bottom },
];

export type GraphNode = GraphEdge & {
  memory: Memory;
  /** Detail route for this memory. */
  href: string;
};

/** Every node resolves to a real memory, so each card opens its own page. */
export const graphNodes: GraphNode[] = layout.flatMap((entry) => {
  const memory = memories.find((m) => m.id === entry.id);
  return memory ? [{ ...entry, memory, href: `/memory/${memory.id}` }] : [];
});

export const focusMemory = memories.find((m) => m.id === FOCUS_ID);
export const focusHref = `/memory/${FOCUS_ID}`;
