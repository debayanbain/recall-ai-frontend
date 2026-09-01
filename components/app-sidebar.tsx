"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion, useReducedMotion } from "motion/react";
import {
  BadgeCheck,
  Bell,
  ChevronsUpDown,
  CreditCard,
  LogIn,
  LogOut,
  Settings,
  Sparkles,
} from "lucide-react";
import { useLogout, useSession } from "@/hooks/use-auth";
import { displayEmail } from "@/lib/session";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar";
import { transition } from "@/lib/motion";
import { isActive, nav, secondary } from "@/lib/nav";
import { useSpaces } from "@/hooks/use-spaces";
import { SpaceGlyph } from "@/components/space-icon";

/** Shared shape for every sidebar row so the rail keeps one rhythm. */
const row =
  "relative h-11 rounded-xl px-3 data-active:bg-transparent " +
  "group-data-[collapsible=icon]:size-11! group-data-[collapsible=icon]:justify-center " +
  "group-data-[collapsible=icon]:[&>span:last-child]:sr-only";

export function AppSidebar() {
  const pathname = usePathname();
  const reduced = useReducedMotion();
  // Real Spaces, and only the pinned ones. Signed out this is simply empty -- the
  // query is disabled, so no request fires that could only ever 401.
  const { data: spaces } = useSpaces();
  const pinned = (spaces ?? []).filter((s) => s.pinned);

  return (
    <Sidebar collapsible="icon" className="border-border/70">
      <SidebarHeader className="p-3">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              tooltip="RecallAI — your second brain"
              render={<Link href="/" aria-label="RecallAI home" />}
              className="h-14 rounded-2xl px-2 hover:bg-sidebar-accent group-data-[collapsible=icon]:size-11! group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0!"
            >
              <span className="grid size-9 shrink-0 place-items-center rounded-xl gradient-primary text-white shadow-[0_8px_24px_-8px_oklch(0.55_0.19_285/0.5)]">
                <Sparkles className="size-4.5 text-white" strokeWidth={2.4} />
              </span>
              <span className="grid leading-tight group-data-[collapsible=icon]:hidden">
                <span className="text-[15px] font-semibold tracking-tight">
                  Recall<span className="text-gradient">AI</span>
                </span>
                <span className="truncate text-[11px] font-normal text-muted-foreground">
                  your second brain
                </span>
              </span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent className="gap-0 px-3 pb-2">
        <SidebarGroup className="p-0">
          <SidebarGroupContent>
            <SidebarMenu aria-label="Sections">
              {nav.map((item) => {
                const active = isActive(pathname, item.to);
                return (
                  <SidebarMenuItem key={item.to}>
                    <SidebarMenuButton
                      isActive={active}
                      tooltip={item.label}
                      render={
                        <Link
                          href={item.to}
                          aria-current={active ? "page" : undefined}
                        />
                      }
                      className={`${row} text-[13.5px] font-medium ${
                        active
                          ? "text-accent-foreground hover:bg-transparent"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {active && (
                        <motion.span
                          layoutId="sidebar-nav-active"
                          aria-hidden
                          className="absolute inset-0 rounded-xl bg-primary-soft"
                          transition={
                            reduced ? { duration: 0 } : transition.spring
                          }
                        />
                      )}
                      <item.icon
                        className={`relative shrink-0 ${active ? "text-primary" : ""}`}
                      />
                      <span className="relative">{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {pinned.length > 0 && (
          <SidebarGroup className="mt-5 p-0">
            <SidebarGroupLabel className="px-3 text-[11px] tracking-wider text-muted-foreground/80">
              Pinned spaces
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {pinned.map((s) => {
                  const active = isActive(pathname, `/spaces/${s.id}`);
                  return (
                    <SidebarMenuItem key={s.id}>
                      <SidebarMenuButton
                        isActive={active}
                        tooltip={`${s.name} · ${s.memory_count} memories`}
                        render={
                          <Link
                            href={`/spaces/${s.id}`}
                            aria-current={active ? "page" : undefined}
                          />
                        }
                        className={`${row} pr-9 text-[13px] font-normal text-muted-foreground hover:text-foreground data-active:bg-primary-soft data-active:text-accent-foreground`}
                      >
                        <SpaceGlyph
                          space={s}
                          className="shrink-0 text-primary"
                        />
                        <span>{s.name}</span>
                      </SidebarMenuButton>
                      <SidebarMenuBadge className="peer-data-[size=default]/menu-button:top-3 text-[11px] text-muted-foreground/70">
                        {s.memory_count}
                      </SidebarMenuBadge>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        <SidebarGroup className="mt-5 p-0">
          <SidebarGroupLabel className="px-3 text-[11px] tracking-wider text-muted-foreground/80">
            More
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {secondary.map((item) => {
                const active = isActive(pathname, item.to);
                return (
                  <SidebarMenuItem key={item.to}>
                    <SidebarMenuButton
                      isActive={active}
                      tooltip={item.label}
                      render={
                        <Link
                          href={item.to}
                          aria-current={active ? "page" : undefined}
                        />
                      }
                      className={`${row} text-[13px] font-normal text-muted-foreground hover:text-foreground data-active:bg-primary-soft data-active:text-accent-foreground`}
                    >
                      <item.icon className="shrink-0" />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-3">
        <SidebarMenu>
          <SidebarMenuItem>
            <NavUser />
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}

/** base-sera uppercases menu items; the rest of the app is sentence case. */
const menuItem = "rounded-xl text-[13px] normal-case tracking-normal";

/** Shared with the collapsed rail, so keep it identical in both states. */
const accountRow =
  "h-14 rounded-2xl border border-border/70 bg-linear-to-b from-white to-primary-soft px-2 data-popup-open:from-white data-popup-open:to-primary-soft group-data-[collapsible=icon]:size-11! group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:border-transparent group-data-[collapsible=icon]:bg-none group-data-[collapsible=icon]:px-0!";

/** "Maya Aoki" -> "MA"; falls back to the first letter of the email. */
function initialsOf(name: string, email: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return (email[0] ?? "?").toUpperCase();
  return parts
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("");
}

/** Account row: opens the user menu, and follows the rail when collapsed. */
function NavUser() {
  const { state } = useSidebar();
  const { user, isLoading, isSignedIn } = useSession();
  const logout = useLogout();
  const router = useRouter();

  // Hold the row's footprint while the session resolves so the footer doesn't shift.
  if (isLoading) {
    return (
      <Skeleton className="h-14 w-full rounded-2xl group-data-[collapsible=icon]:size-11" />
    );
  }

  if (!isSignedIn || !user) {
    return (
      <SidebarMenuButton
        size="lg"
        tooltip="Sign in"
        render={<Link href="/sign-in" />}
        className={accountRow}
      >
        <span className="grid size-9 shrink-0 place-items-center rounded-full gradient-primary text-white">
          <LogIn className="size-4" />
        </span>
        <span className="grid min-w-0 flex-1 leading-tight group-data-[collapsible=icon]:hidden">
          <span className="truncate text-[13px] font-semibold">Sign in</span>
          <span className="truncate text-[11px] font-normal text-muted-foreground">
            Keep your memories
          </span>
        </span>
      </SidebarMenuButton>
    );
  }

  // Providers that never release an address (X, phone-only Facebook) leave a synthetic
  // placeholder on the user record -- show the provider instead of that noise.
  const email = displayEmail(user);
  const name = user.name || email;
  const initials = initialsOf(name, email);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <SidebarMenuButton
            size="lg"
            aria-label={`${name} — account menu`}
            className={accountRow}
          />
        }
      >
        <Avatar className="size-9 shrink-0 after:hidden">
          <AvatarImage src={user.avatar_url ?? undefined} alt="" />
          <AvatarFallback className="rounded-full gradient-primary text-[12px] font-semibold text-white">
            {initials}
          </AvatarFallback>
        </Avatar>
        <span className="grid min-w-0 flex-1 leading-tight group-data-[collapsible=icon]:hidden">
          <span className="truncate text-[13px] font-semibold">{name}</span>
          <span className="truncate text-[11px] font-normal text-muted-foreground">
            {email}
          </span>
        </span>
        <ChevronsUpDown className="shrink-0 text-muted-foreground group-data-[collapsible=icon]:hidden" />
      </DropdownMenuTrigger>

      <DropdownMenuContent
        // Opens beside the rail when collapsed, above the row when expanded.
        side={state === "collapsed" ? "right" : "top"}
        align="end"
        sideOffset={8}
        className="min-w-60 rounded-2xl"
      >
        {/* Base UI requires menu labels to sit inside a group. */}
        <DropdownMenuGroup>
          <DropdownMenuLabel className="flex items-center gap-2.5 px-3 py-2.5 normal-case tracking-normal">
            <Avatar className="size-9 shrink-0 after:hidden">
              <AvatarImage src={user.avatar_url ?? undefined} alt="" />
              <AvatarFallback className="rounded-full gradient-primary text-[12px] font-semibold text-white">
                {initials}
              </AvatarFallback>
            </Avatar>
            <span className="grid min-w-0 leading-tight">
              <span className="truncate text-[13px] font-semibold text-foreground">
                {name}
              </span>
              <span className="truncate text-[11px] font-normal text-muted-foreground">
                {email}
              </span>
            </span>
          </DropdownMenuLabel>
        </DropdownMenuGroup>

        <DropdownMenuSeparator />

        <DropdownMenuGroup>
          <DropdownMenuItem
            className={menuItem}
            onClick={() => router.push("/settings")}
          >
            <BadgeCheck /> Account
          </DropdownMenuItem>
          <DropdownMenuItem className={menuItem}>
            <CreditCard /> Billing
          </DropdownMenuItem>
          <DropdownMenuItem className={menuItem}>
            <Bell /> Notifications
          </DropdownMenuItem>
          <DropdownMenuItem
            className={menuItem}
            onClick={() => router.push("/settings")}
          >
            <Settings /> Settings
          </DropdownMenuItem>
        </DropdownMenuGroup>

        <DropdownMenuSeparator />

        {/* Sign out sits apart from the navigation items above. */}
        <DropdownMenuItem
          variant="destructive"
          className={menuItem}
          disabled={logout.isPending}
          onClick={() => logout.mutate()}
        >
          <LogOut /> {logout.isPending ? "Logging out\u2026" : "Log out"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
