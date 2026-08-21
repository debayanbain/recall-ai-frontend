import type { Metadata } from "next";
import type { ReactNode } from "react";
import {
  Home,
  Layers,
  MessageCircle,
  User,
  Plus,
  Search,
  Sparkles,
  Link2,
  StickyNote,
  Upload,
  Mic,
  Send,
  Check,
  ChevronLeft,
  Share2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { memories, spaces } from "@/lib/mock-data";

export const metadata: Metadata = { title: "Mobile · RecallAI" };

const plain = "rounded-xl tracking-normal normal-case";
const flatCard = "gap-0 rounded-2xl border border-border py-0 shadow-none ring-0";

export default function Mobile() {
  return (
    <div className="min-h-dvh bg-linear-to-b from-primary-soft/60 to-background py-8 sm:py-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="mb-8 text-center sm:mb-10">
          <Badge className="gap-1.5 rounded-full border border-primary/20 bg-card px-3 py-1 text-[11.5px] font-medium tracking-normal text-primary normal-case">
            <Sparkles className="h-3 w-3" /> Mobile preview
          </Badge>
          <h1 className="mt-3 font-display text-[32px] leading-none tracking-tight sm:text-[42px] md:text-[56px]">
            RecallAI in your pocket
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-[14px] text-muted-foreground">
            The full second brain — capture, vault, spaces, ask and Telegram-style chat — designed
            for thumb-first interaction.
          </p>
        </div>

        <div className="flex flex-wrap items-start justify-center gap-6 sm:gap-8">
          <Phone label="Home"><PhoneHome /></Phone>
          <Phone label="Capture sheet"><PhoneCapture /></Phone>
          <Phone label="Space detail"><PhoneSpace /></Phone>
          <Phone label="Ask Recall"><PhoneChat /></Phone>
          <Phone label="Telegram capture"><PhoneTelegram /></Phone>
        </div>
      </div>
    </div>
  );
}

function Phone({ children, label }: { children: ReactNode; label: string }) {
  return (
    <div className="flex w-full max-w-80 flex-col items-center gap-3">
      <div className="relative h-150 w-full max-w-80 overflow-hidden rounded-[40px] border-8 border-foreground/90 bg-card shadow-[0_40px_80px_-30px_oklch(0.55_0.19_285/0.4)] sm:h-170 sm:rounded-[44px] sm:border-[10px]">
        <div className="absolute left-1/2 top-2.5 z-10 h-5 w-24 -translate-x-1/2 rounded-full bg-foreground/90" />
        <div className="h-full w-full overflow-hidden">{children}</div>
      </div>
      <div className="text-[12px] font-medium text-muted-foreground">{label}</div>
    </div>
  );
}

function StatusBar() {
  return (
    <div className="flex h-8 items-center justify-between px-6 pt-2 text-[10.5px] font-semibold">
      <span>9:41</span>
      <span className="flex items-center gap-1 text-foreground/70">●●●●●</span>
    </div>
  );
}

function BottomNav({ active = "home" }: { active?: string }) {
  const items = [
    { id: "home", label: "Home", icon: Home },
    { id: "spaces", label: "Spaces", icon: Layers },
    { id: "capture", label: "Capture", icon: Plus, primary: true },
    { id: "chat", label: "Ask Recall", icon: MessageCircle },
    { id: "profile", label: "Profile", icon: User },
  ];
  return (
    <div className="absolute inset-x-0 bottom-0 border-t border-border bg-card/95 px-4 pb-4 pt-2 backdrop-blur">
      <div className="flex items-center justify-between">
        {items.map((i) =>
          i.primary ? (
            <Button
              key={i.id}
              size="icon"
              aria-label={i.label}
              className="size-12 -translate-y-3 rounded-full gradient-primary text-white shadow-[0_12px_28px_-10px_oklch(0.55_0.19_285/0.7)] hover:bg-transparent"
            >
              <i.icon className="size-5" />
            </Button>
          ) : (
            <Button
              key={i.id}
              variant="ghost"
              size="icon"
              aria-label={i.label}
              aria-current={active === i.id ? "page" : undefined}
              className={`${plain} size-10 ${active === i.id ? "text-primary" : "text-muted-foreground"}`}
            >
              <i.icon className="size-5" />
            </Button>
          ),
        )}
      </div>
    </div>
  );
}

function PhoneHome() {
  return (
    <div className="relative h-full bg-background">
      <StatusBar />
      <div className="px-5 pt-3">
        <div className="text-[11px] text-muted-foreground">Good morning,</div>
        <h2 className="font-display text-[28px] leading-tight tracking-tight">Maya</h2>
        <div className="mt-3 flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2.5">
          <Search className="h-4 w-4 text-muted-foreground" />
          <span className="text-[13px] text-muted-foreground">Search your memories…</span>
        </div>
        <div className="mt-4 rounded-2xl bg-linear-to-br from-primary-soft to-white p-3.5">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-primary">
            Quick capture
          </div>
          <div className="mt-2.5 grid grid-cols-4 gap-2">
            {[
              { I: Link2, label: "Paste link" },
              { I: StickyNote, label: "Quick note" },
              { I: Upload, label: "Upload file" },
              { I: Mic, label: "Voice note" },
            ].map((c) => (
              <Button
                key={c.label}
                variant="outline"
                aria-label={c.label}
                className={`${plain} h-14 border-border bg-card px-0 text-primary`}
              >
                <c.I className="size-4" />
              </Button>
            ))}
          </div>
        </div>
        <div className="mt-5 flex items-center justify-between">
          <div className="text-[13px] font-semibold">Recent</div>
          <div className="text-[11px] text-muted-foreground">See all</div>
        </div>
        <div className="mt-2 space-y-2.5">
          {memories.slice(0, 4).map((m) => (
            <Card key={m.id} className={flatCard}>
              <CardContent className="flex items-center gap-3 p-3">
                <div className={`h-12 w-12 shrink-0 rounded-xl bg-linear-to-br ${m.accent}`} />
                <div className="min-w-0">
                  <div className="line-clamp-1 text-[12.5px] font-semibold">{m.title}</div>
                  <div className="line-clamp-1 text-[10.5px] text-muted-foreground">
                    {m.source} · {m.savedAt}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
      <BottomNav active="home" />
    </div>
  );
}

function PhoneCapture() {
  return (
    <div className="relative h-full bg-foreground/30">
      <StatusBar />
      <div className="absolute inset-x-0 bottom-0 rounded-t-[28px] bg-card px-5 pb-8 pt-3 shadow-[0_-12px_40px_-12px_oklch(0.55_0.19_285/0.4)]">
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-border" />
        <div className="text-[11px] font-semibold uppercase tracking-wider text-primary">Capture</div>
        <div className="font-display text-[22px] leading-tight tracking-tight">
          What&rsquo;s on your mind?
        </div>
        <div className="mt-3 rounded-2xl border border-border bg-secondary/40 p-3 text-[12.5px] text-muted-foreground">
          Paste a link, type a note, drop a file…
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          {[
            { I: Link2, l: "Paste link", h: "Auto-detect & summarize" },
            { I: StickyNote, l: "Quick note", h: "Title comes later" },
            { I: Upload, l: "Upload file", h: "PDF, image, audio" },
            { I: Mic, l: "Voice note", h: "Hold to speak" },
          ].map((c) => (
            <Button
              key={c.l}
              variant="outline"
              className={`${plain} h-auto flex-col items-start gap-0 rounded-2xl border-border bg-card p-3 text-left`}
            >
              <span className="grid size-8 place-items-center rounded-lg bg-primary-soft text-primary">
                <c.I className="size-4" />
              </span>
              <span className="mt-2 text-[12.5px] font-semibold">{c.l}</span>
              <span className="text-[10.5px] font-normal text-muted-foreground">{c.h}</span>
            </Button>
          ))}
        </div>
        <Button
          className={`${plain} mt-4 h-12 w-full gap-2 rounded-2xl gradient-primary text-[13.5px] font-semibold text-white hover:bg-transparent`}
        >
          <Mic className="size-4" /> Hold to record
        </Button>
      </div>
    </div>
  );
}

function PhoneSpace() {
  const s = spaces[0];
  return (
    <div className="relative h-full bg-background">
      <StatusBar />
      <div className={`relative h-44 overflow-hidden bg-linear-to-br ${s.gradient}`}>
        <div className="absolute inset-0 grid-dots opacity-50" />
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Back"
          className={`${plain} absolute left-4 top-3 size-8 rounded-full bg-white/85 text-foreground/80 backdrop-blur`}
        >
          <ChevronLeft className="size-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Share this space"
          className={`${plain} absolute right-4 top-3 size-8 rounded-full bg-white/85 text-foreground/80 backdrop-blur`}
        >
          <Share2 className="size-4" />
        </Button>
      </div>
      <div className="-mt-6 px-5">
        <Card className={flatCard}>
          <CardContent className="p-4">
            <div className="text-[11px] font-medium text-primary">{s.emoji} Space</div>
            <div className="mt-1 font-display text-[24px] leading-tight tracking-tight">{s.title}</div>
            <div className="mt-1 text-[11.5px] tabular-nums text-muted-foreground">
              {s.memoryCount} memories · {s.connectionCount} connections
            </div>
            <p className="mt-2 text-[12px] leading-relaxed text-muted-foreground">{s.summary}</p>
          </CardContent>
        </Card>
        <div className="mt-4 flex gap-2 text-[11.5px]">
          {["Overview", "Memories", "Timeline", "Ask"].map((t, i) => (
            <Badge
              key={t}
              className={`rounded-full px-3 py-1.5 text-[11.5px] font-normal tracking-normal normal-case ${
                i === 0 ? "bg-primary-soft text-accent-foreground" : "text-muted-foreground"
              }`}
            >
              {t}
            </Badge>
          ))}
        </div>
        <div className="mt-3 space-y-2.5 pb-24">
          {memories.slice(0, 3).map((m) => (
            <Card key={m.id} className={flatCard}>
              <CardContent className="p-3">
                <div className={`h-20 rounded-xl bg-linear-to-br ${m.accent}`} />
                <div className="mt-2 line-clamp-1 text-[12.5px] font-semibold">{m.title}</div>
                <div className="mt-1 line-clamp-2 text-[11px] text-muted-foreground">{m.summary}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
      <BottomNav active="spaces" />
    </div>
  );
}

function PhoneChat() {
  return (
    <div className="relative h-full bg-background">
      <StatusBar />
      <div className="px-5 pb-3 pt-2">
        <div className="text-[11px] text-muted-foreground">Ask</div>
        <div className="font-display text-[22px] leading-tight tracking-tight">Recall</div>
      </div>
      <Separator />
      <div className="space-y-3 px-4 py-4">
        <div className="ml-auto max-w-[80%] rounded-2xl rounded-tr-md gradient-primary px-3 py-2 text-[13px] text-white">
          Where did I save the SaaS pricing idea?
        </div>
        <Card className={`${flatCard} max-w-[90%] rounded-tl-md text-[13px] text-foreground/85`}>
          <CardContent className="p-3">
            <div className="flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-wider text-primary">
              <Sparkles className="h-3 w-3" /> 2 matches
            </div>
            <div className="mt-2 text-[12.5px] leading-relaxed">
              You saved it inside <span className="font-medium">Startup Ideas</span> as a voice note,
              and it&rsquo;s connected to your Lean Startup notes.
            </div>
            <div className="mt-2.5 space-y-2">
              {memories.slice(1, 3).map((m) => (
                <div key={m.id} className="flex gap-2 rounded-xl border border-border bg-secondary/40 p-2">
                  <div className={`h-10 w-10 shrink-0 rounded-lg bg-linear-to-br ${m.accent}`} />
                  <div className="min-w-0">
                    <div className="line-clamp-1 text-[11.5px] font-semibold">{m.title}</div>
                    <div className="text-[10px] text-muted-foreground">{m.source}</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
      <div className="absolute inset-x-0 bottom-20 px-4">
        <div className="flex items-center gap-2 rounded-full border border-border bg-card px-3 py-2 shadow-[0_12px_30px_-12px_oklch(0.55_0.19_285/0.4)]">
          <Sparkles className="h-4 w-4 text-primary" />
          <span className="flex-1 text-[12.5px] text-muted-foreground">Ask anything…</span>
          <Button
            size="icon-xs"
            aria-label="Send"
            className="size-7 rounded-full gradient-primary text-white hover:bg-transparent"
          >
            <Send className="size-3" />
          </Button>
        </div>
      </div>
      <BottomNav active="chat" />
    </div>
  );
}

function PhoneTelegram() {
  return (
    <div className="relative h-full bg-secondary/30">
      <StatusBar />
      <div className="flex items-center gap-3 border-b border-border bg-card px-4 py-3">
        <ChevronLeft className="h-4 w-4 text-muted-foreground" />
        <div className="grid h-9 w-9 place-items-center rounded-full gradient-primary text-white">
          <Sparkles className="h-4 w-4" />
        </div>
        <div className="leading-tight">
          <div className="text-[13px] font-semibold">Recall bot</div>
          <div className="text-[10px] text-emerald-600">online</div>
        </div>
      </div>
      <div className="space-y-2.5 px-3 py-4">
        <Card className={`${flatCard} max-w-[80%] rounded-tl-md text-[12.5px] text-foreground/85`}>
          <CardContent className="px-3 py-2">Tell me anything you want to remember.</CardContent>
        </Card>
        <div className="ml-auto max-w-[80%] rounded-2xl rounded-tr-md gradient-primary px-3 py-2 text-[12.5px] text-white">
          Idea: family mode for spaces.
        </div>
        <Card className={`${flatCard} max-w-[88%] rounded-tl-md text-[12.5px]`}>
          <CardContent className="px-3 py-2.5">
            <div className="flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-wider text-primary">
              <Check className="h-3 w-3" /> Saved
            </div>
            <div className="mt-1.5 text-[12.5px] font-semibold">Idea: family mode for Spaces</div>
            <div className="text-[11px] text-muted-foreground">
              Multi-collaborator with weekly digest and voice capture.
            </div>
            <div className="mt-2 flex gap-1.5">
              <Button
                size="xs"
                className="rounded-lg gradient-primary px-2 text-[10.5px] font-semibold tracking-normal text-white normal-case hover:bg-transparent"
              >
                Connect
              </Button>
              <Button
                variant="outline"
                size="xs"
                className="rounded-lg border-border bg-card px-2 text-[10.5px] font-medium tracking-normal text-muted-foreground normal-case"
              >
                Open
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
      <div className="absolute inset-x-0 bottom-0 flex items-center gap-2 border-t border-border bg-card px-3 py-2.5">
        <div className="flex h-9 flex-1 items-center gap-2 rounded-full bg-secondary px-3">
          <span className="text-[12px] text-muted-foreground">Type or hold to talk…</span>
        </div>
        <Button
          size="icon-sm"
          aria-label="Record a voice note"
          className="size-9 rounded-full gradient-primary text-white hover:bg-transparent"
        >
          <Mic className="size-3.5" />
        </Button>
      </div>
    </div>
  );
}
