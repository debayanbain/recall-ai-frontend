import type { Metadata } from "next";
import { AppShell } from "@/components/app-shell";
import { memories } from "@/lib/mock-data";
import { MemoryDetail } from "./memory-detail";

type Params = { id: string };

export function generateStaticParams(): Params[] {
  return memories.map((m) => ({ id: m.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { id } = await params;
  const memory = memories.find((m) => m.id === id);
  return {
    title: `${memory?.title ?? "Memory"} · RecallAI`,
    description: memory?.summary,
  };
}

export default async function MemoryPage({ params }: { params: Promise<Params> }) {
  const { id } = await params;
  // Resolved on the client so memories captured in this browser also open.
  return (
    <AppShell>
      <MemoryDetail id={id} />
    </AppShell>
  );
}
