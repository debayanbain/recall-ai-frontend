"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, Plus, X } from "lucide-react";
import { toast } from "@/lib/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  useAddToSpace,
  useCreateSpace,
  useRemoveFromSpace,
  useSpaces,
  useSpacesForItem,
} from "@/hooks/use-spaces";
import { exitSelection } from "@/lib/stores/selection-store";
import { SpaceGlyph } from "@/components/space-icon";
import { SpaceIconPicker } from "@/components/space-icon-picker";
import { ACCENT_KEYS, gradientFor } from "@/lib/space-accent";
import type { Space } from "@/lib/types";

/**
 * "Add to space", the fastest path from a pile of memories to a context.
 *
 * One sheet, three ways in — the "+" on a card, the bulk bar after a multi-select, and
 * "New space" with nothing chosen. They differ only in what they arrive holding.
 *
 * Two rules this component is built around:
 *
 * **It must work with the model switched off.** The AI proposal (a suggested title and
 * description for the chosen memories) sits at the top and is an *enhancement*: if the
 * call fails, is rate-limited, or no chat model is configured, the list of existing
 * spaces and the manual create form are still exactly there. A magic feature that becomes
 * a wall when it is unavailable is worse than no magic feature.
 *
 * **Checkmarks appear for one memory, not for many.** Knowing whether a space already
 * contains *all* of a 20-item selection would be 20 lookups; adding is idempotent
 * server-side and reports `added`/`skipped`, so the multi-select path simply adds and
 * says what happened. Claiming "already in this space" for a set we have not checked
 * would be a confident lie in the one place the user is deciding.
 */

const plain = "rounded-xl tracking-normal normal-case";
/** `Space.name` is capped at 255 server-side; trim here so a long paste is not rejected. */
const NAME_MAX = 255;

type SheetState = { itemIds: string[] } | null;

const AddToSpaceContext = createContext<{
  /** Open holding these memories. Empty array = "create a space from nothing". */
  open: (itemIds?: string[]) => void;
} | null>(null);

export function useAddToSpaceSheet() {
  const ctx = useContext(AddToSpaceContext);
  if (!ctx)
    throw new Error(
      "useAddToSpaceSheet must be used inside <AddToSpaceProvider>",
    );
  return ctx;
}

export function AddToSpaceProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<SheetState>(null);
  const open = useCallback(
    (itemIds: string[] = []) => setState({ itemIds }),
    [],
  );
  const value = useMemo(() => ({ open }), [open]);
  const isMobile = useIsMobile();

  const onOpenChange = (next: boolean) => {
    if (!next) setState(null);
  };

  return (
    <AddToSpaceContext.Provider value={value}>
      {children}
      {isMobile ? (
        <Sheet open={state !== null} onOpenChange={onOpenChange}>
          <SheetContent
            side="bottom"
            showCloseButton={false}
            className="max-h-[92dvh] gap-0 overflow-y-auto overscroll-contain rounded-t-[28px] border-border bg-card p-5 pb-[calc(env(safe-area-inset-bottom)+1.25rem)] text-card-foreground"
          >
            <div
              aria-hidden
              className="mx-auto mb-4 h-1 w-10 rounded-full bg-border"
            />
            <AddToSpaceForm
              itemIds={state?.itemIds ?? []}
              onDone={() => setState(null)}
              CloseButton={SheetClose}
              TitleSlot={SheetTitle}
              DescriptionSlot={SheetDescription}
            />
          </SheetContent>
        </Sheet>
      ) : (
        <Dialog open={state !== null} onOpenChange={onOpenChange}>
          <DialogContent
            showCloseButton={false}
            className="max-h-[92dvh] max-w-lg gap-0 overflow-y-auto overscroll-contain rounded-3xl border-border bg-card p-5 text-card-foreground ring-0 sm:max-w-lg"
          >
            <AddToSpaceForm
              itemIds={state?.itemIds ?? []}
              onDone={() => setState(null)}
              CloseButton={DialogClose}
              TitleSlot={DialogTitle}
              DescriptionSlot={DialogDescription}
            />
          </DialogContent>
        </Dialog>
      )}
    </AddToSpaceContext.Provider>
  );
}

