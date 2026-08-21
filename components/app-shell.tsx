"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import { motion, useReducedMotion } from "motion/react";
import {
  Sparkles,
  Home,
  Library,
  Network,
  Layers,
  MessageCircle,
  CalendarClock,
  Settings,
  Search,
  Bell,
  Plus,
  Pencil,
  Smartphone,
  Share2,
  Menu,
  X,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { spaces } from "@/lib/mock-data";
import { useCommandPalette } from "@/components/command-palette";
import { useCapture } from "@/components/capture-sheet";
import { transition } from "@/lib/motion";

const nav = [
  { to: "/", label: "Home", icon: Home },
  { to: "/vault", label: "All memories", icon: Library },
  { to: "/connections", label: "Connections", icon: Network },
  { to: "/spaces", label: "Spaces", icon: Layers },
  { to: "/chat", label: "Ask Recall", icon: MessageCircle },
  { to: "/timeline", label: "Timeline", icon: CalendarClock },
];

const secondary = [
  { to: "/capture", label: "Telegram capture", icon: Sparkles },
  { to: "/editor", label: "Smart editor", icon: Pencil },
  { to: "/share/building-recallai", label: "Public share page", icon: Share2 },
  { to: "/mobile", label: "Mobile preview", icon: Smartphone },
];

const bottomNav: { to?: string; label: string; icon: LucideIcon; primary?: boolean }[] = [
  { to: "/", label: "Home", icon: Home },
  { to: "/vault", label: "Vault", icon: Library },
  { label: "Capture", icon: Plus, primary: true },
  { to: "/spaces", label: "Spaces", icon: Layers },
  { to: "/chat", label: "Ask", icon: MessageCircle },
];

function isActive(pathname: string, to: string) {
  return pathname === to || (to !== "/" && pathname.startsWith(to));
}

/** Neutralises the base-sera Button defaults (rounded-none, uppercase, tracking). */
const plain = "rounded-xl tracking-normal normal-case";

export function AppShell({
  children,
  title,
  subtitle,
  actions,
}: {
  children: ReactNode;
  title?: string;
  subtitle?: ReactNode;
  actions?: ReactNode;
}) {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const palette = useCommandPalette();
  const capture = useCapture();
  const reduced = useReducedMotion();

  return (
    <div className="min-h-dvh bg-background">
      <Button
        nativeButton={false}
        variant="ghost"
        render={<a href="#main-content" />}
        className="sr-only tracking-normal normal-case focus-visible:not-sr-only focus-visible:absolute focus-visible:left-4 focus-visible:top-4 focus-visible:z-[80] focus-visible:h-auto focus-visible:rounded-xl focus-visible:bg-card focus-visible:px-4 focus-visible:py-2 focus-visible:text-[13px] focus-visible:font-semibold focus-visible:shadow-lg"
      >
        Skip to content
      </Button>

      <div className="flex">
        {/* Desktop sidebar */}
        <aside className="sticky top-0 hidden h-dvh w-62 shrink-0 flex-col overflow-y-auto overscroll-contain border-r border-border/70 bg-sidebar px-4 py-5 lg:flex xl:w-65">
          <SidebarContent pathname={pathname} layoutGroup="rail" />
        </aside>

        {/* Mobile drawer */}
        <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
          <SheetContent
            side="left"
            showCloseButton={false}
            className="w-[86vw] max-w-75 gap-0 overflow-y-auto overscroll-contain border-border bg-sidebar px-4 py-5 text-foreground lg:hidden"
          >
            <SheetTitle className="sr-only">Main navigation</SheetTitle>
            <SheetDescription className="sr-only">
              Sections, pinned spaces and secondary pages
            </SheetDescription>
            <SidebarContent pathname={pathname} onNavigate={() => setDrawerOpen(false)} showClose layoutGroup="drawer" />
          </SheetContent>
        </Sheet>

        {/* Main */}
        <main className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 border-b border-border/60 bg-background/85 backdrop-blur-xl">
            <div className="mx-auto flex w-full max-w-7xl items-center gap-2 px-4 py-3 sm:gap-3 sm:px-5 lg:px-6">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setDrawerOpen(true)}
                aria-label="Open navigation"
                aria-expanded={drawerOpen}
                className={`${plain} shrink-0 border-border bg-card text-foreground/70 hover:bg-secondary lg:hidden`}
              >
                <Menu className="size-4.5" />
              </Button>

              <Button
                nativeButton={false}
                variant="ghost"
                render={<Link href="/" aria-label="RecallAI home" />}
                className={`${plain} h-11 shrink-0 gap-2 px-0 hover:bg-transparent lg:hidden`}
              >
                <span className="grid size-9 place-items-center rounded-xl gradient-primary text-white">
                  <Sparkles className="size-4" strokeWidth={2.4} />
                </span>
                <span className="hidden text-[15px] font-semibold tracking-tight sm:block">
                  Recall<span className="text-gradient">AI</span>
                </span>
              </Button>

              {/* Search opens the command palette so there is one search surface */}
              <Button
                variant="outline"
                onClick={palette.open}
                aria-label="Search memories, spaces, ideas"
                className={`${plain} hidden h-10 w-full max-w-xl justify-start gap-2.5 border-border bg-secondary/60 px-3.5 text-sm font-normal text-muted-foreground hover:bg-secondary md:flex`}
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
                <Avatar className="size-10 after:hidden">
                  <AvatarFallback className="rounded-full bg-linear-to-br from-amber-200 to-rose-200 text-[12px] font-semibold text-rose-900">
                    MA
                  </AvatarFallback>
                </Avatar>
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
                  <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:overflow-visible sm:px-0">
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
        </main>
      </div>

      {/* Mobile bottom navigation — top-level destinations only */}
      <nav
        aria-label="Primary"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 px-2 pb-[calc(env(safe-area-inset-bottom)+0.5rem)] pt-1.5 backdrop-blur lg:hidden"
      >
        <ul className="flex items-stretch justify-between">
          {bottomNav.map((item) => {
            const active = item.to ? isActive(pathname, item.to) : false;
            return (
              <li key={item.label} className="flex-1">
                {item.primary ? (
                  <Button
                    size="icon"
                    onClick={() => capture.open()}
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
    </div>
  );
}

function SidebarContent({
  pathname,
  onNavigate,
  showClose,
  layoutGroup,
}: {
  pathname: string;
  onNavigate?: () => void;
  showClose?: boolean;
  /** Desktop rail and mobile drawer render at once, so each needs its own id. */
  layoutGroup: string;
}) {
  const reduced = useReducedMotion();
  return (
    <>
      {showClose && (
        <div className="mb-2 flex justify-end">
          <SheetClose
            render={
              <Button
                variant="ghost"
                size="icon"
                aria-label="Close navigation"
                className={`${plain} size-10 text-muted-foreground hover:bg-sidebar-accent`}
              />
            }
          >
            <X className="size-5" />
          </SheetClose>
        </div>
      )}
      <Button
        nativeButton={false}
        variant="ghost"
        render={<Link href="/" onClick={onNavigate} />}
        className={`${plain} mb-7 h-auto justify-start gap-2.5 px-2 py-0 hover:bg-transparent`}
      >
        <span className="grid size-9 place-items-center rounded-xl gradient-primary text-white shadow-[0_8px_24px_-8px_oklch(0.55_0.19_285/0.5)]">
          <Sparkles className="size-4.5" strokeWidth={2.4} />
        </span>
        <span className="leading-tight">
          <span className="block text-[15px] font-semibold tracking-tight">
            Recall<span className="text-gradient">AI</span>
          </span>
          <span className="block text-[11px] font-normal text-muted-foreground">
            your second brain
          </span>
        </span>
      </Button>

      <nav className="flex flex-col gap-0.5" aria-label="Sections">
        {nav.map((item) => {
          const active = isActive(pathname, item.to);
          return (
            <Button
              nativeButton={false}
              key={item.to}
              variant="ghost"
              render={
                <Link
                  href={item.to}
                  onClick={onNavigate}
                  aria-current={active ? "page" : undefined}
                />
              }
              className={`${plain} relative h-11 justify-start gap-3 px-3 text-[13.5px] font-medium ${
                active
                  ? "text-accent-foreground hover:bg-transparent"
                  : "text-muted-foreground hover:bg-sidebar-accent hover:text-foreground"
              }`}
            >
              {active && (
                <motion.span
                  layoutId={`${layoutGroup}-nav-active`}
                  aria-hidden
                  className="absolute inset-0 rounded-xl bg-primary-soft"
                  transition={reduced ? { duration: 0 } : transition.spring}
                />
              )}
              <item.icon className={`relative size-4 shrink-0 ${active ? "text-primary" : ""}`} />
              <span className="relative">{item.label}</span>
            </Button>
          );
        })}
      </nav>

      <div className="mt-7 px-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/80">
        Pinned spaces
      </div>
      <div className="mt-2 flex flex-col gap-0.5">
        {spaces
          .filter((s) => s.pinned)
          .map((s) => (
            <Button
              nativeButton={false}
              key={s.id}
              variant="ghost"
              render={<Link href={`/spaces/${s.id}`} onClick={onNavigate} />}
              className={`${plain} h-11 justify-between gap-2 px-3 text-[13px] font-normal text-muted-foreground hover:bg-sidebar-accent hover:text-foreground`}
            >
              <span className="flex items-center gap-2.5 truncate">
                <span className="text-primary">{s.emoji}</span>
                <span className="truncate">{s.title}</span>
              </span>
              <span className="text-[11px] tabular-nums text-muted-foreground/70">
                {s.memoryCount}
              </span>
            </Button>
          ))}
      </div>

      <div className="mt-7 px-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/80">
        More
      </div>
      <div className="mt-2 flex flex-col gap-0.5">
        {secondary.map((item) => (
          <Button
            nativeButton={false}
            key={item.to}
            variant="ghost"
            render={<Link href={item.to} onClick={onNavigate} />}
            className={`${plain} h-11 justify-start gap-3 px-3 text-[13px] font-normal text-muted-foreground hover:bg-sidebar-accent hover:text-foreground`}
          >
            <item.icon className="size-4 shrink-0" />
            {item.label}
          </Button>
        ))}
      </div>

      <div className="mt-7 rounded-2xl border border-border/70 bg-linear-to-b from-white to-primary-soft p-3.5 lg:mt-auto">
        <div className="flex items-center gap-2.5">
          <Avatar className="size-9 shrink-0 after:hidden">
            <AvatarFallback className="rounded-full gradient-primary text-[12px] font-semibold text-white">
              MA
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 leading-tight">
            <div className="truncate text-[13px] font-semibold">Maya Aoki</div>
            <div className="truncate text-[11px] text-muted-foreground">
              Pro plan · 1,284 memories
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Account settings"
            className={`${plain} ml-auto size-9 shrink-0 text-muted-foreground hover:bg-white`}
          >
            <Settings className="size-4" />
          </Button>
        </div>
      </div>
    </>
  );
}
