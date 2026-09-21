"use client";

import { useState } from "react";
import { ArrowDown, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { MemoryRow } from "@/components/memory-card";
import { RELATIONS, relationStyle } from "@/lib/connection-style";
import { toMemory } from "@/lib/vault-adapter";
import type { Relation, VaultItem } from "@/lib/types";

/**
 * What a card dropped onto another card asks before it becomes an edge.
 *
 * The drag says *that* two memories relate; this says *how*, and it is a dialog rather
 * than an immediate write for one reason: the relation is the whole content of a
 * connection. Writing `related_to` silently and offering a relabel afterwards makes the
 * useful half of the gesture a thing nobody discovers — every hand-drawn edge in the vault
 * ends up saying the weakest thing the vocabulary can say.
 *
 * It shows both memories because a drag on a dense canvas lands on the wrong card often
 * enough to matter, and reading two titles is the cheapest way to catch that before it is
 * a row.
 *
 * **`related_to` is the default and the first option.** It is what a person who has not
 * thought about it means, and a dropdown that opens on `contradicts` invites a claim
 * nobody was making.
 *
 * The note is the person's own words and goes in `note`, never near `ai_reason` — the
 * column a model writes to, rendered differently on purpose.
 *
 * **The caller keys this on the pair**, which is what resets the relation and the note
 * between two drags. Doing it in an effect instead would be a `setState` during render
 * that React reports as a cascading update — and a relation left over from the last edge
 * somebody drew is a wrong label one Enter away, on a row they never chose it for.
 */
const plain = "rounded-xl tracking-normal normal-case";
/**
 * Undoes base-sera's `uppercase tracking-wider` on `DialogTitle` and `Label`.
 *
 * `plain` was only ever applied to the controls, so the dialog's own headings kept the
 * design system's default and read as SHOUTED SERIF over a page that is sentence case
 * everywhere else. Two words of CSS, and the single loudest thing about this dialog.
 */
const heading = "tracking-tight normal-case";
const fieldLabel = "text-[12px] font-medium tracking-normal normal-case";
/** A real box for the control, over base-sera's bottom-rule-only, zero-padding default. */
const field =
  "h-11 w-full rounded-xl border border-input bg-background px-3 text-[13.5px]";

export type DrawnPair = { source: VaultItem; target: VaultItem };

export function ConnectDialog({
  pair,
  pending,
  onCancel,
  onConfirm,
}: {
  /** The two memories, or null when nothing is being drawn. */
  pair: DrawnPair | null;
  pending: boolean;
  onCancel: () => void;
  onConfirm: (relation: Relation, note: string) => void;
}) {
  const [relation, setRelation] = useState<Relation>("related_to");
  const [note, setNote] = useState("");
  const open = pair !== null;

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onCancel()}>
      {/* `min-w-0` because DialogContent is a grid, and a grid item defaults to
          `min-width: auto` -- a memory whose title is an unbroken string, which every
          pasted filename is, widens the track and pushes the card past the panel edge. */}
      <DialogContent className="min-w-0 gap-4 rounded-3xl sm:max-w-lg">
        <DialogTitle className={`font-display text-[20px] ${heading}`}>
          Connect these memories
        </DialogTitle>
        <DialogDescription className="text-[13px] leading-relaxed">
          You are drawing this yourself, so it is saved straight away — no review needed.
        </DialogDescription>

        {pair && (
          <div className="flex min-w-0 flex-col gap-2">
            {/* Not links and not favouritable: these two rows say *which* memories are
                about to be joined, and a full-card link inside a dialog is one tap that
                throws the decision away. */}
            <MemoryRow m={toMemory(pair.source)} interactive={false} />

            <div className="flex min-w-0 flex-col gap-1.5 rounded-2xl border border-dashed border-border bg-secondary/30 p-3">
              <Label htmlFor="relation" className={fieldLabel}>
                How does the first relate to the second?
              </Label>
              <Select
                value={relation}
                onValueChange={(value) => setRelation(value as Relation)}
              >
                {/* The trigger renders the relation's *wording*, not `SelectValue`.
                    `SelectValue` prints the stored value, which is the database enum --
                    `related_to` on screen, in a dialog whose whole content is that one
                    choice. The vocabulary already has one label per direction; this is
                    the same lookup every other surface does. */}
                <SelectTrigger id="relation" className={field}>
                  <span className="flex-1 truncate text-left">
                    {relationStyle[relation].outgoing}
                  </span>
                </SelectTrigger>
                <SelectContent>
                  {RELATIONS.map((key) => (
                    <SelectItem key={key} value={key} className="normal-case">
                      {relationStyle[key].outgoing}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <ArrowDown
                aria-hidden
                className="mx-auto size-3.5 shrink-0 text-muted-foreground"
              />
            </div>

            <MemoryRow m={toMemory(pair.target)} interactive={false} />

            <div className="mt-2 flex min-w-0 flex-col gap-1.5">
              <Label htmlFor="connection-note" className={fieldLabel}>
                Note <span className="text-muted-foreground">(optional)</span>
              </Label>
              <Textarea
                id="connection-note"
                value={note}
                onChange={(event) => setNote(event.target.value)}
                maxLength={500}
                rows={2}
                placeholder="Why these belong together"
                className="w-full resize-none rounded-xl border border-input bg-background px-3 py-2 text-[13px] tracking-normal normal-case"
              />
            </div>
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-2">
          {/* A plain button rather than `DialogClose`: this dialog is Base UI, whose
              close primitive renders its own element and has no `asChild` to hand the
              styling to. `onCancel` is the same path the overlay and Escape take. */}
          <Button
            variant="ghost"
            onClick={onCancel}
            className={`${plain} h-11 px-4 text-[13.5px] font-semibold text-muted-foreground`}
          >
            Cancel
          </Button>
          <Button
            onClick={() => onConfirm(relation, note)}
            disabled={pending}
            className={`${plain} h-11 gap-2 px-4 text-[13.5px] font-semibold`}
          >
            {pending && <Loader2 className="size-4 animate-spin" />}
            Connect
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
