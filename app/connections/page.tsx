import type { Metadata } from "next";
import { AppShell } from "@/components/app-shell";
import { memories } from "@/lib/mock-data";
import { ConnectionMap, RelationLegend } from "./connection-map";

export const metadata: Metadata = { title: "Connections · RecallAI" };

export default function Connections() {
  const center = memories.find((m) => m.id === "second-brain")!;

  return (
    <AppShell
      title="Connections"
      subtitle={
        <>
          How <span className="font-semibold text-primary">Building a Second Brain</span> relates to
          the rest of your memory.
        </>
      }
      actions={<RelationLegend />}
    >
      <ConnectionMap centerTitle={center.title.replace(/ with .*/, "")} />
    </AppShell>
  );
}
