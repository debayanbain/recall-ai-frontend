import type { Metadata } from "next";
import { AppShell } from "@/components/app-shell";
import { AnimateSvg } from "@/components/ui/animate-svg";
import { TimelineView } from "./timeline-view";

export const metadata: Metadata = { title: "Timeline · RecallAI" };

export default function Timeline() {
  return (
    <AppShell
      title={
        <span className="relative inline-block">
          Timeline
          {/* Same hand-drawn underline as the home hero and auth panel. */}
          <AnimateSvg
            className="absolute -bottom-1.5 left-0 h-2.5 w-full sm:-bottom-2 sm:h-3"
            viewBox="0 0 279 37"
            path="M276.107 10.7667C258.31 28.3296 234.687 49.9446 218.918 18.406C204.994 -9.44212 183.022 5.05179 163.639 21.9074C157.838 26.9518 147.594 35.084 139.023 33.2603C131.032 31.5602 124.159 19.4215 117.166 15.0108C102.691 5.88068 78.6731 19.6982 64.5392 24.1355C43.8618 30.6273 24.6478 36.5711 3 33.6847"
            strokeColor="oklch(0.62 0.2 290)"
            strokeWidth={3}
            strokeLinecap="round"
            animationDuration={1.8}
            animationDelay={0.35}
            loop
            loopDelay={2.2}
          />
        </span>
      }
      subtitle="How your thinking evolved. Scroll through your memories the way you'd flip through a journal."
    >
      <TimelineView />
    </AppShell>
  );
}
