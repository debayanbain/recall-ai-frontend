import {
  AtSign,
  FileText,
  GitBranch,
  Image as ImageIcon,
  Link as LinkIcon,
  Mic,
  Newspaper,
  Play,
  StickyNote,
  type LucideIcon,
} from "lucide-react";
import type { MemoryKind } from "@/lib/mock-data";
import type { MemoryConnection, VaultItem } from "@/lib/types";

/**
 * How a memory's *kind* is drawn. Real items reach this through
 * `lib/vault-adapter.ts::toMemory`, which maps the backend's `ContentType` onto
 * `MemoryKind`, so the card vocabulary is shared with the rest of the app.
 *
 * The relation styling used to live here too; it moved to `lib/connection-style.ts` when
 * the edges became real, because a relation now has *two* wordings — one per direction —
 * and more than one page needs them.
 */
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

/**
 * One neighbour of the focus memory. **No coordinates.**
 *
 * Placement used to live here, then in the page that built this list -- both wrong for the
 * same reason: the ring has to fit the canvas, and only the canvas knows how wide it is.
 * With fixed radii the graph rendered at 0.54 zoom on a 1024px window, which is a 7px
 * title. `ConnectionGraph` measures itself and calls `radialLayout` with radii that fit.
 */
export type GraphNode = {
  /** The connection's id, which is what the node is keyed by. */
  id: string;
  connection: MemoryConnection;
  item: VaultItem;
  /** The wording for this edge as read from the focus memory. */
  label: string;
  /** Detail route for the neighbour. */
  href: string;
};
