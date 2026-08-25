"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch, apiUpload } from "@/lib/api";
import { useSession } from "@/hooks/use-auth";
import { queryKeys } from "@/lib/query-keys";
import type { VaultItem, VaultItemDetail, VaultListResponse } from "@/lib/types";

export function useVaultItems({ limit = 20, offset = 0 } = {}) {
  const { isSignedIn } = useSession();
  return useQuery({
    queryKey: queryKeys.vault.list(limit, offset),
    queryFn: () => apiFetch<VaultListResponse>(`/vault?limit=${limit}&offset=${offset}`),
    // The home feed is on a public page, so an anonymous visitor would otherwise fire a
    // request that can only ever 401 — and a 401 is not a failure worth showing anyone.
    enabled: isSignedIn,
    // Saves are processed by a worker, so a freshly saved item flips from `pending` to
    // `completed` out of band. Poll while anything is still in flight, then stop.
    refetchInterval: (query) =>
      query.state.data?.items.some(
        (i) => i.processing_status === "pending" || i.processing_status === "processing",
      )
        ? 5_000
        : false,
  });
}

export function useVaultItem(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.vault.detail(id ?? ""),
    queryFn: () => apiFetch<VaultItemDetail>(`/vault/${id}`),
    enabled: Boolean(id),
  });
}

export function useSaveUrl() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { url: string; title?: string }) =>
      apiFetch<VaultItem>("/vault/save", { method: "POST", body: input }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.vault.all }),
  });
}

export function useSaveNote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { title: string; content: string }) =>
      apiFetch<VaultItem>("/vault/note", { method: "POST", body: input }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.vault.all }),
  });
}

export function useDeleteVaultItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiFetch<void>(`/vault/${id}`, { method: "DELETE" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.vault.all }),
  });
}


export function useUploadPdf() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => {
      const form = new FormData();
      form.append("file", file);
      return apiUpload<VaultItem>("/vault/upload", form);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.vault.all }),
  });
}
