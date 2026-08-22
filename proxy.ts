import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { AUTH_PAGES, apiIsCrossOrigin, isProtectedPath } from "@/lib/protected-routes";

/**
 * Optimistic route gate (Next 16 renamed Middleware to Proxy).
 *
 * This is a UX shortcut, NOT authorization. It only checks that a session cookie is
 * *present* — it cannot verify the signature, because the JWT secret lives in the
 * backend and never reaches this process. Anyone can set a cookie of that name and
 * walk past this check; they will simply hit 401s from the API and see empty screens.
 * Every real access decision stays in FastAPI, where the cookie is verified and rows
 * are scoped by user id.
 */
const SESSION_COOKIE = process.env.NEXT_PUBLIC_SESSION_COOKIE_NAME ?? "recall_session";

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  // When the API is on another host -- a tunnel, or a separate api.* domain -- the session
  // cookie belongs to that host and this process cannot see it. Denying on "no cookie"
  // would then lock out every signed-in user, so the gate stands down and SessionGuard
  // does the check client-side, where the cookie is actually reachable.
  if (apiIsCrossOrigin(request.nextUrl.hostname)) {
    return NextResponse.next();
  }

  const hasSession = request.cookies.has(SESSION_COOKIE);

  if (!hasSession && isProtectedPath(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/sign-in";
    url.search = "";
    // Round-trips the user back where they were aiming. Built from the request's own
    // pathname, so it is always same-origin and cannot smuggle an external URL.
    url.searchParams.set("next", `${pathname}${search}`);
    return NextResponse.redirect(url);
  }

  if (hasSession && (AUTH_PAGES as readonly string[]).includes(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/vault";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
  ],
};
