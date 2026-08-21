import type { Metadata } from "next";
import { Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { AppShell } from "@/components/app-shell";
import { CaptureBar } from "@/components/capture-bar";
import { MemoryGrid } from "@/components/memory-grid";

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
            What do you want to <span className="text-gradient italic">remember</span>?
          </h1>
          <p className="mt-3 max-w-xl text-[14px] leading-relaxed text-muted-foreground sm:text-[15px]">
            Paste a link, jot an idea, drop a file or hold to speak. RecallAI summarizes, tags and
            connects it to everything you already know.
          </p>
          <CaptureBar />
        </div>
      </section>

      <div className="mt-8 sm:mt-10">
        <MemoryGrid heading="Recent memories" />
      </div>
    </AppShell>
  );
}
