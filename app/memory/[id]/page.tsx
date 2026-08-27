import type { Metadata } from "next";
import { AppShell } from "@/components/app-shell";
import { MemoryDetail } from "./memory-detail";

type Params = { id: string };

/**
 * Deliberately static.
 *
 * A memory's title is private to one account, and this runs on the server without that
 * user's session -- so the only honest title is a generic one. It used to be looked up in
 * the seeded demo library, which is why opening a real memory showed "Memory · RecallAI"
 * in the tab and, for a demo id, someone else's title entirely.
 *
 * `generateStaticParams` is gone for the same reason: pre-rendering the demo ids created
 * real routes that served fake memories.
 */
export const metadata: Metadata = {
  title: "Memory · RecallAI",
  description: "A memory in your RecallAI vault.",
};

export default async function MemoryPage({ params }: { params: Promise<Params> }) {
  const { id } = await params;
  // Fetched on the client, where the session cookie is reachable and the row is scoped
  // to the signed-in user by the API.
  return (
    <AppShell>
      <MemoryDetail id={id} />
    </AppShell>
  );
}
