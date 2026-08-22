import { QueryClient, isServer } from "@tanstack/react-query";
import { ApiError } from "@/lib/api";

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // With RSC, a value is already fresh when it reaches the client; a non-zero
        // staleTime stops an immediate second fetch on mount.
        staleTime: 30_000,
        gcTime: 5 * 60_000,
        refetchOnWindowFocus: false,
        retry(failureCount, error) {
          // 401/403/404 are answers, not outages -- retrying them just delays the
          // redirect to sign-in and hammers the API with requests that cannot succeed.
          if (error instanceof ApiError && error.status < 500) return false;
          return failureCount < 2;
        },
      },
      mutations: { retry: false },
    },
  });
}

let browserQueryClient: QueryClient | undefined;

export function getQueryClient() {
  // A fresh client per server request (never shared between users -- a cached
  // client on the server would leak one user's data into another's render);
  // a single long-lived client in the browser.
  if (isServer) return makeQueryClient();
  browserQueryClient ??= makeQueryClient();
  return browserQueryClient;
}
