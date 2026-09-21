"use client";

import { useState } from "react";
import Link from "next/link";
import { Loader2, RotateCcw, Trash2, TriangleAlert } from "lucide-react";
import { toast } from "@/lib/toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useEmptyTrash,
  usePurgeVaultItem,
  useRestoreVaultItem,
  useTrashItems,
} from "@/hooks/use-vault";
import { useSession } from "@/hooks/use-auth";
import { kindMeta } from "@/lib/mock-data";
import { toMemories } from "@/lib/vault-adapter";
import type { TrashItem } from "@/lib/types";

/**
 * How long this memory has left, in the words a person would use.
 *
 * Derived from the server's own `purge_after` rather than from `deleted_at` plus a number
 * the client was told once: the sweep reads the setting, so the server's date is the only
 * one that is true. Rounded up, because "0 days left" on something still restorable reads
 * as already gone.
 */
function daysLeft(purgeAfter: string): string {
  const ms = new Date(purgeAfter).getTime() - Date.now();
  if (Number.isNaN(ms)) return "Scheduled for removal";
  if (ms <= 0) return "Removed at the next sweep";
  const days = Math.ceil(ms / 86_400_000);
  return days === 1 ? "1 day left" : `${days} days left`;
}

function TrashRow({ item }: { item: TrashItem }) {
  const [confirming, setConfirming] = useState(false);
  const restore = useRestoreVaultItem();
  const purge = usePurgeVaultItem();
  // One adapter, so a trashed card is described exactly like a live one — the kind, the
  // source and the label all come from the same mapping the grid uses.
  const [memory] = toMemories([item]);
  const meta = kindMeta[memory.kind];

  return (
    <Card className="gap-0 rounded-2xl border border-border/70 bg-white/70 py-0 shadow-none ring-0">
      <CardContent className="flex flex-col gap-3 px-4 py-3.5 sm:flex-row sm:items-center sm:gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="gap-1.5 rounded-full border border-border/70 bg-white/80 px-2.5 py-1 text-[11.5px] font-medium tracking-normal normal-case">
              <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${meta.dot}`} />
              {meta.label}
            </Badge>
            <span className="text-[11.5px] text-muted-foreground">{daysLeft(item.purge_after)}</span>
          </div>
          <p className="mt-1.5 truncate text-[14.5px] font-medium">
            {/* An item deleted before the pipeline finished may have no title, exactly as
                it had none on the card it was deleted from. */}
            {memory.title || item.source_url || "Untitled memory"}
          </p>
          {memory.summary && (
            <p className="mt-0.5 line-clamp-2 text-[13px] text-muted-foreground">{memory.summary}</p>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <Button
            variant="ghost"
            onClick={() =>
              restore.mutate(item.id, {
                onSuccess: () =>
                  toast.success("Restored", { description: memory.title || undefined }),
                onError: () =>
                  toast.error("Couldn't restore that", {
                    description: "Try again in a moment.",
                  }),
              })
            }
            disabled={restore.isPending || purge.isPending}
            className="h-10 gap-2 rounded-xl px-3 text-[13px] font-medium tracking-normal normal-case hover:bg-secondary sm:h-9"
          >
            {restore.isPending ? (
              <Loader2 className="size-3.5 animate-spin" aria-hidden />
            ) : (
              <RotateCcw className="size-3.5" aria-hidden />
            )}
            Restore
          </Button>

          {/* Two taps, and the second one says what it does. This is the only control in
              the app with no undo behind it, so it must not be reachable by one reflex. */}
          <Button
            variant="ghost"
            onClick={() => {
              if (!confirming) {
                setConfirming(true);
                return;
              }
              purge.mutate(item.id, {
                onSuccess: () =>
                  toast.success("Deleted for good", { description: memory.title || undefined }),
                onError: () => {
                  setConfirming(false);
                  toast.error("Couldn't delete that", {
                    description: "Try again in a moment.",
                  });
                },
              });
            }}
            onBlur={() => setConfirming(false)}
            disabled={restore.isPending || purge.isPending}
            className={`h-10 gap-2 rounded-xl px-3 text-[13px] font-medium tracking-normal normal-case sm:h-9 ${
              confirming
                ? "bg-destructive/10 text-destructive hover:bg-destructive/15"
                : "text-muted-foreground hover:bg-secondary hover:text-foreground"
            }`}
          >
            {purge.isPending ? (
              <Loader2 className="size-3.5 animate-spin" aria-hidden />
            ) : (
              <Trash2 className="size-3.5" aria-hidden />
            )}
            {confirming ? "Delete forever?" : "Delete forever"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export function TrashView() {
  const { isSignedIn, isLoading: sessionLoading } = useSession();
  const { data, isPending, isError, refetch } = useTrashItems();
  const empty = useEmptyTrash();
  const [confirmingEmpty, setConfirmingEmpty] = useState(false);

  if (!sessionLoading && !isSignedIn) {
    return (
      <p className="text-[13.5px] text-muted-foreground">
        <Link href="/sign-in" className="underline underline-offset-2">
          Sign in
        </Link>{" "}
        to see what you have deleted.
      </p>
    );
  }

  if (sessionLoading || (isSignedIn && isPending)) {
    return (
      <div aria-busy="true" aria-label="Loading trash" className="flex flex-col gap-3">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-[86px] w-full rounded-2xl" />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <Card className="rounded-2xl border border-border/70 py-0 shadow-none ring-0">
        <CardContent className="flex flex-col items-start gap-3 px-4 py-5">
          <p className="text-[14px]">We couldn&rsquo;t load your trash.</p>
          <Button
            onClick={() => refetch()}
            className="h-10 rounded-xl px-3 text-[13px] tracking-normal normal-case sm:h-9"
          >
            Try again
          </Button>
        </CardContent>
      </Card>
    );
  }

  const items = data?.items ?? [];
  const retention = data?.retention_days;

  if (items.length === 0) {
    return (
      <Card className="rounded-2xl border border-dashed border-border/70 py-0 shadow-none ring-0">
        <CardContent className="flex flex-col items-start gap-1.5 px-5 py-8">
          <p className="text-[15px] font-medium">Nothing in the trash</p>
          <p className="text-[13.5px] text-muted-foreground">
            Deleted memories wait here
            {retention ? ` for ${retention} days` : ""} before they are removed for good.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <p className="text-[12.5px] text-muted-foreground">
          {data?.total} {data?.total === 1 ? "memory" : "memories"}
          {retention ? ` · removed for good ${retention} days after you delete them` : ""}
        </p>
        <Button
          variant="ghost"
          onClick={() => {
            if (!confirmingEmpty) {
              setConfirmingEmpty(true);
              return;
            }
            empty.mutate(undefined, {
              onSuccess: (result) => {
                setConfirmingEmpty(false);
                toast.success(
                  `${result.purged} ${result.purged === 1 ? "memory" : "memories"} deleted for good`,
                );
              },
              onError: () => {
                setConfirmingEmpty(false);
                toast.error("Couldn't empty the trash", {
                  description: "Try again in a moment.",
                });
              },
            });
          }}
          onBlur={() => setConfirmingEmpty(false)}
          disabled={empty.isPending}
          className={`h-10 gap-2 rounded-xl px-3 text-[13px] font-medium tracking-normal normal-case sm:ml-auto sm:h-9 ${
            confirmingEmpty
              ? "bg-destructive/10 text-destructive hover:bg-destructive/15"
              : "text-muted-foreground hover:bg-secondary hover:text-foreground"
          }`}
        >
          {empty.isPending ? (
            <Loader2 className="size-3.5 animate-spin" aria-hidden />
          ) : (
            <TriangleAlert className="size-3.5" aria-hidden />
          )}
          {confirmingEmpty ? "Empty trash — this cannot be undone?" : "Empty trash"}
        </Button>
      </div>

      <div className="flex flex-col gap-3">
        {items.map((item) => (
          <TrashRow key={item.id} item={item} />
        ))}
      </div>
    </div>
  );
}
