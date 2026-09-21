"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import Link from "next/link";
import { ArrowRight, Check, Link2, Loader2, Sparkles, X } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from "@/components/ui/dialog";
import { ConnectChip, MemoryRow } from "@/components/memory-card";
import {
  useConfirmConnection,
  useDismissConnection,
  useItemSuggestions,
} from "@/hooks/use-connections";
import { relationLabel } from "@/lib/connection-style";
import { toast } from "@/lib/toast";
import { toMemory } from "@/lib/vault-adapter";
import type { MemoryConnection } from "@/lib/types";

/**
 * What a new memory is offered the moment Recall has finished reading it: the memories it
 * looks related to, and one tap to connect each.
 *
 * The suggestions themselves are not new -- every capture has derived them since the
 * feature shipped, and they have always been reachable from `/connections`. What was
 * missing is the moment: a suggestion nobody is shown is a decision nobody makes, and the
 * one time somebody actually knows whether two memories belong together is right after
 * saving the second one. This brings that list to them instead of waiting for a visit to
 * a page they may never open.
 *
 * Six things here are decisions rather than details.
 *
 * **It cannot appear on save, and does not pretend to.** Derivation is the last step of
 * processing and runs in its own task after the commit, so at the instant the toast says
 * "Saved" there is nothing to suggest. The provider watches the item and opens when the
 * answer exists -- usually a few seconds, and the toast already says Recall is reading it.
 *
 * **The wait is capped.** An Apify crawl can run for minutes, and a dialog that opens
 * over whatever somebody is doing six minutes after they saved something is an ambush
 * rather than a suggestion. Past `WATCH_TIMEOUT_MS` the watch is dropped in silence --
 * nothing is lost, the suggestions are in the inbox and on the canvas either way.
 *
 * **No suggestions means no dialog.** An empty modal is an interruption that says
 * nothing, and "we found nothing related" is not worth taking the screen for.
 *
 * **One watch at a time.** Somebody pasting four links in a row must not be handed four
 * modals; a new capture replaces the watch the last one started.
 *
 * **The score is deliberately not rendered.** It is a cosine similarity whose scale
 * depends on the embedding provider -- 0.62 means something different under Gemini than
 * under OpenAI, and `CLAUDE.md` records that the connection floor has never been measured
 * against a real vault. A number nobody can calibrate reads as precision that is not
 * there. The model's own sentence is the signal, and it is marked as model-written.
 *
 * **Nothing here writes an edge by itself.** Every row is `suggested` until a person taps
 * Connect, which is the same control that makes the derivation safe: tool results and
 * scraped captions are attacker-writable text, and confirmation is what stands between a
 * page somebody planted and a route into another memory's prompt context.
 */

/** How long to wait for the pipeline before giving up on the moment. */
const WATCH_TIMEOUT_MS = 90_000;

/**
 * How many suggestions the dialog offers at once.
 *
 * A capture is capped at `CONNECTION_MAX_PER_ITEM` (24) server-side, and a modal holding
 * two dozen decisions is a chore rather than a moment -- the inbox is the right surface
 * for a backlog. The rest are counted, not hidden.
 */
const MAX_ROWS = 3;

const plain = "rounded-xl tracking-normal normal-case";

const ConnectionSuggestContext = createContext<{
  /** Watch a freshly saved memory and offer its connections once they exist. */
  watch: (itemId: string) => void;
} | null>(null);

export function useConnectionSuggest() {
  const ctx = useContext(ConnectionSuggestContext);
  if (!ctx)
    throw new Error(
      "useConnectionSuggest must be used inside <ConnectionSuggestProvider>",
    );
  return ctx;
}

type Watch = { itemId: string; startedAt: number };

