"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useSession } from "@/hooks/use-auth";
import { isProtectedPath } from "@/lib/protected-routes";

/**
 * Client-side fallback for the route gate in `proxy.ts`.
 *
 * The proxy can only check for the session cookie when the API shares a host with the
 * app. Behind a tunnel the cookie belongs to the API's host and is invisible to the Next
 * server, so the proxy stands down and this takes over: it asks the API who the user is
 * (the browser *can* send the cookie there) and redirects if the answer is nobody.
 *
 * Like the proxy gate, this is a redirect convenience and not authorization -- every real
 * check lives in FastAPI, which verifies the cookie's signature and scopes rows by user.
 */
export function SessionGuard() {
  const pathname = usePathname();
  const router = useRouter();
  const { isLoading, isSignedIn } = useSession();

  useEffect(() => {
    // Wait for the answer: redirecting while the session is still resolving would throw
    // signed-in users off their own pages on every hard refresh.
    if (isLoading || isSignedIn || !isProtectedPath(pathname)) return;
    router.replace(`/sign-in?next=${encodeURIComponent(pathname)}`);
  }, [isLoading, isSignedIn, pathname, router]);

  return null;
}
