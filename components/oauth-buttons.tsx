"use client";

import { useState } from "react";
import type { ComponentType } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { FacebookMark, GoogleMark, InstagramMark } from "@/components/brand-icons";
import { useAuthProviders } from "@/hooks/use-auth";
import { oauthLoginUrl } from "@/lib/api";

// Keyed by the provider ids /auth/providers can return. The backend decides which of
// these actually appear -- a provider missing its credentials is never offered. X/Twitter
// is parked backend-side (docs/parked/twitter_oauth.py); re-add `twitter: XMark` with it.
const MARKS: Record<string, ComponentType<{ className?: string }>> = {
  google: GoogleMark,
  facebook: FacebookMark,
  instagram: InstagramMark,
};

export function OAuthButtons({ next = "/vault" }: { next?: string }) {
  const { data, isPending, isError, refetch } = useAuthProviders();
  // Which button was clicked. A full-page redirect follows, so this state exists to
  // stop double-submits during the ~1s before the browser navigates away.
  const [pending, setPending] = useState<string | null>(null);

  if (isPending) {
    return (
      <div className="grid gap-2.5" aria-busy="true" aria-label="Loading sign-in options">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-12 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  if (isError || !data?.providers.length) {
    return (
      <div
        role="alert"
        className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-[13px] leading-relaxed text-destructive"
      >
        <p className="font-semibold">Sign-in is unavailable right now.</p>
        <p className="mt-1 text-destructive/85">
          We couldn&rsquo;t load the available providers.
        </p>
        <Button
          variant="ghost"
          onClick={() => refetch()}
          className="mt-2 h-9 rounded-lg px-2.5 text-[13px] font-semibold normal-case tracking-normal text-destructive hover:bg-destructive/10"
        >
          Try again
        </Button>
      </div>
    );
  }

  return (
    <div className="grid gap-2.5">
      {data.providers.map((provider) => {
        const Mark = MARKS[provider.id];
        const isBusy = pending === provider.id;
        return (
          <Button
            key={provider.id}
            variant="outline"
            // h-12 keeps the target well past the 44px minimum on touch.
            className="h-12 w-full justify-center gap-3 rounded-xl border-border bg-card text-[14px] font-semibold normal-case tracking-normal text-foreground hover:bg-secondary disabled:opacity-60"
            disabled={pending !== null}
            aria-label={`Continue with ${provider.label}`}
            onClick={() => {
              setPending(provider.id);
              // Full-page navigation, not fetch: the provider answers with a redirect
              // and needs to own the address bar for its consent screen.
              window.location.assign(oauthLoginUrl(provider.id, next));
            }}
          >
            {isBusy ? (
              <Loader2 className="size-5 animate-spin" aria-hidden />
            ) : Mark ? (
              <Mark className="size-5" />
            ) : null}
            <span>Continue with {provider.label}</span>
          </Button>
        );
      })}
    </div>
  );
}