export function ConnectionSuggestProvider({ children }: { children: ReactNode }) {
  const [watched, setWatched] = useState<Watch | null>(null);
  /** Rows the person has already answered, hidden before the refetch lands. */
  const [handled, setHandled] = useState<ReadonlySet<string>>(() => new Set());

  const watch = useCallback((itemId: string) => {
    setHandled(new Set());
    setWatched({ itemId, startedAt: Date.now() });
  }, []);
  const value = useMemo(() => ({ watch }), [watch]);

  const { data } = useItemSuggestions(watched?.itemId ?? null);
  const confirm = useConfirmConnection();
  const dismiss = useDismissConnection();

  const status = data?.focus.processing_status;
  // `failed` and `skipped` are terminal too and simply carry nothing, which the
  // zero-suggestion path below turns into silence.
  const settled =
    status === "completed" || status === "failed" || status === "skipped";

  const suggestions = useMemo(
    () =>
      (data?.connections ?? []).filter(
        (edge) => edge.status === "suggested" && !handled.has(edge.id),
      ),
    [data?.connections, handled],
  );

  // Give up rather than interrupt later. The remaining time is what is left of the cap,
  // so a re-render does not restart the clock.
  useEffect(() => {
    if (!watched) return;
    const left = WATCH_TIMEOUT_MS - (Date.now() - watched.startedAt);
    const timer = window.setTimeout(() => setWatched(null), Math.max(left, 0));
    return () => window.clearTimeout(timer);
  }, [watched]);

  // Read, and nothing to offer: `open` is simply false, and the poll has already stopped
  // itself on the terminal status. Clearing the watch here as well would be a setState in
  // an effect to reach a state the render already describes -- the timeout above collects
  // it, and so does the next capture.
  const open = Boolean(watched) && settled && suggestions.length > 0;
  const shown = suggestions.slice(0, MAX_ROWS);
  const focus = data?.focus;

  const answer = (edge: MemoryConnection, connect: boolean) => {
    setHandled((current) => new Set(current).add(edge.id));
    const run = connect ? confirm : dismiss;
    run.mutate(edge.id, {
      onError: () => {
        // Put it back rather than swallow it: a row that vanished and was never written
        // is a decision the person believes they made.
        setHandled((current) => {
          const next = new Set(current);
          next.delete(edge.id);
          return next;
        });
        toast.error(
          connect ? "Couldn't connect those" : "Couldn't dismiss that suggestion",
        );
      },
    });
  };

  return (
    <ConnectionSuggestContext.Provider value={value}>
      {children}
      <Dialog open={open} onOpenChange={(next) => !next && setWatched(null)}>
        {/* `min-w-0`: DialogContent is a grid, and a title that is one unbroken string --
            every pasted filename -- widens the track and pushes the rows past the panel.
            `normal-case` undoes base-sera's uppercase default on DialogTitle. */}
        <DialogContent className="min-w-0 gap-4 rounded-3xl sm:max-w-lg">
          <DialogTitle className="flex items-center gap-2 font-display text-[20px] tracking-tight normal-case">
            <Sparkles className="size-4 shrink-0 text-primary" />
            Connect this to what you already know
          </DialogTitle>
          <DialogDescription className="text-[13px] leading-relaxed">
            Recall found {suggestions.length} memor
            {suggestions.length === 1 ? "y" : "ies"} that look related. Nothing is
            connected until you say so.
          </DialogDescription>

          {focus && (
            <div className="flex min-w-0 flex-col gap-3">
              {/* Not a link: tapping through would close the dialog and throw away the
                  other suggestions along with it. */}
              <MemoryRow m={toMemory(focus)} interactive={false} />
              <ul className="flex flex-col gap-4 border-t border-border/70 pt-3">
                {shown.map((edge) => (
                  <li key={edge.id} className="flex flex-col gap-2">
                    <span className="flex items-center gap-1.5 pl-1 text-[11.5px] text-muted-foreground">
                      <Link2 className="size-3 shrink-0 text-primary" />
                      {/* Read from the new memory's end, which is the one on screen
                          above. `part_of` read from the other side is `has a part in`,
                          and handing over the wrong one inverts the claim silently. */}
                      {relationLabel(edge.relation, edge.direction)}
                    </span>
                    <MemoryRow m={toMemory(edge.memory)} interactive={false} />
                    {edge.ai_reason && <ConnectChip label={edge.ai_reason} />}
                    <div className="flex gap-2">
                      <Button
                        onClick={() => answer(edge, true)}
                        className={`${plain} h-11 gap-1.5 px-4 text-[13px] font-semibold`}
                      >
                        <Check className="size-3.5" /> Connect
                      </Button>
                      <Button
                        variant="ghost"
                        onClick={() => answer(edge, false)}
                        className={`${plain} h-11 gap-1.5 px-4 text-[13px] font-semibold text-muted-foreground`}
                      >
                        <X className="size-3.5" /> Not related
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
              {suggestions.length > shown.length && (
                <p className="text-[11.5px] leading-relaxed text-muted-foreground">
                  {suggestions.length - shown.length} more waiting in Connections.
                </p>
              )}
              <p className="text-[11.5px] leading-relaxed text-muted-foreground">
                Dismissing one means Recall will not suggest that pair again. You can
                still connect them yourself later.
              </p>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-2">
            {/* A plain button rather than `DialogClose` -- same reason as
                `connect-dialog.tsx`: this dialog is Base UI, whose close primitive
                renders its own element and has no `asChild`. */}
            <Button
              variant="ghost"
              onClick={() => setWatched(null)}
              className={`${plain} h-11 px-4 text-[13.5px] font-semibold text-muted-foreground`}
            >
              Review later
            </Button>
            {/* A Link wearing the button's classes rather than `<Button asChild>`:
                this Button has no `asChild`, and a button that navigates by `router.push`
                is one that cannot be opened in a new tab or middle-clicked. */}
            <Link
              href="/connections"
              onClick={() => setWatched(null)}
              className={`${buttonVariants({ variant: "ghost" })} ${plain} h-11 gap-1.5 px-4 text-[13.5px] font-semibold`}
            >
              Open connections <ArrowRight className="size-3.5" />
            </Link>
            {(confirm.isPending || dismiss.isPending) && (
              <Loader2
                aria-hidden
                className="size-4 shrink-0 animate-spin self-center text-muted-foreground"
              />
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ConnectionSuggestContext.Provider>
  );
}
