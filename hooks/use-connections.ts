"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSession } from "@/hooks/use-auth";
import { apiFetch } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import type {
  ConnectionHub,
  ConnectionNeighbourhood,
  ConnectionSuggestionList,
  MemoryConnection,
  Relation,
  VaultGraph,
} from "@/lib/types";

/**
 * Server state for connections. Same shape as `hooks/use-spaces.ts`: `apiFetch` only,
 * queries disabled while signed out, and every mutation invalidates through `queryKeys`.
 *
 * One rule specific to this file: **an edge belongs to two memories, so every mutation
 * invalidates `queryKeys.connections.all`** and never just the neighbourhood it was made
 * from. Connecting A to B changes what B's page shows, and B's page is a different cache
 * entry. Narrowing this to the focus key is the bug that would look like a stale render
 * nobody can reproduce.
 */

export function useConnections(itemId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.connections.forItem(itemId ?? ""),
    queryFn: () =>
      apiFetch<ConnectionNeighbourhood>(
        `/connections/for-item/${encodeURIComponent(itemId!)}`,
      ),
    enabled: Boolean(itemId),
    // Edges are derived after the pipeline finishes, so a memory opened seconds after
    // capture legitimately has none yet. Poll only while it is still being read — the
    // same conditional interval `useSpace` uses, and it stops on its own.
    refetchInterval: (query) => {
      const status = query.state.data?.focus.processing_status;
      return status === "pending" || status === "processing" ? 5_000 : false;
    },
  });
}

/**
 * The busiest memories. What `/connections` offers when nobody named one.
 *
 * An empty list is a real answer — a vault with no edges yet — and the caller falls back
 * to recent memories rather than showing an empty page.
 */
export function useConnectionHubs() {
  const { isSignedIn } = useSession();
  return useQuery({
    queryKey: queryKeys.connections.hubs,
    queryFn: () => apiFetch<{ hubs: ConnectionHub[] }>("/connections/hubs"),
    enabled: isSignedIn,
  });
}

/**
 * The whole vault as a graph. What the canvas draws.
 *
 * One request for every node and every edge, rather than a neighbourhood per memory:
 * a canvas that fetched per node would issue one round trip per card it drew, against a
 * database in another region — which is the same arithmetic `CLAUDE.md` does for the
 * thumbnail route it decided not to add.
 *
 * Polled slowly while anything is still being captured, because edges are derived *after*
 * the pipeline finishes: a memory saved thirty seconds ago legitimately has none yet, and
 * a canvas that never notices them arriving looks like a feature that did not run. The
 * interval is deliberately longer than `useConnections`' — a whole-graph refetch is a
 * relayout, and a graph that rearranges itself under a cursor every five seconds is worse
 * than one that is briefly out of date.
 */
export function useConnectionGraph(includeDismissed = false) {
  const { isSignedIn } = useSession();
  return useQuery({
    queryKey: queryKeys.connections.graph(includeDismissed),
    queryFn: () =>
      apiFetch<VaultGraph>(
        `/connections/graph${includeDismissed ? "?include_dismissed=true" : ""}`,
      ),
    enabled: isSignedIn,
    refetchInterval: 30_000,
    // The canvas keeps its own node positions; a refetch that blanked the graph would
    // throw away a layout somebody has been dragging.
    placeholderData: (previous) => previous,
  });
}

/**
 * One memory's undecided edges, polled until the pipeline that derives them has finished.
 *
 * What the post-capture modal waits on. Derivation is the *last* step of processing and
 * runs in its own Celery task after the commit, so a memory saved a second ago has no
 * suggestions yet and an empty answer here means "not finished", not "nothing found" --
 * which is why the poll is keyed on the focus item's own `processing_status` rather than
 * on the edge count. It stops the moment the item reaches a terminal state.
 *
 * Faster than `useConnections`' interval because something is waiting on the answer:
 * nobody is watching a memory's page for an edge to appear, and somebody *is* watching
 * for this.
 */
export function useItemSuggestions(itemId: string | null) {
  return useQuery({
    queryKey: queryKeys.connections.forItemSuggested(itemId ?? ""),
    queryFn: () =>
      apiFetch<ConnectionNeighbourhood>(
        `/connections/for-item/${encodeURIComponent(itemId!)}?include_suggested=true`,
      ),
    enabled: Boolean(itemId),
    refetchInterval: (query) => {
      const status = query.state.data?.focus.processing_status;
      return status === "pending" || status === "processing" ? 3_000 : false;
    },
  });
}

/** The undecided edges. Per user, not per memory — one decision offered once. */
export function useConnectionSuggestions() {
  const { isSignedIn } = useSession();
  return useQuery({
    queryKey: queryKeys.connections.suggestions,
    queryFn: () => apiFetch<ConnectionSuggestionList>("/connections/suggestions"),
    enabled: isSignedIn,
  });
}

function useConnectionMutation<TArgs, TResult>(
  run: (args: TArgs) => Promise<TResult>,
) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: run,
    onSuccess: () => {
      // Both ends, always. See the note at the top of this file.
      void client.invalidateQueries({ queryKey: queryKeys.connections.all });
    },
  });
}

export type ConnectInput = {
  sourceId: string;
  targetId: string;
  relation?: Relation;
  note?: string | null;
};

/** `created: false` means the pair already had an edge, in either order. Not an error. */
export type ConnectResult = { connection: MemoryConnection; created: boolean };

export function useCreateConnection() {
  return useConnectionMutation<ConnectInput, ConnectResult>((input) =>
    apiFetch<ConnectResult>("/connections", {
      method: "POST",
      body: {
        source_id: input.sourceId,
        target_id: input.targetId,
        relation: input.relation ?? "related_to",
        note: input.note ?? null,
      },
    }),
  );
}

export type UpdateConnectionInput = {
  id: string;
  relation?: Relation;
  /** The empty string clears the note; omitting it leaves the note alone. */
  note?: string;
};

export function useUpdateConnection() {
  return useConnectionMutation<UpdateConnectionInput, MemoryConnection>(
    ({ id, ...body }) =>
      apiFetch<MemoryConnection>(`/connections/${encodeURIComponent(id)}`, {
        method: "PATCH",
        body,
      }),
  );
}

export function useConfirmConnection() {
  return useConnectionMutation<string, MemoryConnection>((id) =>
    apiFetch<MemoryConnection>(`/connections/${encodeURIComponent(id)}/confirm`, {
      method: "POST",
    }),
  );
}

/** Decline a suggestion. The pair is never proposed again — connecting it by hand revives it. */
export function useDismissConnection() {
  return useConnectionMutation<string, void>((id) =>
    apiFetch<void>(`/connections/${encodeURIComponent(id)}/dismiss`, {
      method: "POST",
    }),
  );
}

/**
 * Ask the model how two memories relate and label the edge with its answer.
 *
 * 503 when relation labelling is switched off, unconfigured, or this hour's allowance is
 * spent -- one answer for three causes, because they are the same thing from a caller's
 * side and telling them apart would report which of an operator's settings is off. The
 * caller should treat a 503 as "not available", never as an error worth retrying.
 */
export function useRetypeConnection() {
  return useConnectionMutation<string, MemoryConnection>((id) =>
    apiFetch<MemoryConnection>(`/connections/${encodeURIComponent(id)}/retype`, {
      method: "POST",
    }),
  );
}

export function useDeleteConnection() {
  return useConnectionMutation<string, void>((id) =>
    apiFetch<void>(`/connections/${encodeURIComponent(id)}`, { method: "DELETE" }),
  );
}
