import type { Metadata } from "next";
import { Check } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { AppShell } from "@/components/app-shell";
import { TelegramChat } from "./telegram-chat";

export const metadata: Metadata = { title: "Telegram capture · RecallAI" };

const surfaces = [
  "Telegram bot · @recallai_bot",
  "iOS / Android share sheet",
  "Browser extension",
  "Email forward · save@recall.ai",
  "Voice memo upload",
];

const softCard = "card-soft gap-0 rounded-[calc(var(--radius)+4px)] py-0 shadow-none ring-0";

export default function Capture() {
  return (
    <AppShell
      title="Capture from anywhere"
      subtitle="Forward a link, type a thought, or send a voice note to the Recall bot — it appears in your vault instantly."
    >
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_340px] xl:grid-cols-[minmax(0,1fr)_360px]">
        <TelegramChat />

        <aside className="min-w-0 space-y-5">
          <Card className={softCard}>
            <CardContent className="p-5">
              <div className="text-[12px] font-semibold uppercase tracking-wider text-primary">
                Capture surfaces
              </div>
              <div className="mt-3 space-y-2 text-[13px]">
                {surfaces.map((s) => (
                  <div key={s} className="flex items-start gap-2 text-foreground/85">
                    <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" /> {s}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
          <Card className={`${softCard} bg-linear-to-b from-white to-primary-soft`}>
            <CardContent className="p-5">
              <div className="text-[12px] font-semibold uppercase tracking-wider text-primary">
                Why a chat?
              </div>
              <p className="mt-2 text-[12.5px] leading-relaxed text-muted-foreground">
                Chat is the lowest friction interface humans have. Type, send, done. RecallAI does
                the rest in the background — titling, summarizing, tagging, and connecting.
              </p>
            </CardContent>
          </Card>
        </aside>
      </div>
    </AppShell>
  );
}
