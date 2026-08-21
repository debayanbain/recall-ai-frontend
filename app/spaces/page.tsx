import type { Metadata } from "next";
import Link from "next/link";
import { Plus, Sparkles, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AppShell } from "@/components/app-shell";
import { spaces } from "@/lib/mock-data";

export const metadata: Metadata = { title: "Spaces · RecallAI" };

const plain = "rounded-xl tracking-normal normal-case";

export default function Spaces() {
  return (
    <AppShell
      title="Spaces"
      subtitle="Curated knowledge collections — not folders. Each space connects related memories and can be shared as an interactive page."
      actions={
        <Button
          className={`${plain} h-11 gap-2 gradient-primary px-3.5 text-[13px] font-semibold text-white hover:bg-transparent`}
        >
          <Plus className="size-4" /> New space
        </Button>
      }
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 xl:grid-cols-3">
        {spaces.map((s) => (
          <Card
            key={s.id}
            className="card-soft card-lift group gap-0 overflow-hidden rounded-[calc(var(--radius)+4px)] py-0 shadow-none ring-0"
          >
            <Link
              href={`/spaces/${s.id}`}
              className="block focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              <div className={`relative h-32 bg-linear-to-br sm:h-36 ${s.gradient}`}>
                <div className="absolute inset-0 grid-dots opacity-50" />
                <div className="absolute left-5 top-5 grid h-12 w-12 place-items-center rounded-2xl bg-white/85 text-[22px] text-primary shadow-sm backdrop-blur">
                  {s.emoji}
                </div>
                {s.pinned && (
                  <Badge className="absolute right-4 top-4 rounded-full bg-white/85 px-2 py-0.5 text-[10.5px] font-medium tracking-normal text-primary normal-case backdrop-blur">
                    Pinned
                  </Badge>
                )}
              </div>
              <CardContent className="p-4 sm:p-5">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="text-[18px] font-semibold tracking-tight">{s.title}</h3>
                  <div className="text-[11px] tabular-nums text-muted-foreground">
                    {s.memoryCount} · {s.connectionCount}↔
                  </div>
                </div>
                <p className="mt-2 line-clamp-2 text-[13px] leading-relaxed text-muted-foreground">
                  <Sparkles className="mr-1 inline h-3 w-3 text-primary" />
                  {s.summary}
                </p>
                <div className="mt-4 flex items-center justify-between text-[11.5px] text-muted-foreground">
                  <div className="flex -space-x-1.5">
                    {["bg-rose-200", "bg-amber-200", "bg-emerald-200"].map((c) => (
                      <div key={c} className={`h-5 w-5 rounded-full border border-white ${c}`} />
                    ))}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Users className="h-3 w-3" /> 3 collaborators
                  </div>
                </div>
              </CardContent>
            </Link>
          </Card>
        ))}
      </div>
    </AppShell>
  );
}
