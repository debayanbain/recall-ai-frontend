"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import { motion, useReducedMotion } from "motion/react";
import { Bell, Plus, Search, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { AuthControls } from "@/components/auth-controls";
import { useCommandPalette } from "@/components/command-palette";
import { useCapture } from "@/components/capture-sheet";
import { useIsCompactNav } from "@/hooks/use-mobile";
import { transition } from "@/lib/motion";
import { bottomNav, isActive } from "@/lib/nav";

/** Neutralises the base-sera Button defaults (rounded-none, uppercase, tracking). */
const plain = "rounded-xl tracking-normal normal-case";

export function AppShell({
  children,
  title,
  subtitle,
  actions,
}: {
  children: ReactNode;
  /** Rich node so pages can decorate a word (see the timeline underline). */
  title?: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
}) {
  const pathname = usePathname();
  const palette = useCommandPalette();
  const capture = useCapture();
  // No slide-over anywhere: below `lg` the sidebar stays a persistent icon rail
  // instead of expanding over the content.
  const compact = useIsCompactNav();
  const [open, setOpen] = useState(true);

  return (
    <SidebarProvider
      open={compact ? false : open}
      onOpenChange={setOpen}
      // Slightly wider than the shadcn default so two-line rows never wrap, and a
      // 4rem icon rail so collapsed targets stay comfortably clickable.
      style={
        {
          "--sidebar-width": "16.5rem",
          "--sidebar-width-icon": "4rem",
        } as React.CSSProperties
      }
    >
      <Button
        nativeButton={false}
        variant="ghost"
        render={<a href="#main-content" />}
        className="sr-only tracking-normal normal-case focus-visible:not-sr-only focus-visible:absolute focus-visible:left-4 focus-visible:top-4 focus-visible:z-[80] focus-visible:h-auto focus-visible:rounded-xl focus-visible:bg-card focus-visible:px-4 focus-visible:py-2 focus-visible:text-[13px] focus-visible:font-semibold focus-visible:shadow-lg"
      >
        Skip to content
      </Button>

      <AppSidebar />

      <SidebarInset className="min-w-0">
        <header className="sticky top-0 z-30 border-b border-border/60 bg-background/85 backdrop-blur-xl">
          <div className="mx-auto flex w-full max-w-7xl items-center gap-2 px-4 py-3 sm:gap-3 sm:px-5 lg:px-6">
            {/* Collapse only matters where the rail can expand (⌘B / Ctrl+B). */}
            <SidebarTrigger
              className={`${plain} hidden size-10 shrink-0 border border-border bg-card text-foreground/70 hover:bg-secondary lg:inline-flex [&_svg]:size-4.5`}
            />

            {/* Search opens the command palette so there is one search surface */}
            <Button
              variant="outline"
              onClick={palette.open}
              aria-label="Search memories, spaces, ideas"
              className={`${plain} hidden h-10 w-full max-w-xl min-w-0 shrink justify-start gap-2.5 border-border bg-secondary/60 px-3.5 text-sm font-normal text-muted-foreground hover:bg-secondary md:flex`}
            >
              <Search className="size-4 shrink-0" />
              <span className="flex-1 truncate text-left">Search memories, spaces, ideas…</span>
              <kbd className="shrink-0 rounded-md border border-border bg-card px-1.5 py-0.5 text-[10.5px] font-medium">
                ⌘ K
              </kbd>
            </Button>

            <div className="ml-auto flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={palette.open}
                aria-label="Search"
                className={`${plain} border-border bg-card text-muted-foreground hover:bg-secondary md:hidden`}
              >
                <Search className="size-4" />
              </Button>
              <Button
                nativeButton={false}
                variant="outline"
                render={<Link href="/chat" />}
                className={`${plain} hidden h-10 gap-2 border-border bg-card px-3 text-[13px] font-medium text-foreground/80 hover:bg-secondary lg:inline-flex`}
              >
                <Sparkles className="size-3.5 text-primary" /> Ask Recall
              </Button>
              <Button
                variant="outline"
                size="icon"
                aria-label="Notifications"
                className={`${plain} hidden border-border bg-card text-muted-foreground hover:bg-secondary sm:inline-flex`}
              >
                <Bell className="size-4" />
              </Button>
              <Button
                onClick={() => capture.open()}
                className={`${plain} hidden h-10 gap-2 gradient-primary px-3.5 text-[13px] font-semibold text-white shadow-[0_8px_24px_-10px_oklch(0.55_0.19_285/0.7)] hover:bg-transparent md:inline-flex`}
              >
                <Plus className="size-4" /> New memory
              </Button>
              <AuthControls />
            </div>
          </div>

          {(title || actions) && (
            <div className="mx-auto flex w-full max-w-7xl flex-col gap-3 px-4 pb-4 pt-1 sm:px-5 lg:flex-row lg:flex-wrap lg:items-end lg:justify-between lg:gap-4 lg:px-6 lg:pb-5">
              <div className="min-w-0">
                {title && (
                  <h1 className="font-display text-[28px] leading-none tracking-tight sm:text-[34px] md:text-[42px]">
                    {title}
                  </h1>
                )}
                {subtitle && (
                  <p className="mt-2 max-w-2xl text-[13.5px] text-muted-foreground sm:text-[14px]">
                    {subtitle}
                  </p>
                )}
              </div>
              {actions && (
                // The rail is always on screen now, so wide action rows scroll
                // inside their own container instead of the page.
                <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
                  {actions}
                </div>
              )}
            </div>
          )}
        </header>

        <div
          id="main-content"
          tabIndex={-1}
          className="mx-auto w-full max-w-7xl px-4 pb-[calc(env(safe-area-inset-bottom)+6.5rem)] pt-5 focus:outline-none sm:px-5 lg:px-6 lg:pb-16"
        >
          {children}
        </div>
      </SidebarInset>

      {/* Mobile bottom navigation — top-level destinations only */}
      <BottomNav pathname={pathname} onCapture={() => capture.open()} />
    </SidebarProvider>
  );
}

function BottomNav({
  pathname,
  onCapture,
}: {
  pathname: string;
  onCapture: () => void;
}) {
  const reduced = useReducedMotion();

  return (
    <nav
      aria-label="Primary"
      className="fixed right-0 bottom-0 left-(--sidebar-width-icon) z-40 border-t border-l border-border bg-card/95 px-2 pb-[calc(env(safe-area-inset-bottom)+0.5rem)] pt-1.5 backdrop-blur lg:hidden"
    >
      <ul className="flex items-stretch justify-between">
        {bottomNav.map((item) => {
          const active = item.to ? isActive(pathname, item.to) : false;
          return (
            <li key={item.label} className="flex-1">
              {item.primary ? (
                <Button
                  size="icon"
                  onClick={onCapture}
                  aria-label="Capture a memory"
                  className="mx-auto size-12 -translate-y-3 rounded-full gradient-primary text-white shadow-[0_12px_28px_-10px_oklch(0.55_0.19_285/0.7)] hover:bg-transparent"
                >
                  <item.icon className="size-5" />
                </Button>
              ) : (
                <Button
                  nativeButton={false}
                  variant="ghost"
                  render={<Link href={item.to!} aria-current={active ? "page" : undefined} />}
                  className={`${plain} relative h-12 w-full flex-col justify-center gap-1 px-0 text-[10.5px] font-medium ${
                    active ? "text-primary" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {active && (
                    <motion.span
                      layoutId="bottom-nav-active"
                      aria-hidden
                      className="absolute inset-x-2 inset-y-0.5 rounded-xl bg-primary-soft"
                      transition={reduced ? { duration: 0 } : transition.spring}
                    />
                  )}
                  <item.icon className="relative size-[18px]" />
                  <span className="relative">{item.label}</span>
                </Button>
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
