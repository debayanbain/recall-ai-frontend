"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle2, Loader2, Unlink } from "lucide-react";
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
import { TelegramMark } from "@/components/brand-icons";
import { useDisconnectTelegram, useTelegramConnection } from "@/hooks/use-telegram";

/** Neutralises the base-sera Button defaults (rounded-none, uppercase, tracking). */
const plain = "rounded-xl tracking-normal normal-case";

/**
 * Status and disconnect for the Telegram bot.
 *
 * Connecting is not done here. It is a two-device handover — mint a link on the desktop,
 * finish it on the phone — and it needs the countdown, the copyable fallback and the
 * "waiting for you" state that only make sense with room to breathe. This card sends the
 * user to that page rather than shipping a second, worse copy of it.
 */
export function TelegramConnection() {
  const { data, isPending, isError, refetch } = useTelegramConnection();
  const [confirming, setConfirming] = useState(false);
  const disconnect = useDisconnectTelegram();

  const account = data?.account ?? null;
  const handle = account?.username
    ? `@${account.username}`
    : account?.first_name || "your Telegram account";

  return (
    <section
      aria-labelledby="telegram-heading"
      className="rounded-2xl border border-border bg-card p-5"
    >
      <div className="flex items-start gap-3.5">
        <span className="grid size-11 shrink-0 place-items-center rounded-xl border border-border/70 bg-background">
          <TelegramMark className="size-6" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 id="telegram-heading" className="text-[15px] font-semibold">
            Telegram
          </h2>
          <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">
            Send the bot a link, a file or a thought and it lands in your vault, tagged.
            Ask it what you saved and it answers from your own memories.
          </p>
        </div>
        {account ? (
          // Never colour alone: the check carries the same meaning as the green.
          <span className="hidden shrink-0 items-center gap-1.5 rounded-full bg-primary-soft px-2.5 py-1 text-[12px] font-semibold text-primary sm:inline-flex">
            <CheckCircle2 className="size-3.5" aria-hidden />
            Connected
          </span>
        ) : null}
      </div>

      <div className="mt-4">
        {isPending ? (
          <Skeleton className="h-11 w-full rounded-xl" />
        ) : isError ? (
          <div role="alert" className="text-[13px] leading-relaxed text-destructive">
            <p>We couldn&rsquo;t load your Telegram connection.</p>
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
            Telegram isn&rsquo;t configured on this server yet.
          </p>
        ) : account ? (
          <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card p-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-full bg-secondary">
              <TelegramMark className="size-5" />
            </span>
            <span className="grid min-w-0 flex-1 leading-tight">
              <span className="truncate text-[13.5px] font-semibold">{handle}</span>
              <span className="truncate text-[12px] text-muted-foreground">
                Connected {new Date(account.linked_at).toLocaleDateString()}
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
          </div>
        ) : (
          <Button
            nativeButton={false}
            render={<Link href="/capture" />}
            className={`${plain} h-11 w-full gap-2 gradient-primary text-[13.5px] font-semibold text-white hover:bg-transparent sm:w-auto sm:px-5`}
          >
            Set up Telegram
            <ArrowRight className="size-4" aria-hidden />
          </Button>
        )}
      </div>

      <Dialog open={confirming} onOpenChange={setConfirming}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle>Disconnect {handle}?</DialogTitle>
            <DialogDescription>
              The bot will stop saving anything you send it and will stop answering
              questions about your vault. Everything already saved stays. You can
              reconnect any time.
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
              onClick={() => disconnect.mutate(undefined, { onSettled: () => setConfirming(false) })}
            >
              Disconnect
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
