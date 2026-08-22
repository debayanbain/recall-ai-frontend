"use client";

import Link from "next/link";
import { LogOut } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { useLogout, useSession } from "@/hooks/use-auth";
import { displayEmail } from "@/lib/session";

/** Neutralises the base-sera Button defaults (rounded-none, uppercase, tracking). */
const plain = "rounded-xl tracking-normal normal-case";

function initialsOf(name: string, email: string) {
  const source = name.trim() || email;
  const parts = source.split(/[\s@._-]+/).filter(Boolean);
  return (parts[0]?.[0] ?? "?").concat(parts[1]?.[0] ?? "").toUpperCase();
}

/** Header auth affordances: sign in / sign up when signed out, account menu when signed in. */
export function AuthControls() {
  const { user, isLoading, isSignedIn } = useSession();
  const logout = useLogout();

  // Hold the control's footprint while the session resolves so the header doesn't shift.
  if (isLoading) {
    return <Skeleton className="size-10 shrink-0 rounded-full" />;
  }

  if (!isSignedIn || !user) {
    return (
      <div className="flex shrink-0 items-center gap-2">
        <Button
          variant="ghost"
          // Base UI asserts a native <button> unless told the render prop replaces it.
          nativeButton={false}
          render={<Link href="/sign-in" />}
          className={`${plain} h-10 px-3 text-[13px] font-medium hover:bg-secondary`}
        >
          Sign in
        </Button>
        <Button
          nativeButton={false}
          render={<Link href="/sign-up" />}
          className={`${plain} hidden h-10 gradient-primary px-3.5 text-[13px] font-semibold text-white shadow-[0_8px_24px_-10px_oklch(0.55_0.19_285/0.7)] hover:bg-transparent sm:inline-flex`}
        >
          Sign up
        </Button>
      </div>
    );
  }

  const email = displayEmail(user);
  const name = user.name || email;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <button
            type="button"
            aria-label={`${name} — account menu`}
            // size-10 == 40px visual; the surrounding header row supplies the rest of
            // the 44px touch target.
            className="size-10 shrink-0 rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          />
        }
      >
        <Avatar className="size-10 after:hidden">
          <AvatarImage src={user.avatar_url ?? undefined} alt="" />
          <AvatarFallback className="rounded-full gradient-primary text-[12px] font-semibold text-white">
            {initialsOf(name, user.email)}
          </AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" sideOffset={8} className="min-w-56 rounded-2xl">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="grid gap-0.5 px-3 py-2.5 normal-case tracking-normal">
            <span className="truncate text-[13px] font-semibold text-foreground">{name}</span>
            {email ? (
              <span className="truncate text-[11px] font-normal text-muted-foreground">
                {email}
              </span>
            ) : null}
          </DropdownMenuLabel>
        </DropdownMenuGroup>

        <DropdownMenuSeparator />

        <DropdownMenuItem
          variant="destructive"
          disabled={logout.isPending}
          onClick={() => logout.mutate()}
        >
          <LogOut /> {logout.isPending ? "Logging out…" : "Log out"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
