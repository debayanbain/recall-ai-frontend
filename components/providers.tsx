"use client";

import type { ReactNode } from "react";
import { MotionConfig } from "motion/react";
import { QueryProvider } from "@/components/query-provider";
import { SessionGuard } from "@/components/session-guard";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { CaptureProvider } from "@/components/capture-sheet";
import { CommandPaletteProvider } from "@/components/command-palette";
import { useHydrateStores } from "@/hooks/use-hydrate-stores";

export function Providers({ children }: { children: ReactNode }) {
  useHydrateStores();

  return (
    // reducedMotion="user" makes every motion component honour the OS setting,
    // independent of the per-component variant swap.
    <MotionConfig reducedMotion="user" transition={{ duration: 0.26 }}>
    {/* Outermost of the client providers: auth and vault hooks below all read the cache. */}
    <QueryProvider>
    <SessionGuard />
    <TooltipProvider delay={300}>
    <CaptureProvider>
      <CommandPaletteProvider>
        {children}
        {/* Lifted above the mobile bottom nav so toasts never sit under it. */}
        <Toaster
          position="bottom-center"
          offset={{ bottom: "1.5rem", right: "1.5rem" }}
          mobileOffset={{ bottom: "5.75rem", left: "1rem", right: "1rem" }}
          closeButton
          toastOptions={{
            classNames: {
              toast:
                "rounded-2xl border border-border bg-card text-card-foreground shadow-[0_18px_40px_-18px_oklch(0.18_0.03_280/0.35)]",
              title: "text-[13.5px] font-semibold leading-snug",
              description: "text-[12.5px] leading-relaxed text-muted-foreground",
              actionButton:
                "rounded-lg bg-transparent px-2 py-1 text-[12px] font-semibold text-primary hover:bg-primary-soft",
            },
          }}
        />
      </CommandPaletteProvider>
    </CaptureProvider>
    </TooltipProvider>
    </QueryProvider>
    </MotionConfig>
  );
}
