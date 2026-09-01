"use client";

import Link from "next/link";
import { LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

/**
 * What an anonymous visitor sees where their own memories would be.
 *
 * Every vault read is behind the session cookie, so `/vault` legitimately 401s here —
 * rendering that as "we couldn't load your memories" puts a red panel in front of every
 * first-time visitor. One component so the invitation reads the same on every surface
 * that has this state.
 */
export function SignedOutInvite({
  title = "Your memories live here",
  description = "Sign in and anything you paste is summarized, tagged and connected automatically.",
}: {
  title?: string;
  description?: string;
}) {
  return (
    <Card className="mt-5 gap-0 rounded-3xl border border-dashed border-border bg-secondary/30 py-0 shadow-none ring-0">
      <CardContent className="px-6 py-14 text-center">
        <div className="mx-auto grid size-12 place-items-center rounded-2xl bg-primary-soft text-primary">
          <LogIn className="size-5" aria-hidden />
        </div>
        <h3 className="mt-4 font-display text-[22px] tracking-tight">{title}</h3>
        <p className="mx-auto mt-1.5 max-w-sm text-[13px] leading-relaxed text-muted-foreground">
          {description}
        </p>
        <Button
          nativeButton={false}
          render={<Link href="/sign-in" />}
          className="mt-5 h-11 gap-2 rounded-xl gradient-primary px-4 text-[13.5px] font-semibold tracking-normal text-white normal-case hover:bg-transparent"
        >
          Sign in to start
        </Button>
      </CardContent>
    </Card>
  );
}
