"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { QRCodeSVG } from "qrcode.react";
import {
  AlertCircle,
  Check,
  CheckCircle2,
  Copy,
  ExternalLink,
  Loader2,
  MessageSquareText,
  RefreshCw,
  ScanLine,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { TelegramMark } from "@/components/brand-icons";
import { useCreateTelegramLink, useTelegramConnection } from "@/hooks/use-telegram";
import type { TelegramLinkResponse } from "@/lib/types";

/** Neutralises the base-sera Button defaults (rounded-none, uppercase, tracking). */
const plain = "rounded-xl tracking-normal normal-case";

const sendable = [
  ["Any link", "A reel, a video, an article. It gets fetched, summarised and tagged."],
  ["A forwarded post", "Forward it straight from another chat — the link inside is used."],
  ["A PDF or a photo", "Stored and downloadable. PDFs and text also get read and tagged."],
  ["A thought", "Start it with /note — that's what keeps it. Anything else you type is just chat."],
] as const;

const askable = [
  "What did I save this week?",
  "Any cooking videos?",
  "Show my SaaS ideas",
  "What did I save about FastAPI?",
] as const;

/** The wall clock, at one-second resolution, as an external store. */
function subscribeToClock(onChange: () => void): () => void {
  const id = setInterval(onChange, 1000);
  return () => clearInterval(id);
}

/** Floored to whole seconds so the snapshot is stable within a render pass. */
function clockSnapshot(): number {
  return Math.floor(Date.now() / 1000);
}

/** No clock on the server; the countdown falls back to the full TTL until hydration. */
function serverClockSnapshot(): number {
  return 0;
}

/**
 * Seconds until the link dies.
 *
 * The clock is an external mutable source, so it is read through
 * `useSyncExternalStore` rather than stored in state and nudged by an interval. That
 * keeps the remaining time *derived* from the absolute expiry the server sent: a
 * backgrounded tab comes back showing the truth instead of a counter that stopped
 * ticking, and a new link cannot leave a stale count behind.
 */
function useCountdown(link: TelegramLinkResponse | null): number {
  const now = useSyncExternalStore(subscribeToClock, clockSnapshot, serverClockSnapshot);
  if (!link) return 0;
  if (now === 0) return link.expires_in;
  return Math.max(0, Math.ceil(new Date(link.expires_at).getTime() / 1000 - now));
}

const COARSE_POINTER = "(pointer: coarse)";

function subscribeToPointer(onChange: () => void): () => void {
  const query = window.matchMedia(COARSE_POINTER);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

function pointerSnapshot(): boolean {
  return window.matchMedia(COARSE_POINTER).matches;
}

function serverPointerSnapshot(): boolean {
  return false;
}

/**
 * Whether this is the device the user is holding.
 *
 * A QR code is a way to move a credential from a screen you are looking at to a phone
 * you are holding; on the phone itself it is nonsense, because nothing can scan its own
 * display. Detected by pointer type rather than user-agent — a touchscreen laptop
 * getting the button instead of the code is harmless, a sniffed UA getting it wrong is
 * a dead end.
 */
function useIsTouchDevice(): boolean {
  return useSyncExternalStore(subscribeToPointer, pointerSnapshot, serverPointerSnapshot);
}

function mmss(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function Step({
  index,
  title,
  children,
}: {
  index: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <li className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-start gap-3.5">
        <span
          aria-hidden
          className="grid size-8 shrink-0 place-items-center rounded-full bg-primary-soft text-[13px] font-semibold text-primary"
        >
          {index}
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="text-[14.5px] font-semibold">{title}</h3>
          <div className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
            {children}
          </div>
        </div>
      </div>
    </li>
  );
}

/**
 * The deep link as a QR code.
 *
 * Rendered locally as inline SVG, never through a QR image service: the value encoded
 * here is a single-use bearer credential for this account, and handing it to a third
 * party to draw would be the same leak as pasting it into someone else's URL bar.
 *
 * White-on-black regardless of theme, with a quiet zone — a dark-mode QR with no margin
 * is the classic reason a camera refuses to lock on.
 */
function LinkQr({ value }: { value: string }) {
  return (
    <div className="rounded-2xl bg-white p-3 shadow-sm ring-1 ring-black/10">
      <QRCodeSVG
        value={value}
        size={168}
        level="M"
        marginSize={2}
        bgColor="#ffffff"
        fgColor="#000000"
        role="img"
        aria-label="QR code that opens the RecallAI bot in Telegram"
      />
    </div>
  );
}

function WhatYouCanSend() {
  return (
    <section
      aria-labelledby="telegram-send-heading"
      className="rounded-2xl border border-border bg-card p-5"
    >
      <h2
        id="telegram-send-heading"
        className="flex items-center gap-2 text-[14.5px] font-semibold"
      >
        <MessageSquareText className="size-4 text-primary" aria-hidden />
        What you can send
      </h2>
      <dl className="mt-3 grid gap-2.5">
        {sendable.map(([term, detail]) => (
          <div key={term} className="grid gap-0.5">
            <dt className="text-[13px] font-semibold">{term}</dt>
            <dd className="text-[12.5px] leading-relaxed text-muted-foreground">{detail}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-3 text-[12.5px] leading-relaxed text-muted-foreground">
        Voice notes aren&rsquo;t supported yet — the bot will tell you rather than
        silently dropping one.
      </p>
    </section>
  );
}

function WhatYouCanAsk() {
  return (
    <section
      aria-labelledby="telegram-ask-heading"
      className="rounded-2xl border border-border bg-card p-5"
    >
      <h2
        id="telegram-ask-heading"
        className="flex items-center gap-2 text-[14.5px] font-semibold"
      >
        <Search className="size-4 text-primary" aria-hidden />
        What you can ask
      </h2>
      <ul className="mt-3 grid gap-2">
        {askable.map((question) => (
          <li
            key={question}
            className="rounded-xl border border-border/70 bg-background px-3 py-2 text-[13px]"
          >
            &ldquo;{question}&rdquo;
          </li>
        ))}
      </ul>
      <p className="mt-3 text-[12.5px] leading-relaxed text-muted-foreground">
        Answers come only from what you&rsquo;ve saved. Shortcuts:{" "}
        <code className="rounded bg-secondary px-1 py-0.5 text-[12px]">/recent</code>,{" "}
        <code className="rounded bg-secondary px-1 py-0.5 text-[12px]">/help</code>,{" "}
        <code className="rounded bg-secondary px-1 py-0.5 text-[12px]">/disconnect</code>.
      </p>
    </section>
  );
}

export function TelegramSetupGuide() {
  const { data, isPending, isError, refetch } = useTelegramConnection({
    pollWhileUnlinked: true,
  });
  const createLink = useCreateTelegramLink();
  const [issuedLink, setIssuedLink] = useState<TelegramLinkResponse | null>(null);
  const [copied, setCopied] = useState(false);
  const connectedHeading = useRef<HTMLHeadingElement>(null);
  const inFlight = useRef(false);
  const onPhone = useIsTouchDevice();

  const account = data?.account ?? null;
  // A spent link is a dead button, and so is an expired one. Both are derived rather
  // than cleared in an effect: there is no moment where the account exists and the link
  // is still live, and no render where the countdown has run out but the code on screen
  // is still real.
  const heldLink = account ? null : issuedLink;
  const secondsLeft = useCountdown(heldLink);
  const expired = heldLink !== null && secondsLeft === 0;
  const link = expired ? null : heldLink;
  const botHandle = data?.bot_username ? `@${data.bot_username}` : "the RecallAI bot";

  const { mutateAsync: mintLink } = createLink;

  // Mint on arrival rather than on a click. The first thing a first-time user sees has
  // to be the thing they act on -- a button that produces the QR is a step that exists
  // only because the implementation has one. Safe to do unprompted: the server keeps at
  // most one live token per user (`invalidate_unused_for_user`), so a reload replaces
  // the credential rather than accumulating them.
  // `link` rather than `issuedLink`, so an expired code re-arms this on the tick it dies:
  // the QR refreshes itself instead of asking the user to understand that it went stale.
  const needsLink =
    Boolean(data?.available) &&
    !account &&
    link === null &&
    !createLink.isPending &&
    !createLink.isError;

  // Guarded by a ref rather than by a cleanup flag. `needsLink` goes false the moment
  // the request is in flight, so a cleanup that cancelled the pending response would
  // discard every result and re-arm itself -- a spinner that never resolves, on top of
  // a mint loop where each token invalidates the one before it. The ref survives the
  // re-render (and StrictMode's double-invoke) without making the response conditional.
  useEffect(() => {
    if (!needsLink || inFlight.current) return;
    inFlight.current = true;
    void mintLink()
      .then(setIssuedLink)
      .catch(() => {
        // The mutation carries the error state; the retry is the user's to make.
      })
      .finally(() => {
        inFlight.current = false;
      });
  }, [needsLink, mintLink]);

  // The confirmation happens on the phone, so nothing on this page changes unless we
  // move focus deliberately. Without this a screen-reader user is left in a step list
  // that has quietly stopped being the point.
  useEffect(() => {
    if (account) connectedHeading.current?.focus();
  }, [account]);

  async function copyLink() {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link.deep_link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Clipboard is permission-gated and blocked outright in some browsers; the link is
      // reachable through the button either way, so this is not worth an error state.
      setCopied(false);
    }
  }

  /** Drop the current code and let the effect mint another. */
  function refresh() {
    createLink.reset();
    setIssuedLink(null);
  }

  if (isPending) {
    return (
      <div className="grid max-w-2xl gap-4">
        <Skeleton className="h-28 w-full rounded-2xl" />
        <Skeleton className="h-28 w-full rounded-2xl" />
        <Skeleton className="h-28 w-full rounded-2xl" />
      </div>
    );
  }

  if (isError) {
    return (
      <div
        role="alert"
        className="max-w-2xl rounded-2xl border border-destructive/30 bg-destructive/5 p-5 text-[13px] leading-relaxed text-destructive"
      >
        <p>
          <AlertCircle className="mr-1.5 inline size-4 -translate-y-px" aria-hidden />
          We couldn&rsquo;t check your Telegram connection.
        </p>
        <Button
          variant="ghost"
          onClick={() => refetch()}
          className={`${plain} mt-2 h-11 px-3 text-[13px] font-semibold text-destructive hover:bg-destructive/10`}
        >
          Try again
        </Button>
      </div>
    );
  }

  const openButton = link ? (
    <Button
      nativeButton={false}
      render={<a href={link.deep_link} target="_blank" rel="noopener noreferrer" />}
      className={`${plain} h-11 gap-2 gradient-primary text-[13.5px] font-semibold text-white hover:bg-transparent sm:px-5`}
    >
      Open {botHandle}
      <ExternalLink className="size-4" aria-hidden />
    </Button>
  ) : null;

  return (
    <div className="grid max-w-2xl gap-4 pb-10">
      {/* The connect panel is the only part that depends on a configured bot. What the
          bot is *for* is shown either way -- a lone grey card explaining nothing is how
          a first-time visitor decides the feature does not exist. */}
      {!data?.available ? (
        <section className="rounded-2xl border border-border bg-card p-5">
          <h2 className="text-[15px] font-semibold">Telegram isn&rsquo;t available yet</h2>
          <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">
            No bot is configured for this deployment, so there is nothing to connect to
            right now. Here is what it does once it is switched on.
          </p>
        </section>
      ) : account ? (
        <section className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-start gap-3.5">
            <span className="grid size-11 shrink-0 place-items-center rounded-xl border border-border/70 bg-background">
              <TelegramMark className="size-6" />
            </span>
            <div className="min-w-0 flex-1">
              <h2
                ref={connectedHeading}
                tabIndex={-1}
                className="flex items-center gap-2 text-[15px] font-semibold outline-none"
              >
                <CheckCircle2 className="size-4 text-primary" aria-hidden />
                Connected as{" "}
                {account.username ? `@${account.username}` : account.first_name || "you"}
              </h2>
              <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">
                Open {botHandle} in Telegram and send it anything. It replies with the
                category and tags once it has read it.
              </p>
            </div>
          </div>
        </section>
      ) : (
        <>
          <ol className="grid gap-3">
            <Step
              index={1}
              title={onPhone ? "Open the bot in Telegram" : "Scan this with your phone"}
            >
              {createLink.isError ? (
                <div className="grid gap-2">
                  <p role="alert" className="text-[12.5px] text-destructive">
                    Couldn&rsquo;t prepare your connection code. Check you&rsquo;re still
                    signed in, then try again.
                  </p>
                  <Button
                    onClick={refresh}
                    className={`${plain} h-11 w-full gap-2 gradient-primary text-[13.5px] font-semibold text-white hover:bg-transparent sm:w-auto sm:px-5`}
                  >
                    <RefreshCw className="size-4" aria-hidden />
                    Try again
                  </Button>
                </div>
              ) : !link ? (
                <div className="flex items-center gap-2 text-[13px] text-muted-foreground">
                  <Loader2 className="size-4 motion-safe:animate-spin" aria-hidden />
                  Preparing your connection…
                </div>
              ) : onPhone ? (
                <div className="grid gap-3">
                  <p>
                    Tap below. Telegram opens on {botHandle} — this link is yours alone
                    and works once.
                  </p>
                  {openButton}
                </div>
              ) : (
                <div className="grid gap-3">
                  <p>
                    Open the camera on your phone and point it at this code. Telegram
                    opens straight onto {botHandle}. Nothing to type.
                  </p>
                  <div className="flex flex-wrap items-center gap-4">
                    <LinkQr value={link.deep_link} />
                    <div className="grid gap-2 text-[12.5px] text-muted-foreground">
                      <p className="flex items-center gap-1.5 font-medium text-foreground">
                        <ScanLine className="size-4 text-primary" aria-hidden />
                        Point your camera here
                      </p>
                      <p>Telegram already on this computer?</p>
                      <div className="flex flex-wrap items-center gap-2">
                        {openButton}
                        <Button
                          variant="ghost"
                          onClick={copyLink}
                          className={`${plain} h-11 gap-2 px-3 text-[13px] font-semibold`}
                        >
                          {copied ? (
                            <Check className="size-4" aria-hidden />
                          ) : (
                            <Copy className="size-4" aria-hidden />
                          )}
                          {copied ? "Copied" : "Copy link"}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {link ? (
                <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1">
                  <p className="text-[12.5px] text-muted-foreground">
                    Refreshes automatically in{" "}
                    <span className="font-semibold tabular-nums text-foreground">
                      {mmss(secondsLeft)}
                    </span>
                    . Keep this page open.
                  </p>
                  {/* The automatic refresh covers expiry, which is the only thing the
                      page can observe. It cannot see a code scanned on the wrong phone,
                      a laptop that slept, or a scan that simply did not take -- so the
                      escape hatch is a button, not an explanation. */}
                  <Button
                    variant="ghost"
                    onClick={refresh}
                    className={`${plain} h-11 gap-1.5 px-2.5 text-[12.5px] font-semibold`}
                  >
                    <RefreshCw className="size-3.5" aria-hidden />
                    New code
                  </Button>
                </div>
              ) : null}
            </Step>

            <Step index={2} title="Tap Start in Telegram">
              <p>
                Telegram shows a <span className="font-semibold text-foreground">Start</span>{" "}
                button at the bottom of the chat. Tapping it is what connects the two
                accounts — the bot replies to confirm.
              </p>
            </Step>

            <Step index={3} title="Send your first link">
              <p>
                Paste a reel, a video or an article. You&rsquo;ll get an acknowledgement
                straight away, then the summary, category and tags once it has been read.
              </p>
            </Step>
          </ol>

          {/* Nothing on this page changes when the user taps Start on their phone, so the
              waiting state is announced rather than merely drawn. */}
          <p
            role="status"
            aria-live="polite"
            className="flex items-center gap-2 px-1 text-[13px] text-muted-foreground"
          >
            {link ? (
              <>
                <Loader2 className="size-4 motion-safe:animate-spin" aria-hidden />
                Waiting for you to tap Start…
              </>
            ) : (
              <>Not connected yet.</>
            )}
          </p>
        </>
      )}

      <WhatYouCanSend />
      <WhatYouCanAsk />
    </div>
  );
}
