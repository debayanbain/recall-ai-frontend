"use client";

import { useMemo } from "react";
import { MemoryGrid } from "@/components/memory-grid";
import { SignedOutInvite } from "@/components/signed-out-invite";
import { useSession } from "@/hooks/use-auth";
import { useVaultItems } from "@/hooks/use-vault";
import { toMemories } from "@/lib/vault-adapter";

/**
 * The user's real memories, wherever they are shown.
 *
 * One component for both the home feed and the vault so the two cannot drift — home
 * previously rendered the seed library, which made a freshly captured link appear in the
 * vault but not on the page you captured it from.
 *
 * Signed-out visitors get an invitation, not an error. The home page is public, so
 * `/vault` legitimately 401s for them; treating that as a failed request put a red
 * "we couldn't load your memories" panel in front of every first-time visitor.
 */
export function MemoryFeed({
  heading,
  limit = 60,
  showViewToggle = false,
}: {
  heading?: string;
  limit?: number;
  showViewToggle?: boolean;
}) {
  const { isSignedIn, isLoading: sessionLoading } = useSession();
  const { data, isPending, isError, refetch } = useVaultItems({ limit });
  const memories = useMemo(() => toMemories(data?.items ?? []), [data]);

  if (!sessionLoading && !isSignedIn) {
    return (
      <section>
        {heading && (
          <h2 className="font-display text-[22px] tracking-tight sm:text-[26px]">{heading}</h2>
        )}
        <SignedOutInvite />
      </section>
    );
  }

  return (
    <MemoryGrid
      heading={heading}
      showViewToggle={showViewToggle}
      items={memories}
      // A disabled query stays `pending` forever in TanStack, so the session's own
      // loading state is what decides whether to show skeletons.
      isLoading={sessionLoading || (isSignedIn && isPending)}
      isError={isError}
      onRetry={() => refetch()}
    />
  );
}
