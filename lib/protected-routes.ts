/**
 * Routes that require a session.
 *
 * Shared by `proxy.ts` (server-side redirect) and `SessionGuard` (client-side redirect)
 * so the two can never drift into disagreeing about what is protected.
 */
export const PROTECTED_PREFIXES = [
  "/vault",
  "/spaces",
  "/timeline",
  "/chat",
  "/editor",
  "/capture",
  "/connections",
  "/memory",
  "/settings",
] as const;

export const AUTH_PAGES = ["/sign-in", "/sign-up"] as const;

export function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

/**
 * True when the API lives on a different host than the app.
 *
 * The session cookie belongs to the API's host, so in that setup nothing running on the
 * app's origin -- including Next's proxy -- can see it. Callers use this to fall back to
 * a client-side check instead of denying everyone.
 */
export function apiIsCrossOrigin(appHostname: string): boolean {
  const api = process.env.NEXT_PUBLIC_API_URL;
  if (!api) return false;
  try {
    return new URL(api).hostname !== appHostname;
  } catch {
    return false;
  }
}
