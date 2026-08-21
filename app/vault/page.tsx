import type { Metadata } from "next";
import { AppShell } from "@/components/app-shell";
import { MemoryGrid } from "@/components/memory-grid";

export const metadata: Metadata = { title: "All memories · RecallAI" };

export default function Vault() {
  return (
    <AppShell
      title="Your memory vault"
      subtitle="Every link, idea, voice note and file in one searchable, connected library."
    >
      <MemoryGrid showViewToggle duplicateForDensity />
    </AppShell>
  );
}
