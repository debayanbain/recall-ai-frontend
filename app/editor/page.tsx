import type { Metadata } from "next";
import { AppShell } from "@/components/app-shell";
import { EditorView } from "./editor-view";

export const metadata: Metadata = { title: "Smart editor · RecallAI" };

export default function Editor() {
  return (
    <AppShell>
      <EditorView />
    </AppShell>
  );
}
