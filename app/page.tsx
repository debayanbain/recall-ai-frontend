import type { Metadata } from "next";
import { Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { AppShell } from "@/components/app-shell";
import { CaptureBar } from "@/components/capture-bar";
import { MemoryFeed } from "@/components/memory-feed";
import { AnimateSvg } from "@/components/ui/animate-svg";

export const metadata: Metadata = {
  title: "RecallAI — your second brain",
  description:
    "Capture anything you don't want to forget. Links, notes, voice, PDFs — RecallAI organizes, connects and recalls.",
  openGraph: {
    title: "RecallAI — your second brain",
    description:
      "An AI-powered personal memory system for everything you don't want to forget.",
  },
};

export default function Home() {
  return (
    <AppShell>
      <section className="relative overflow-hidden rounded-[24px] border border-border/70 bg-linear-to-b from-primary-soft to-white p-5 sm:rounded-[28px] sm:p-8 md:p-10">
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-primary/15 blur-3xl" />
        <div className="pointer-events-none absolute -left-16 bottom-0 h-56 w-56 rounded-full bg-fuchsia-200/40 blur-3xl" />
        <div className="relative">
          <Badge className="gap-1.5 rounded-full border border-primary/20 bg-white/70 px-3 py-1 text-[11.5px] font-medium tracking-normal text-primary normal-case backdrop-blur">
            <Sparkles className="h-3 w-3 shrink-0" /> Capture in under 3 seconds
          </Badge>
          <h1 className="mt-4 max-w-4xl font-display text-[34px] leading-[1.05] tracking-tight sm:mt-5 sm:text-[44px] md:text-[60px]">
            What do you want to{" "}
            <span className="relative inline-block">
              <span className="text-gradient italic">remember</span>
              {/* Hand-drawn underline that draws itself in, and redraws on hover. */}
              <AnimateSvg
                className="absolute -bottom-1 left-0 h-2.5 w-full sm:-bottom-1.5 sm:h-3"
                viewBox="0 0 279 37"
                path="M276.107 10.7667C258.31 28.3296 234.687 49.9446 218.918 18.406C204.994 -9.44212 183.022 5.05179 163.639 21.9074C157.838 26.9518 147.594 35.084 139.023 33.2603C131.032 31.5602 124.159 19.4215 117.166 15.0108C102.691 5.88068 78.6731 19.6982 64.5392 24.1355C43.8618 30.6273 24.6478 36.5711 3 33.6847"
                strokeColor="oklch(0.62 0.2 290)"
                strokeWidth={3}
                strokeLinecap="round"
                animationDuration={1.8}
                animationDelay={0.35}
                loop
                loopDelay={2.2}
                enableHoverAnimation
                hoverAnimationType="redraw"
                hoverStrokeColor="oklch(0.7 0.17 270)"
              />
            </span>
            ?
          </h1>
          <p className="mt-3 max-w-xl text-[14px] leading-relaxed text-muted-foreground sm:text-[15px]">
            Paste a link, jot an idea, drop a file or hold to speak. RecallAI summarizes, tags and
            connects it to everything you already know.
          </p>
          <CaptureBar />
        </div>
      </section>

      <div className="mt-8 sm:mt-10">
        <MemoryFeed heading="Recent memories" limit={12} />
      </div>
    </AppShell>
  );
}
