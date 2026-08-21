"use client";

import { useState } from "react";
import Link from "next/link";
import { AtSign, GitBranch, Link2, type LucideIcon, Newspaper, Play, StickyNote } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ease, fadeUp, motionVariants, stagger, transition } from "@/lib/motion";

type RelKind = "expands" | "related" | "inspired" | "contradicts" | "part" | "depends";
type NodeKind = "article" | "video" | "post" | "note" | "github";

export const relStyle: Record<RelKind, { label: string; chip: string; dot: string }> = {
  expands:     { label: "Expands",     chip: "bg-emerald-50 text-emerald-700 ring-emerald-200/70", dot: "bg-emerald-400" },
  related:     { label: "Related to",  chip: "bg-sky-50 text-sky-700 ring-sky-200/70",             dot: "bg-sky-400" },
  inspired:    { label: "Inspired by", chip: "bg-violet-50 text-violet-700 ring-violet-200/70",     dot: "bg-violet-400" },
  contradicts: { label: "Contradicts", chip: "bg-rose-50 text-rose-700 ring-rose-200/70",           dot: "bg-rose-400" },
  part:        { label: "Part of",     chip: "bg-amber-50 text-amber-700 ring-amber-200/70",        dot: "bg-amber-400" },
  depends:     { label: "Depends on",  chip: "bg-slate-100 text-slate-700 ring-slate-200/70",       dot: "bg-slate-400" },
};

const nodeStyle: Record<NodeKind, { label: string; icon: LucideIcon; tone: string }> = {
  article: { label: "Article", icon: Newspaper,  tone: "text-emerald-600 bg-emerald-50" },
  video:   { label: "Video",   icon: Play,       tone: "text-rose-500 bg-rose-50" },
  post:    { label: "Post",    icon: AtSign,     tone: "text-sky-500 bg-sky-50" },
  note:    { label: "Note",    icon: StickyNote, tone: "text-amber-600 bg-amber-50" },
  github:  { label: "Github",  icon: GitBranch,  tone: "text-slate-700 bg-slate-100" },
};

type GraphNode = {
  id: string;
  title: string;
  kind: NodeKind;
  rel: RelKind;
  href: string;
  /** % positions inside the canvas */
  x: number;
  y: number;
  /** anchor side of the card the line attaches to */
  anchor: "tl" | "tr" | "bl" | "br" | "l" | "r";
};

const nodes: GraphNode[] = [
  { id: "smart-notes",   title: "How to Take Smart Notes",                     kind: "article", rel: "expands",     href: "/memory/smart-notes",   x: 22, y: 22, anchor: "br" },
  { id: "para",          title: "PARA Method Explained",                       kind: "video",   rel: "related",     href: "/memory/para",          x: 78, y: 18, anchor: "bl" },
  { id: "validate-saas", title: "How to Validate Your SaaS Idea in 7 Days",    kind: "article", rel: "contradicts", href: "/memory/validate-saas", x: 12, y: 56, anchor: "r" },
  { id: "naval-post",    title: "@naval — “Memory is a network, not a list.”", kind: "post",    rel: "inspired",    href: "/vault",                x: 84, y: 56, anchor: "l" },
  { id: "business-plan", title: "Business Plan Ideas",                         kind: "note",    rel: "part",        href: "/memory/business-plan", x: 28, y: 88, anchor: "tr" },
  { id: "memory-graph",  title: "recallai / memory-graph",                     kind: "github",  rel: "depends",     href: "/memory/fastapi-deep",  x: 76, y: 88, anchor: "tl" },
];

const CARD_W = 16; // % of canvas width
const CARD_H = 11; // % of canvas height

const relBadge = "gap-1.5 rounded-md px-2 py-0.5 text-[10.5px] font-medium tracking-normal normal-case ring-1";
const nodeCard = "gap-0 rounded-2xl py-0 ring-0";

function anchorOffset(a: GraphNode["anchor"]) {
  switch (a) {
    case "tl": return { dx: -0.42, dy: -0.42 };
    case "tr": return { dx:  0.42, dy: -0.42 };
    case "bl": return { dx: -0.42, dy:  0.42 };
    case "br": return { dx:  0.42, dy:  0.42 };
    case "l":  return { dx: -0.5,  dy:  0    };
    case "r":  return { dx:  0.5,  dy:  0    };
  }
}

