"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { API_BASE, API_PREFIX, apiFetch } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import type { InstagramConnectionsResponse } from "@/lib/types";

export function useInstagramConnections() {
  return useQuery({
    queryKey: queryKeys.integrations.instagram,
    queryFn: () => apiFetch<InstagramConnectionsResponse>("/integrations/instagram"),
  });
}

export function useDisconnectInstagram() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<void>(`/integrations/instagram/${id}`, { method: "DELETE" }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.integrations.instagram }),
  });
}

/**
 * Full-page URL that starts the Instagram consent round.
 *
 * A navigation, not a fetch: Facebook answers with its own consent screen and needs the
 * address bar. The session cookie rides along because it is SameSite=Lax and this is a
 * top-level GET.
 */
export function instagramConnectUrl(): string {
  return `${API_BASE}${API_PREFIX}/integrations/instagram/start`;
}
