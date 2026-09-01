"use client";

import { use, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Check, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AppShell } from "@/components/app-shell";
import { useAcceptSpaceInvite } from "@/hooks/use-spaces";

/**
 * Where an invite link lands.
 *
 * `/spaces/*` is a protected prefix, so an invited person who is signed out is sent to
 * sign-in first and returns here afterwards -- which is the right order: the server binds
 * the membership to whoever is authenticated when the token is spent, so it has to know
 * who that is.
 *
 * **The token is spent exactly once, on mount, and never on a retry.** A React effect in
 * development runs twice, and a second POST would burn a link that the first one already
 * consumed -- the user would watch a successful join turn into "this link is no longer
 * valid". The ref latch is what makes that impossible.
 */

const plain = "rounded-xl tracking-normal normal-case";

export function JoinSpaceView({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const router = useRouter();
  const accept = useAcceptSpaceInvite();
  const spent = useRef(false);

  useEffect(() => {
    if (spent.current) return;
    spent.current = true;
    accept.mutate(token, {
      // Straight into the Space. The joined-successfully screen is a stop nobody wants
      // between clicking a link and seeing what they were invited to.
      onSuccess: (space) => router.replace(`/spaces/${space.id}`),
    });
    // `accept` and `router` are stable for this mount and the latch guards re-entry;
    // listing them would re-run the effect on every mutation state change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  return (
    <AppShell>
      <div className="mx-auto max-w-md py-10">
        <Card className="card-soft gap-0 rounded-[calc(var(--radius)+4px)] py-0 shadow-none ring-0">
          <CardContent className="px-6 py-12 text-center">
            {accept.isError ? (
              <>
                <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-destructive/10 text-destructive">
                  <X className="h-5 w-5" />
                </div>
                <h1 className="mt-4 font-display text-[22px] tracking-tight">
                  That invite link no longer works
                </h1>
                {/* One message for every rejection, because the server gives one answer
                    for all of them: unknown, already used, expired, or a space that has
                    since been deleted. Saying which would tell whoever found the link in
                    a screenshot exactly what they are holding. */}
                <p className="mx-auto mt-1.5 max-w-sm text-[13px] leading-relaxed text-muted-foreground">
                  Invites can only be used once, and they expire. Ask whoever shared it to
                  send you a new one.
                </p>
                <Button
                  nativeButton={false}
                  variant="ghost"
                  render={<Link href="/spaces" />}
                  className={`${plain} mt-5 h-11 px-4 text-[13.5px] font-semibold text-primary hover:bg-primary-soft`}
                >
                  Go to my spaces
                </Button>
              </>
            ) : accept.isSuccess ? (
              <>
                <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-primary-soft text-primary">
                  <Check className="h-5 w-5" />
                </div>
                <h1 className="mt-4 font-display text-[22px] tracking-tight">You&rsquo;re in</h1>
                <p className="mt-1.5 text-[13px] text-muted-foreground">Opening the space…</p>
              </>
            ) : (
              <>
                <div
                  aria-busy="true"
                  className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-primary-soft text-primary"
                >
                  <Sparkles className="h-5 w-5" />
                </div>
                <h1 className="mt-4 font-display text-[22px] tracking-tight">Joining…</h1>
                <p className="mt-1.5 text-[13px] text-muted-foreground" aria-live="polite">
                  Checking your invite.
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
