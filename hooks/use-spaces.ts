"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { useSession } from "@/hooks/use-auth";
import { queryKeys } from "@/lib/query-keys";
import type {
  AddItemsResponse,
  Space,
  SpaceDetail,
  SpaceInvite,
  SpaceRole,
  Visibility,
} from "@/lib/types";

/**
 * Server state for Spaces. Same shape as `hooks/use-vault.ts` and for the same reasons:
 * `apiFetch` is the only thing that talks to the API, queries are disabled while signed
 * out (a request that can only ever 401 is not a failure worth showing anyone), and every
 * mutation invalidates through `queryKeys` rather than guessing a key.
 *
 * One rule specific to this file: **a Space's membership changes what a *memory* card
 * shows**, so mutations that add or remove items invalidate `queryKeys.spaces.all` — which
 * covers the `for-item` lookups the "+" menu reads — and not just the one Space.
 */

export function useSpaces() {
  const { isSignedIn } = useSession();
  return useQuery({
    queryKey: queryKeys.spaces.list,
    queryFn: () => apiFetch<Space[]>("/spaces"),
    enabled: isSignedIn,
  });
}

export function useSpace(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.spaces.detail(id ?? ""),
    queryFn: () => apiFetch<SpaceDetail>(`/spaces/${encodeURIComponent(id!)}`),
    enabled: Boolean(id),
    // A Space is mostly memories, and a freshly captured one is enriched out of band —
    // the same reason the vault list polls. Stops the moment everything has landed.
    refetchInterval: (query) =>
      query.state.data?.items.some(
        (i) =>
          i.processing_status === "pending" ||
          i.processing_status === "processing",
      )
        ? 5_000
        : false,
  });
}

/** Which of my Spaces already hold this memory. Drives the checkmarks in the + menu. */
export function useSpacesForItem(itemId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: queryKeys.spaces.forItem(itemId ?? ""),
    queryFn: () =>
      apiFetch<string[]>(`/spaces/for-item/${encodeURIComponent(itemId!)}`),
    enabled: Boolean(itemId) && enabled,
  });
}

export type CreateSpaceInput = {
  name: string;
  description?: string | null;
  visibility?: Visibility;
  /** A Lucide icon name from `lib/space-icons`, or null for none. */
  icon?: string | null;
  emoji?: string | null;
  accent?: string | null;
  /** Fill it in the same request — what makes approving a proposal one click. */
  item_ids?: string[];
};

export function useCreateSpace() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateSpaceInput) =>
      apiFetch<Space>("/spaces", { method: "POST", body: input }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.spaces.all }),
  });
}

export type UpdateSpaceInput = {
  name?: string;
  description?: string | null;
  visibility?: Visibility;
  /** `""` clears it, `undefined` leaves it alone — same contract as `emoji`. */
  icon?: string | null;
  emoji?: string | null;
  accent?: string | null;
  pinned?: boolean;
};

export function useUpdateSpace(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateSpaceInput) =>
      apiFetch<Space>(`/spaces/${encodeURIComponent(id)}`, {
        method: "PATCH",
        body: input,
      }),
    onSuccess: (space) => {
      // Written straight into the detail cache so a rename or a pin shows on the same
      // tick rather than after a refetch, then the list is invalidated for the card.
      queryClient.setQueryData<SpaceDetail | undefined>(
        queryKeys.spaces.detail(space.id),
        (current) => (current ? { ...current, ...space } : current),
      );
      queryClient.invalidateQueries({ queryKey: queryKeys.spaces.all });
    },
  });
}

export function useDeleteSpace() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<void>(`/spaces/${encodeURIComponent(id)}`, { method: "DELETE" }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.spaces.all }),
  });
}

/**
 * Add memories to a Space.
 *
 * Idempotent server-side, so a selection that overlaps what is already there is a normal
 * call with a truthful `skipped` count rather than an error. `skipped` also counts
 * anything that was not the caller's to add — the UI should say "added N" and not claim
 * the rest succeeded.
 */
export function useAddToSpace() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      spaceId,
      itemIds,
    }: {
      spaceId: string;
      itemIds: string[];
    }) =>
      apiFetch<AddItemsResponse>(
        `/spaces/${encodeURIComponent(spaceId)}/items`,
        {
          method: "POST",
          body: { item_ids: itemIds },
        },
      ),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.spaces.all }),
  });
}

export function useRemoveFromSpace() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ spaceId, itemId }: { spaceId: string; itemId: string }) =>
      apiFetch<void>(
        `/spaces/${encodeURIComponent(spaceId)}/items/${encodeURIComponent(itemId)}`,
        { method: "DELETE" },
      ),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.spaces.all }),
  });
}

/**
 * Mint a single-use invite link.
 *
 * Deliberately a mutation and not a query: every call creates a live credential, and a
 * query would re-mint one on every focus, leaving a trail of working links behind.
 */
export function useCreateSpaceInvite(spaceId: string) {
  return useMutation({
    mutationFn: (role: SpaceRole) =>
      apiFetch<SpaceInvite>(`/spaces/${encodeURIComponent(spaceId)}/invites`, {
        method: "POST",
        body: { role },
      }),
  });
}

export function useAcceptSpaceInvite() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (token: string) =>
      apiFetch<Space>(`/spaces/invites/${encodeURIComponent(token)}/accept`, {
        method: "POST",
      }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.spaces.all }),
  });
}

export function useRemoveSpaceMember(spaceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (memberId: string) =>
      apiFetch<void>(
        `/spaces/${encodeURIComponent(spaceId)}/members/${encodeURIComponent(memberId)}`,
        { method: "DELETE" },
      ),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.spaces.all }),
  });
}
