"use client";

import { useState } from "react";
import { AlertCircle, CheckCircle2, Link2, Loader2, Unlink } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { InstagramMark } from "@/components/brand-icons";
import {
  instagramConnectUrl,
  useDisconnectInstagram,
  useInstagramConnections,
} from "@/hooks/use-integrations";
import type { InstagramAccount } from "@/lib/types";

/** Neutralises the base-sera Button defaults (rounded-none, uppercase, tracking). */
const plain = "rounded-xl tracking-normal normal-case";

function daysUntil(iso: string | null): number | null {
  if (!iso) return null;
  const ms = new Date(iso).getTime() - Date.now();
  return Number.isNaN(ms) ? null : Math.floor(ms / 86_400_000);
}

/** Row for one connected account, with disconnect behind a confirmation. */
function AccountRow({ account }: { account: InstagramAccount }) {
  const [confirming, setConfirming] = useState(false);
  const disconnect = useDisconnectInstagram();
  const handle = account.username ? `@${account.username}` : account.name || "Instagram account";
  const expiresIn = daysUntil(account.token_expires_at);

  return (
    <li className="flex items-center gap-3 rounded-xl border border-border bg-card p-3">
      {/* Decorative: the handle beside it is the accessible name. */}
      {account.profile_picture_url ? (
        // eslint-disable-next-line @next/next/no-img-element -- external CDN, unknown host
        <img
          src={account.profile_picture_url}
          alt=""
          width={40}
          height={40}
          className="size-10 shrink-0 rounded-full object-cover"
        />
      ) : (
        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-secondary">
          <InstagramMark className="size-5" />
        </span>
      )}

      <span className="grid min-w-0 flex-1 leading-tight">
        <span className="truncate text-[13.5px] font-semibold">{handle}</span>
        <span className="truncate text-[12px] text-muted-foreground">
          {account.page_name ? `via ${account.page_name}` : "Connected"}
          {expiresIn !== null && expiresIn <= 7
            ? ` · reconnect within ${Math.max(expiresIn, 0)} day${expiresIn === 1 ? "" : "s"}`
            : ""}
        </span>
      </span>

      <Button
        variant="ghost"
        onClick={() => setConfirming(true)}
        disabled={disconnect.isPending}
        aria-label={`Disconnect ${handle}`}
        className={`${plain} h-11 shrink-0 px-3 text-[13px] font-semibold text-destructive hover:bg-destructive/10`}
      >
        {disconnect.isPending ? (
          <Loader2 className="size-4 animate-spin" aria-hidden />
        ) : (
          <Unlink className="size-4" aria-hidden />
        )}
        <span className="hidden sm:inline">Disconnect</span>
      </Button>

      {/* Removing a grant is destructive and not obviously reversible (reconnecting
          needs another Facebook round trip), so it asks first. */}
      <Dialog open={confirming} onOpenChange={setConfirming}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle>Disconnect {handle}?</DialogTitle>
            <DialogDescription>
              RecallAI will stop reading new posts from this account. Anything already
              saved to your vault stays. You can reconnect any time.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose
              render={
                <Button variant="ghost" className={`${plain} h-11 px-4 text-[13px] font-semibold`}>
                  Keep connected
                </Button>
              }
            />
            <Button
              variant="destructive"
              className={`${plain} h-11 px-4 text-[13px] font-semibold`}
              onClick={() =>
                disconnect.mutate(account.id, { onSettled: () => setConfirming(false) })
              }
            >
              Disconnect
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </li>
  );
}

export function InstagramConnection({ statusMessage }: { statusMessage?: string | null }) {
  const { data, isPending, isError, refetch } = useInstagramConnections();
  const [starting, setStarting] = useState(false);
  const accounts = data?.accounts ?? [];
  const connected = accounts.length > 0;

  return (
    <section
      aria-labelledby="instagram-heading"
      className="rounded-2xl border border-border bg-card p-5"
    >
      <div className="flex items-start gap-3.5">
        <span className="grid size-11 shrink-0 place-items-center rounded-xl border border-border/70 bg-background">
          <InstagramMark className="size-6" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 id="instagram-heading" className="text-[15px] font-semibold">
            Instagram
          </h2>
          <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">
            Save posts and reels from your own account straight into your vault. Connects
            through Facebook — your Instagram must be a Business or Creator account linked
            to a Facebook Page.
          </p>
        </div>
        {connected ? (
          // Never colour alone: the check icon carries the same meaning as the green.
          <span className="hidden shrink-0 items-center gap-1.5 rounded-full bg-primary-soft px-2.5 py-1 text-[12px] font-semibold text-primary sm:inline-flex">
            <CheckCircle2 className="size-3.5" aria-hidden />
            Connected
          </span>
        ) : null}
      </div>

      {/* Callback outcome. aria-live so it is announced on arrival without stealing focus. */}
      {statusMessage ? (
        <p
          role="status"
          aria-live="polite"
          className="mt-4 rounded-xl border border-destructive/30 bg-destructive/5 px-3.5 py-3 text-[13px] leading-relaxed text-destructive"
        >
          <AlertCircle className="mr-1.5 inline size-4 -translate-y-px" aria-hidden />
          {statusMessage}
        </p>
      ) : null}

      <div className="mt-4">
        {isPending ? (
          <Skeleton className="h-11 w-full rounded-xl" />
        ) : isError ? (
          <div role="alert" className="text-[13px] leading-relaxed text-destructive">
            <p>We couldn&rsquo;t load your connections.</p>
            <Button
              variant="ghost"
              onClick={() => refetch()}
              className={`${plain} mt-1.5 h-10 px-2.5 text-[13px] font-semibold text-destructive hover:bg-destructive/10`}
            >
              Try again
            </Button>
          </div>
        ) : !data?.available ? (
          <p className="text-[13px] leading-relaxed text-muted-foreground">
            Instagram isn&rsquo;t configured on this server yet.
          </p>
        ) : (
          <>
            {connected ? (
              <ul className="grid gap-2">
                {accounts.map((account) => (
                  <AccountRow key={account.id} account={account} />
                ))}
              </ul>
            ) : null}

            <Button
              variant={connected ? "outline" : "default"}
              disabled={starting}
              onClick={() => {
                setStarting(true);
                window.location.assign(instagramConnectUrl());
              }}
              className={
                connected
                  ? `${plain} mt-3 h-11 w-full gap-2 border-border text-[13.5px] font-semibold sm:w-auto sm:px-4`
                  : `${plain} h-11 w-full gap-2 gradient-primary text-[13.5px] font-semibold text-white hover:bg-transparent sm:w-auto sm:px-5`
              }
            >
              {starting ? (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              ) : (
                <Link2 className="size-4" aria-hidden />
              )}
              {connected ? "Connect another account" : "Connect Instagram"}
            </Button>
          </>
        )}
      </div>
    </section>
  );
}
