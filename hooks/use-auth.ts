"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { ApiError, apiFetch } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import type { ProvidersResponse, SessionUser } from "@/lib/types";

/**
 * Current session, or `null` when signed out.
 *
 * A 401 is a normal answer here, not a failure, so it resolves to `null` instead of
 * throwing — otherwise every signed-out page render would sit in an error state. Any
 * other status still throws so real outages stay visible.
 */
export function useSession() {
  const query = useQuery({
    queryKey: queryKeys.session,
    queryFn: async (): Promise<SessionUser | null> => {
      try {
        return await apiFetch<SessionUser>("/auth/me");
      } catch (error) {
        if (error instanceof ApiError && error.isUnauthorized) return null;
        throw error;
      }
    },
    staleTime: 60_000,
  });

  return {
    user: query.data ?? null,
    // `isPending` stays true on the very first load; the UI holds a skeleton rather
    // than flashing "Sign in" at someone who is already signed in.
    isLoading: query.isPending,
    isSignedIn: Boolean(query.data),
    error: query.error,
  };
}

/**
 * Providers this deployment can actually complete a login with.
 *
 * In production the list only moves on a redeploy, so it is cached hard. In development
 * it changes every time someone edits `.env` and restarts the API — caching it for an
 * hour there means a freshly configured provider silently fails to appear, with the
 * global `refetchOnWindowFocus: false` removing the usual way out. So: always refetch
 * on mount in dev.
 */
export function useAuthProviders() {
  return useQuery({
    queryKey: queryKeys.providers,
    queryFn: () => apiFetch<ProvidersResponse>("/auth/providers"),
    staleTime: process.env.NODE_ENV === "production" ? 60 * 60_000 : 0,
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: () => apiFetch<{ ok: boolean }>("/auth/logout", { method: "POST" }),
    onSettled: () => {
      // Clear on settled, not just on success: if the request failed we still do not
      // know the session is valid, and leaving another user's cached vault in memory
      // on a shared machine is worse than an extra refetch.
      queryClient.clear();
      router.replace("/sign-in");
      router.refresh();
    },
  });
}
