import type { Metadata } from "next";
import { AppShell } from "@/components/app-shell";
import { TelegramSetupGuide } from "@/components/telegram-setup-guide";

export const metadata: Metadata = { title: "Telegram capture · RecallAI" };

export default function Capture() {
  return (
    <AppShell
      title="Telegram capture"
      subtitle="Connect the bot once, then save anything from the chat you already have open."
    >
      <TelegramSetupGuide />
    </AppShell>
  );
}
