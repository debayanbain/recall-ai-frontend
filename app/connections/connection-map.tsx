"use client";

import Link from "next/link";
import { Link2, Play } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useIsMobile } from "@/hooks/use-mobile";
import { fadeUp, motionVariants, stagger } from "@/lib/motion";
import { ConnectionGraph } from "./connection-graph";
import { graphNodes, nodeStyle, relStyle, type RelKind } from "./graph-data";

const relBadge =
  "gap-1.5 rounded-md px-2 py-0.5 text-[10.5px] font-medium tracking-normal normal-case ring-1";
const nodeCard = "gap-0 rounded-2xl py-0 ring-0";

export function ConnectionMap({ centerTitle }: { centerTitle: string }) {
  const reduced = useReducedMotion();
  // Phones never see the canvas, so React Flow is not mounted there at all.
  const isMobile = useIsMobile();
  const listVariants = motionVariants(reduced, stagger(0.05));
  const itemVariants = motionVariants(reduced, fadeUp);

  return (
    <>
      {/* Phones get a readable list — a spatial graph would be unusable there */}
      <motion.ul
        variants={listVariants}
        initial="hidden"
        animate="show"
        className="flex flex-col gap-2.5 md:hidden"
      >
        <motion.li variants={itemVariants}>
          <Card className={`${nodeCard} border-2 border-primary/70 shadow-none`}>
            <CardContent className="p-4">
              <div className="flex items-center gap-2.5">
                <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-rose-50 text-rose-500">
                  <Play className="size-4" fill="currentColor" />
                </span>
                <Badge className="rounded-none px-0 font-mono text-[11px] tracking-wider text-rose-500">
                  Focus
                </Badge>
              </div>
              <div className="mt-3 text-[17px] font-semibold leading-snug tracking-tight">
                {centerTitle}
              </div>
              <div className="mt-2 flex items-center gap-1.5 text-[12px] text-muted-foreground">
                <Link2 className="size-3.5 shrink-0 text-primary" /> {graphNodes.length} connected
                memories
              </div>
            </CardContent>
          </Card>
        </motion.li>
        {graphNodes.map((n) => {
          const ns = nodeStyle[n.memory.kind];
          const rel = relStyle[n.rel];
          return (
            <motion.li key={n.id} variants={itemVariants}>
              <Card
                className={`${nodeCard} border border-border shadow-none transition-colors active:bg-secondary/60`}
              >
                <Link
                  href={n.href}
                  aria-label={`Open memory: ${n.memory.title}`}
                  className="block focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                >
                  <CardContent className="flex items-start gap-3 p-3.5">
                    <span className={`grid size-9 shrink-0 place-items-center rounded-lg ${ns.tone}`}>
                      <ns.icon className="size-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <Badge className={`${relBadge} ${rel.chip}`}>
                        <span className={`size-1.5 rounded-full ${rel.dot}`} />
                        {rel.label}
                      </Badge>
                      <span className="mt-1.5 block text-[13.5px] font-semibold leading-snug">
                        {n.memory.title}
                      </span>
                    </span>
                  </CardContent>
                </Link>
              </Card>
            </motion.li>
          );
        })}
      </motion.ul>

      {/* Tablet and up: the spatial map, rendered read-only with React Flow */}
      {!isMobile && <ConnectionGraph centerTitle={centerTitle} />}
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
          <span className={`size-1.5 rounded-full ${relStyle[k].dot}`} />
          {relStyle[k].label}
        </Badge>
      ))}
    </div>
  );
}
