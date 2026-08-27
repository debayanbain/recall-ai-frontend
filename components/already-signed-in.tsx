"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";
import { useSession } from "@/hooks/use-auth";

/**
 * Guards the auth pages for someone who is not actually signed out.
 *
 * Two jobs, both of which exist because the route gate in `proxy.ts` can only see
 * whether a cookie is *present*, never whether it verifies:
 *
 * 1. Redirect a signed-in visitor onward. `proxy.ts` used to do this and could not tell
 *    a live session from a stale cookie, so an expired access cookie pinned people in a
 *    loop between /vault and /sign-in.
 *
 * 2. Hold the form back until the answer is known. A page load whose access cookie has
 *    expired is bounced here before any JavaScript runs, and the silent refresh that
 *    restores the session takes a moment — during which the user is staring at "Welcome
 *    back" and three provider buttons. That reads as "I have been logged out" even
 *    though nothing was lost, and the fix for the bounce itself cannot remove the gap.
 *    A skeleton says "checking" instead of asserting something untrue.
 *
 * `next` is re-validated here even though the caller already validated it — this is the
 * component that performs the navigation, so it is the one that must not be talked into
 * an off-site one.
 */
export function AlreadySignedIn({ next, children }: { next: string; children: ReactNode }) {
  const router = useRouter();
  const { isSignedIn, isLoading } = useSession();

  useEffect(() => {
    if (!isSignedIn) return;
    const safe = next.startsWith("/") && !next.startsWith("//") ? next : "/vault";
    router.replace(safe);
  }, [isSignedIn, next, router]);

  if (isLoading) {
    return (
      <div className="grid gap-2.5" aria-busy="true" aria-label="Checking your session">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-12 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  // Signed in: the effect above is navigating. Rendering the form for that frame would
  // flash a sign-in prompt at someone who is already through the door.
  if (isSignedIn) {
    return (
      <div className="grid gap-2.5" aria-busy="true" aria-label="Signing you in">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-12 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  return <>{children}</>;
}
