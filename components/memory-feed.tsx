"use client";

import { useMemo } from "react";
import Link from "next/link";
import { LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { MemoryGrid } from "@/components/memory-grid";
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
        <Card className="mt-5 gap-0 rounded-3xl border border-dashed border-border bg-secondary/30 py-0 shadow-none ring-0">
          <CardContent className="px-6 py-14 text-center">
            <div className="mx-auto grid size-12 place-items-center rounded-2xl bg-primary-soft text-primary">
              <LogIn className="size-5" aria-hidden />
            </div>
            <h3 className="mt-4 font-display text-[22px] tracking-tight">
              Your memories live here
            </h3>
            <p className="mx-auto mt-1.5 max-w-sm text-[13px] leading-relaxed text-muted-foreground">
              Sign in and anything you paste is summarized, tagged and connected
              automatically.
            </p>
            <Button
              nativeButton={false}
              render={<Link href="/sign-in" />}
              className="mt-5 h-11 gap-2 rounded-xl gradient-primary px-4 text-[13.5px] font-semibold tracking-normal text-white normal-case hover:bg-transparent"
            >
              Sign in to start
            </Button>
          </CardContent>
        </Card>
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
