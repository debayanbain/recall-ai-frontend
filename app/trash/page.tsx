import type { Metadata } from "next";
import { AppShell } from "@/components/app-shell";
import { TrashView } from "./trash-view";

export const metadata: Metadata = { title: "Trash · RecallAI" };

/**
 * `/trash`.
 *
 * Deleting a memory fills this page instead of destroying anything. The subtitle does not
 * name a number of days: the window is a server setting, and the listing carries the real
 * one with every response — a number written here would be a second source of truth that
 * goes quietly wrong the day the setting changes.
 */
export default function Trash() {
  return (
    <AppShell
      title="Trash"
      subtitle="Deleted memories wait here before they are removed for good."
    >
      <TrashView />
    </AppShell>
  );
}