export function ConnectionMap({ centerTitle }: { centerTitle: string }) {
  const [selected, setSelected] = useState<string | null>(null);
  const reduced = useReducedMotion();
  const listVariants = motionVariants(reduced, stagger(0.05));
  const itemVariants = motionVariants(reduced, fadeUp);

  return (
    <>
      {/* Phones get a readable list — an absolutely-positioned graph would be unusable */}
      <motion.ul variants={listVariants} initial="hidden" animate="show" className="flex flex-col gap-2.5 md:hidden">
        <motion.li variants={itemVariants}>
          <Card className={`${nodeCard} border-2 border-primary/70 shadow-none`}>
            <CardContent className="p-4">
              <div className="flex items-center gap-2.5">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-rose-50 text-rose-500">
                  <Play className="h-4 w-4" fill="currentColor" />
                </span>
                <Badge className="rounded-none px-0 font-mono text-[11px] tracking-wider text-rose-500">
                  Focus
                </Badge>
              </div>
              <div className="mt-3 text-[17px] font-semibold leading-snug tracking-tight">
                {centerTitle}
              </div>
              <div className="mt-2 flex items-center gap-1.5 text-[12px] text-muted-foreground">
                <Link2 className="h-3.5 w-3.5 shrink-0 text-primary" /> {nodes.length} connected memories
              </div>
            </CardContent>
          </Card>
        </motion.li>
        {nodes.map((n) => {
          const ns = nodeStyle[n.kind];
          const rel = relStyle[n.rel];
          return (
            <motion.li key={n.id} variants={itemVariants}>
              <Card className={`${nodeCard} border border-border shadow-none transition-colors active:bg-secondary/60`}>
                <Link href={n.href} className="block focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
                  <CardContent className="flex items-start gap-3 p-3.5">
                    <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${ns.tone}`}>
                      <ns.icon className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <Badge className={`${relBadge} ${rel.chip}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${rel.dot}`} />
                        {rel.label}
                      </Badge>
                      <span className="mt-1.5 block text-[13.5px] font-semibold leading-snug">
                        {n.title}
                      </span>
                    </span>
                  </CardContent>
                </Link>
              </Card>
            </motion.li>
          );
        })}
      </motion.ul>

      {/* Tablet and up: the spatial map */}
      <div className="relative hidden h-150 overflow-hidden rounded-[28px] border border-border/70 bg-card md:block lg:h-180">
        <div className="absolute inset-0 grid-dots opacity-40" />

        <svg
          className="absolute inset-0 h-full w-full"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          aria-hidden="true"
          focusable="false"
        >
          {nodes.map((n) => {
            const { dx, dy } = anchorOffset(n.anchor);
            const x1 = n.x + dx * CARD_W;
            const y1 = n.y + dy * CARD_H;
            const cx = (x1 + 50) / 2;
            const cy = (y1 + 50) / 2 + (n.y < 50 ? -3 : 3);
            const dim = selected !== null && selected !== n.id;
            return (
              <motion.path
                key={n.id}
                initial={reduced ? false : { pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                transition={reduced ? { duration: 0 } : { duration: 0.7, delay: 0.1, ease }}
                d={`M ${x1} ${y1} Q ${cx} ${cy} 50 50`}
                fill="none"
                stroke={selected === n.id ? "oklch(0.55 0.19 285)" : "oklch(0.78 0.09 285)"}
                strokeOpacity={dim ? 0.18 : selected === n.id ? 0.9 : 0.55}
                strokeWidth={selected === n.id ? "0.5" : "0.25"}
                vectorEffect="non-scaling-stroke"
                className="transition-[stroke-opacity,stroke-width] duration-200"
              />
            );
          })}
        </svg>

        {nodes.map((n) => {
          const { dx, dy } = anchorOffset(n.anchor);
          const x1 = n.x + dx * CARD_W;
          const y1 = n.y + dy * CARD_H;
          const mx = (x1 + 50) / 2;
          const my = (y1 + 50) / 2 + (n.y < 50 ? -1.5 : 1.5);
          const s = relStyle[n.rel];
          const dim = selected !== null && selected !== n.id;
          return (
            <div
              key={`pill-${n.id}`}
              className={`absolute -translate-x-1/2 -translate-y-1/2 transition-opacity duration-200 ${dim ? "opacity-30" : "opacity-100"}`}
              style={{ left: `${mx}%`, top: `${my}%` }}
            >
              <Badge className={`rounded-md px-2 py-0.5 font-mono text-[11px] tracking-normal normal-case ring-1 ${s.chip}`}>
                {s.label}
              </Badge>
            </div>
          );
        })}

        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
          <Card
            className={`${nodeCard} w-70 border-2 border-primary/70 shadow-[0_20px_60px_-20px_oklch(0.55_0.19_285/0.35)] lg:w-75`}
          >
            <CardContent className="p-4">
              <div className="flex items-center gap-2.5">
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-rose-50 text-rose-500">
                  <Play className="h-4 w-4" fill="currentColor" />
                </span>
                <Badge className="rounded-none px-0 font-mono text-[11px] tracking-wider text-rose-500">
                  Focus
                </Badge>
              </div>
              <div className="mt-3 text-[18px] font-semibold leading-snug tracking-tight">
                {centerTitle}
              </div>
              <div className="mt-2 flex items-center gap-1.5 text-[12px] text-muted-foreground">
                <Link2 className="h-3.5 w-3.5 shrink-0 text-primary" />
                <span>{nodes.length} connected memories</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {nodes.map((n) => {
          const ns = nodeStyle[n.kind];
          const dim = selected !== null && selected !== n.id;
          return (
            <motion.div
              key={n.id}
              initial={reduced ? false : { opacity: 0, scale: 0.94 }}
              animate={{ opacity: dim ? 0.4 : 1, scale: 1 }}
              transition={reduced ? { duration: 0 } : transition.soft}
              className="absolute -translate-x-1/2 -translate-y-1/2"
              style={{ left: `${n.x}%`, top: `${n.y}%`, width: `${CARD_W}%`, minWidth: "150px" }}
            >
              <Card
                className={`${nodeCard} shadow-[0_10px_30px_-18px_rgba(15,23,42,0.25)] transition-[transform,box-shadow,border-color] duration-200 hover:-translate-y-0.5 hover:shadow-[0_18px_40px_-18px_rgba(15,23,42,0.3)] ${
                  selected === n.id ? "border border-primary/50" : "border border-border/70"
                }`}
              >
                <Link
                  href={n.href}
                  onMouseEnter={() => setSelected(n.id)}
                  onMouseLeave={() => setSelected(null)}
                  onFocus={() => setSelected(n.id)}
                  onBlur={() => setSelected(null)}
                  className="block focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                >
                  <CardContent className="p-3.5">
                    <div className="flex items-center gap-2">
                      <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg ${ns.tone}`}>
                        <ns.icon className="h-3.5 w-3.5" />
                      </span>
                      <Badge
                        className={`rounded-none px-0 font-mono text-[10.5px] tracking-wider ${ns.tone.split(" ")[0]}`}
                      >
                        {ns.label}
                      </Badge>
                    </div>
                    <div className="mt-2.5 line-clamp-2 text-[13.5px] font-semibold leading-snug tracking-tight">
                      {n.title}
                    </div>
                  </CardContent>
                </Link>
              </Card>
            </motion.div>
          );
        })}
      </div>
    </>
  );
}

export function RelationLegend() {
  return (
    <div className="flex gap-2 pb-1 sm:flex-wrap sm:pb-0">
      {(["expands", "related", "inspired", "contradicts"] as RelKind[]).map((k) => (
        <Badge
          key={k}
          className={`shrink-0 gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-medium tracking-normal normal-case ring-1 ${relStyle[k].chip}`}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${relStyle[k].dot}`} />
          {relStyle[k].label}
        </Badge>
      ))}
    </div>
  );
}
