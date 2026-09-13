import type { Metadata } from "next";
import { AppShell } from "@/components/app-shell";
import { ConnectionView } from "./connection-view";

export const metadata: Metadata = { title: "Connections · RecallAI" };

/**
 * `/connections?memory=<id>`.
 *
 * A search parameter rather than a route segment, because this is a top-level destination
 * in the sidebar (`lib/nav.ts`) and a nav item whose path requires a UUID has no valid
 * `href`. With no parameter the view offers a picker; it never invents a focus.
 */
export default async function Connections({
  searchParams,
}: {
  searchParams: Promise<{ memory?: string }>;
}) {
  const { memory } = await searchParams;

  return (
    <AppShell
      title="Connections"
      subtitle="How one memory relates to the rest of your vault."
    >
      <ConnectionView memoryId={memory} />
    </AppShell>
  );
}
