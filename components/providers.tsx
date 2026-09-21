"use client";

import type { ReactNode } from "react";
import { MotionConfig } from "motion/react";
import { QueryProvider } from "@/components/query-provider";
import { SessionGuard } from "@/components/session-guard";
import { Toaster } from "@/components/ui/toast";
import { TooltipProvider } from "@/components/ui/tooltip";
import { CaptureProvider } from "@/components/capture-sheet";
import { CommandPaletteProvider } from "@/components/command-palette";
import { AddToSpaceProvider } from "@/components/add-to-space";
import { ConnectionSuggestProvider } from "@/components/connection-suggest";
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
    {/* Outside CaptureProvider, not inside it: the capture sheet is what starts a watch,
        and a provider renders its own surface beside `children` rather than within it —
        so a sheet mounted by CaptureProvider is only under this context if this one is
        the outer of the two. */}
    <ConnectionSuggestProvider>
    <CaptureProvider>
      <CommandPaletteProvider>
      <AddToSpaceProvider>
        {children}
        {/* Surface and placement live in `components/ui/toast.tsx`. Kept out of here so
            there is one source of truth — a second config in this file used to override
            it silently. */}
        <Toaster />
      </AddToSpaceProvider>
      </CommandPaletteProvider>
    </CaptureProvider>
    </ConnectionSuggestProvider>
    </TooltipProvider>
    </QueryProvider>
    </MotionConfig>
  );
}