function AddToSpaceForm({
  itemIds,
  onDone,
  CloseButton,
  TitleSlot,
  DescriptionSlot,
}: {
  itemIds: string[];
  onDone: () => void;
  CloseButton: typeof SheetClose;
  TitleSlot: typeof SheetTitle;
  DescriptionSlot: typeof SheetDescription;
}) {
  const router = useRouter();
  const count = itemIds.length;
  const single = count === 1 ? itemIds[0] : undefined;

  const { data: spaces, isLoading } = useSpaces();
  const { data: containing } = useSpacesForItem(single);
  const add = useAddToSpace();
  const remove = useRemoveFromSpace();
  const create = useCreateSpace();

  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [icon, setIcon] = useState<string | null>(null);
  const [accent, setAccent] = useState<string>(ACCENT_KEYS[0]);

  // Only the spaces this person may actually write to. Offering one they will be refused
  // for is an error message where a disabled row would have been an explanation.
  const writable = useMemo(
    () => (spaces ?? []).filter((s) => s.role !== "viewer"),
    [spaces],
  );

  const busy = add.isPending || remove.isPending || create.isPending;

  const addTo = (space: Space) => {
    add.mutate(
      { spaceId: space.id, itemIds },
      {
        onSuccess: (result) => {
          // `skipped` counts what was already there *and* anything that was not the
          // caller's to add, so it is reported rather than swallowed — "added 3" next to
          // a selection of five is a question the user is entitled to see.
          toast.success(
            result.added === 0
              ? `Already in ${space.name}`
              : `Added ${result.added} to ${space.name}`,
            result.skipped > 0 && result.added > 0
              ? {
                  description: `${result.skipped} were already there or aren't yours to add.`,
                }
              : undefined,
          );
          exitSelection();
          onDone();
        },
        onError: () =>
          toast.error("Couldn't add to that space", {
            description: "Nothing was changed. Try again in a moment.",
          }),
      },
    );
  };

  const removeFrom = (space: Space) => {
    if (!single) return;
    remove.mutate(
      { spaceId: space.id, itemId: single },
      {
        onSuccess: () => toast.info(`Removed from ${space.name}`),
        onError: () => toast.error("Couldn't remove it from that space"),
      },
    );
  };

  const submitNew = () => {
    const trimmed = name.trim().slice(0, NAME_MAX);
    if (!trimmed) {
      toast.info("Give the space a name first");
      return;
    }
    create.mutate(
      { name: trimmed, icon, accent, item_ids: itemIds },
      {
        onSuccess: (space) => {
          toast.success(`Created ${space.name}`, {
            description: count
              ? `${count} ${count === 1 ? "memory" : "memories"} added`
              : undefined,
          });
          exitSelection();
          onDone();
          router.push(`/spaces/${space.id}`);
        },
        onError: () =>
          toast.error("Couldn't create that space", {
            description: "Nothing was saved. Try again in a moment.",
          }),
      },
    );
  };

  return (
    <div>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <DescriptionSlot className="mt-0 text-[11px] font-semibold uppercase tracking-wider text-primary">
            {count === 0
              ? "New space"
              : `${count} ${count === 1 ? "memory" : "memories"} selected`}
          </DescriptionSlot>
          <TitleSlot className="font-display text-[20px] leading-tight tracking-tight text-foreground normal-case sm:text-[22px]">
            {count === 0 ? "What are you building?" : "Add to a space"}
          </TitleSlot>
        </div>
        <CloseButton
          render={
            <Button
              variant="ghost"
              size="icon"
              aria-label="Close"
              className={`${plain} size-10 shrink-0 rounded-full text-muted-foreground`}
            />
          }
        >
          <X className="size-4" />
        </CloseButton>
      </div>

      {creating || count === 0 ? (
        <div className="mt-5 space-y-4">
          <div className="space-y-1.5">
            <Label
              htmlFor="space-name"
              className="text-[12.5px] font-medium normal-case tracking-normal"
            >
              Name
            </Label>
            <Input
              id="space-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submitNew()}
              maxLength={NAME_MAX}
              autoFocus
              placeholder="Startup validation"
              className="h-11 rounded-xl border border-border bg-secondary/50 px-3 text-[14px] focus-visible:border-primary/40 focus-visible:bg-white focus-visible:ring-4 focus-visible:ring-primary/10"
            />
          </div>

          <div className="space-y-1.5">
            <p className="text-[12.5px] font-medium">
              Icon &amp; colour{" "}
              <span className="text-muted-foreground">(optional)</span>
            </p>
            <SpaceIconPicker
              icon={icon}
              accent={accent}
              onIconChange={setIcon}
              onAccentChange={setAccent}
            />
          </div>

          <div className="flex gap-2 pt-1">
            {count > 0 && (
              <Button
                variant="outline"
                onClick={() => setCreating(false)}
                className={`${plain} h-11 border-border px-4 text-[13.5px] font-medium`}
              >
                Back
              </Button>
            )}
            <Button
              onClick={submitNew}
              disabled={busy}
              className={`${plain} h-11 flex-1 gap-2 gradient-primary px-4 text-[13.5px] font-semibold text-white hover:bg-transparent`}
            >
              {create.isPending && <Loader2 className="size-4 animate-spin" />}
              {count > 0
                ? `Create and add ${count === 1 ? "it" : "them"}`
                : "Create space"}
            </Button>
          </div>
        </div>
      ) : (
        <div className="mt-5">
          {isLoading ? (
            <div
              aria-busy="true"
              aria-label="Loading spaces"
              className="space-y-2"
            >
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-14 w-full rounded-2xl" />
              ))}
            </div>
          ) : writable.length ? (
            <ul className="space-y-2">
              {writable.map((space) => {
                const has = Boolean(single && containing?.includes(space.id));
                return (
                  <li key={space.id}>
                    <button
                      type="button"
                      onClick={() => (has ? removeFrom(space) : addTo(space))}
                      disabled={busy}
                      aria-pressed={has}
                      className="flex w-full items-center gap-3 rounded-2xl border border-border bg-card p-3 text-left transition-colors hover:bg-secondary/50 disabled:opacity-60 aria-pressed:border-primary/40 aria-pressed:bg-primary-soft"
                    >
                      <span
                        aria-hidden
                        className={`grid size-10 shrink-0 place-items-center rounded-xl bg-linear-to-br text-[17px] ${gradientFor(space)}`}
                      >
                        <SpaceGlyph space={space} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[14px] font-medium">
                          {space.name}
                        </span>
                        <span className="block text-[11.5px] tabular-nums text-muted-foreground">
                          {space.memory_count}{" "}
                          {space.memory_count === 1 ? "memory" : "memories"}
                        </span>
                      </span>
                      {/* Only meaningful for a single memory — see the note at the top of
                          this file about why a multi-select shows no checkmarks. */}
                      {has && (
                        <Check className="size-4 shrink-0 text-primary" />
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="rounded-2xl border border-dashed border-border bg-secondary/30 px-4 py-6 text-center text-[13px] leading-relaxed text-muted-foreground">
              You don&rsquo;t have a space you can add to yet.
            </p>
          )}

          <Button
            variant="outline"
            onClick={() => setCreating(true)}
            className={`${plain} mt-3 h-11 w-full gap-2 border-dashed border-border bg-secondary/40 text-[13px] font-medium text-muted-foreground hover:text-foreground`}
          >
            <Plus className="size-4" /> Create a new space
          </Button>
        </div>
      )}
    </div>
  );
}
