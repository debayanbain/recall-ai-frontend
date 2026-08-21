import type { Metadata } from "next";
import { AppShell } from "@/components/app-shell";
import { TimelineView } from "./timeline-view";

export const metadata: Metadata = { title: "Timeline · RecallAI" };

export default function Timeline() {
  return (
    <AppShell
      title="Timeline"
      subtitle="How your thinking evolved. Scroll through your memories the way you'd flip through a journal."
    >
      <TimelineView />
    </AppShell>
  );
}
