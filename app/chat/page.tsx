import type { Metadata } from "next";
import { AppShell } from "@/components/app-shell";
import { ChatView } from "./chat-view";

export const metadata: Metadata = { title: "Ask Recall · RecallAI" };

export default function Chat() {
  return (
    <AppShell
      title="Ask Recall"
      subtitle="Talk to your memories in natural language. Recall finds, summarizes and connects — with sources."
    >
      <ChatView />
    </AppShell>
  );
}
