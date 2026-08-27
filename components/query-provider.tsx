"use client";

import { useEffect, type ReactNode } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { getQueryClient } from "@/lib/query-client";
import { setOnSessionRefreshed } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";

export function QueryProvider({ children }: { children: ReactNode }) {
  // Read through the singleton rather than useState(() => new QueryClient()): during
  // suspense the component can render before mounting, and a new client each pass
  // would throw the cache away.
  const queryClient = getQueryClient();

  useEffect(() => {
    // A silent refresh restores the session mid-flight, but any query that already
    // resolved while the access token was dead is holding a stale "signed out" answer --
    // `useSession` in particular turns a 401 into `null`, which is what SessionGuard
    // reads to decide whether to bounce someone to /sign-in. Re-run them.
    setOnSessionRefreshed(() => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.session });
      void queryClient.invalidateQueries({ queryKey: queryKeys.vault.all });
    });
    return () => setOnSessionRefreshed(null);
  }, [queryClient]);

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
