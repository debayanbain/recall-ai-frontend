import Link from "next/link";
import type { ReactNode } from "react";
import { Search, Sparkles, Waypoints } from "lucide-react";
import { AnimateSvg } from "@/components/ui/animate-svg";
import { AuthSheet } from "@/components/auth-sheet";

const points = [
  {
    icon: Sparkles,
    title: "Capture in under 3 seconds",
    body: "Paste a link, jot an idea, drop a file or hold to speak.",
  },
  {
    icon: Waypoints,
    title: "Connections you never made",
    body: "Every memory is linked back to what you already know.",
  },
  {
    icon: Search,
    title: "Ask, don't dig",
    body: "Search in plain language across every note, page and file.",
  },
];

/** Logo lockup — mirrors the one in the app header so the jump back feels continuous. */
function Wordmark() {
  return (
    <Link
      href="/"
      aria-label="RecallAI home"
      className="relative inline-flex w-fit items-center gap-2.5 rounded-xl focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"
    >
      <span className="grid size-9 place-items-center rounded-xl gradient-primary text-white shadow-[0_8px_24px_-8px_oklch(0.55_0.19_285/0.5)]">
        <Sparkles className="size-4.5" strokeWidth={2.4} />
      </span>
      <span className="text-[15px] font-semibold tracking-tight">
        Recall<span className="text-gradient">AI</span>
      </span>
    </Link>
  );
}

/**
 * Brand story beside the auth form on desktop; on a phone the same story fills the
 * screen and the form rises over it as a bottom sheet — so nothing that exists on
 * the wide layout is dropped on the narrow one.
 */
export function AuthShell({ children }: { children: ReactNode }) {
  return (
    // Phone: a fixed frame — only the story or the sheet scrolls, never the page.
    <div className="relative h-dvh overflow-hidden lg:grid lg:h-auto lg:min-h-dvh lg:grid-cols-2 lg:overflow-visible">
      <section className="relative flex h-full flex-col overflow-y-auto overscroll-contain bg-linear-to-b from-primary-soft to-background px-5 pt-[calc(env(safe-area-inset-top)+1.75rem)] pb-[50dvh] lg:h-auto lg:overflow-visible lg:p-10 lg:pb-10 xl:p-14">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-24 -right-24 size-72 rounded-full bg-primary/15 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute bottom-0 -left-16 size-56 rounded-full bg-primary-glow/20 blur-3xl"
        />

        <div className="relative">
          <Wordmark />
        </div>

        <div className="relative my-auto max-w-md py-8 lg:py-10">
          {/* Styled as display type rather than an <h1>: the auth card owns the page heading. */}
          <p className="font-display text-[32px] leading-[1.05] tracking-tight sm:text-[38px] lg:text-[42px] xl:text-[50px]">
            Everything you don&rsquo;t want to{" "}
            <span className="relative inline-block">
              <span className="text-gradient italic">forget</span>
              {/* Same hand-drawn underline as the home hero. */}
              <AnimateSvg
                // Sits clear of the descender in "forget"
                className="absolute -bottom-2.5 left-0 h-2.5 w-full sm:-bottom-3 sm:h-3"
                viewBox="0 0 279 37"
                path="M276.107 10.7667C258.31 28.3296 234.687 49.9446 218.918 18.406C204.994 -9.44212 183.022 5.05179 163.639 21.9074C157.838 26.9518 147.594 35.084 139.023 33.2603C131.032 31.5602 124.159 19.4215 117.166 15.0108C102.691 5.88068 78.6731 19.6982 64.5392 24.1355C43.8618 30.6273 24.6478 36.5711 3 33.6847"
                strokeColor="oklch(0.62 0.2 290)"
                strokeWidth={3}
                strokeLinecap="round"
                animationDuration={1.8}
                animationDelay={0.5}
                loop
                loopDelay={2.2}
              />
            </span>
            .
          </p>

          <ul className="mt-8 grid gap-4 lg:mt-10 lg:gap-6">
            {points.map((point) => (
              <li key={point.title} className="flex gap-3.5">
                <span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-xl border border-border/70 bg-card text-primary">
                  <point.icon className="size-4.5" />
                </span>
                <span className="grid gap-1">
                  <span className="text-[13.5px] font-semibold">{point.title}</span>
                  <span className="text-[13px] leading-relaxed text-muted-foreground">
                    {point.body}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative hidden text-[12px] text-muted-foreground lg:block">
          Your second brain — private by default.
        </p>
      </section>

      <AuthSheet
        footer={
          <p className="mt-8 text-[12px] text-muted-foreground lg:hidden">
            Your second brain — private by default.
          </p>
        }
      >
        {children}
      </AuthSheet>
    </div>
  );
}
