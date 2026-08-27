"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import type { TelegramConnectionResponse, TelegramLinkResponse } from "@/lib/types";

/**
 * Connection status.
 *
 * `pollWhileUnlinked` turns on a short refetch interval so the card flips over on its
 * own once the user taps Start in Telegram — there is no callback to this tab, the
 * confirmation happens entirely on the phone. The poll stops the moment an account
 * appears, so a connected page is not sitting on a permanent timer.
 */
export function useTelegramConnection({ pollWhileUnlinked = false } = {}) {
  return useQuery({
    queryKey: queryKeys.integrations.telegram,
    queryFn: () => apiFetch<TelegramConnectionResponse>("/integrations/telegram"),
    refetchInterval: (query) =>
      pollWhileUnlinked && !query.state.data?.account ? 3000 : false,
  });
}

/**
 * Mints the deep link.
 *
 * A POST rather than a plain URL because it writes a single-use token — and because the
 * response is a bearer credential for a few minutes, it is deliberately not cached.
 */
export function useCreateTelegramLink() {
  return useMutation({
    mutationFn: () =>
      apiFetch<TelegramLinkResponse>("/integrations/telegram/link", { method: "POST" }),
  });
}

export function useDisconnectTelegram() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => apiFetch<void>("/integrations/telegram", { method: "DELETE" }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.integrations.telegram }),
  });
}
