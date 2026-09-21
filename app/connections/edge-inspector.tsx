"use client";

import { Check, Loader2, Sparkles, Trash2, Wand2, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ConnectChip, MemoryRow } from "@/components/memory-card";
import { RELATIONS, relationStyle } from "@/lib/connection-style";
import { toMemory } from "@/lib/vault-adapter";
import type { GraphEdge, Relation, VaultItem } from "@/lib/types";

/**
 * One edge, and everything a person can do to it.
 *
 * Opened by tapping an edge on the canvas. It is a panel rather than a popover because
 * the actions differ by state and a popover that changes shape under the cursor is one
 * people stop trusting — and because a panel is reachable by keyboard once focus lands in
 * it, which a canvas affordance is not.
 *
 * **The actions offered are the ones that make sense for the state, and no others.**
 *
 * * `suggested` gets **Connect** and **Not related**. It is one decision with two answers
 *   and nothing else belongs beside it — a relation dropdown here would ask somebody to
 *   label an edge they have not yet agreed exists.
 * * `confirmed` gets the relabel, the AI relabel, and **Remove**. Retyping a suggestion
 *   would spend a model call on an edge that may be about to be dismissed.
 *
 * **Dismiss and Remove are different actions and are worded as such.** Dismissing keeps
 * the row so the pair is never proposed again; removing deletes the edge and frees the
 * pair. Both are explained in the panel, because "I said no once and it stopped
 * suggesting things" is a behaviour people notice and cannot otherwise account for.
 *
 * **`ai_reason` is never styled like `note`.** One is a model's sentence about scraped
 * pages and the other is what its owner typed; rendering them identically is the single
 * way this feature can lie.
 */
const plain = "rounded-xl tracking-normal normal-case";

export type EdgeInspectorProps = {
  edge: GraphEdge;
  source: VaultItem;
  target: VaultItem;
  busy: boolean;
  /** False when relation typing is off, unconfigured, or the hourly cap is spent. */
  canRetype: boolean;
  onConfirm: () => void;
  onDismiss: () => void;
  onRelabel: (relation: Relation) => void;
  onRetype: () => void;
  onRemove: () => void;
  onClose: () => void;
};

export function EdgeInspector({
  edge,
  source,
  target,
  busy,
  canRetype,
  onConfirm,
  onDismiss,
  onRelabel,
  onRetype,
  onRemove,
  onClose,
}: EdgeInspectorProps) {
  const style = relationStyle[edge.relation];
  const suggested = edge.status === "suggested";

  return (
    <Card
      // Focus is moved here by the caller when an edge is selected, so a keyboard user
      // who tabbed onto an edge is not left behind on the canvas.
      tabIndex={-1}
      aria-label={`Connection: ${style.outgoing}`}
      className="gap-0 rounded-[calc(var(--radius)+4px)] border border-border/70 py-0 shadow-none ring-0"
    >
      <CardContent className="flex flex-col gap-3 p-5">
        <div className="flex items-start justify-between gap-2">
          <Badge
            className={`gap-1.5 rounded-md px-2 py-0.5 text-[10.5px] font-medium tracking-normal normal-case ring-1 ${style.chip}`}
          >
            {suggested && <Sparkles className="size-3" />}
            {style.outgoing}
          </Badge>
          <Button
            variant="ghost"
            onClick={onClose}
            aria-label="Close connection details"
            className={`${plain} -mr-2 -mt-1 size-8 p-0 text-muted-foreground`}
          >
            <X className="size-4" />
          </Button>
        </div>

        <MemoryRow m={toMemory(source)} />
        <span className="pl-1 text-[11.5px] text-muted-foreground">
          {style.outgoing.toLowerCase()}
        </span>
        <MemoryRow m={toMemory(target)} />

        {edge.ai_reason && <ConnectChip label={edge.ai_reason} />}
        {edge.note && (
          <p className="rounded-xl bg-secondary/50 px-3 py-2 text-[12.5px] leading-relaxed">
            {edge.note}
          </p>
        )}
        {edge.score !== null && (
          // Shown only when there is one. A hand-drawn edge has no score, and rendering a
          // zero there would report a measurement nobody took.
          <p className="text-[11px] text-muted-foreground">
            Similarity {Math.round(edge.score * 100)}%
          </p>
        )}

        {suggested ? (
          <>
            <div className="flex gap-2">
              <Button
                onClick={onConfirm}
                disabled={busy}
                className={`${plain} h-9 gap-1.5 px-3 text-[12.5px] font-semibold`}
              >
                {busy ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />}
                Connect
              </Button>
              <Button
                variant="ghost"
                onClick={onDismiss}
                disabled={busy}
                className={`${plain} h-9 gap-1.5 px-3 text-[12.5px] font-semibold text-muted-foreground`}
              >
                <X className="size-3.5" /> Not related
              </Button>
            </div>
            <p className="text-[11.5px] leading-relaxed text-muted-foreground">
              Dismissing means Recall will not suggest this pair again. You can still
              connect them yourself later.
            </p>
          </>
        ) : (
          <>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="edge-relation" className="text-[12px] font-medium">
                Relation
              </label>
              <Select
                value={edge.relation}
                onValueChange={(value) => onRelabel(value as Relation)}
                disabled={busy}
              >
                <SelectTrigger id="edge-relation" className={`${plain} h-10 w-full`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {RELATIONS.map((key) => (
                    <SelectItem key={key} value={key}>
                      {relationStyle[key].outgoing}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              {canRetype && (
                <Button
                  variant="ghost"
                  onClick={onRetype}
                  disabled={busy}
                  className={`${plain} h-9 gap-1.5 px-3 text-[12.5px] font-semibold`}
                >
                  <Wand2 className="size-3.5" /> Ask AI
                </Button>
              )}
              <Button
                variant="ghost"
                onClick={onRemove}
                disabled={busy}
                className={`${plain} h-9 gap-1.5 px-3 text-[12.5px] font-semibold text-destructive hover:bg-destructive/10`}
              >
                <Trash2 className="size-3.5" /> Remove
              </Button>
            </div>
            <p className="text-[11.5px] leading-relaxed text-muted-foreground">
              Removing deletes this connection and frees the pair — unlike dismissing a
              suggestion, Recall may propose it again later.
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
