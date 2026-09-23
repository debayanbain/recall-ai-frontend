import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { apiIsCrossOrigin, isProtectedPath } from "@/lib/protected-routes";

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

/**
 * Marker the API sets alongside the session, living as long as the refresh token.
 *
 * Gating on the access cookie alone made the app throw people out ~15 minutes after they
 * signed in: that cookie carries `Max-Age=15m`, so the browser deletes it, and the next
 * full page load arrived here looking exactly like a signed-out visitor. The refresh
 * cookie that would have fixed it is scoped to `Path=/api/v1/auth`, so a navigation never
 * carries it and this process cannot see it even in principle. The redirect then fired
 * before any JavaScript ran, so the silent refresh never got its chance.
 *
 * It holds no token and authorises nothing -- same as the check below, it only decides
 * which page to show first.
 */
const SESSION_HINT_COOKIE =
  process.env.NEXT_PUBLIC_SESSION_HINT_COOKIE_NAME ?? "recall_signed_in";

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  // When the API is on another host -- a tunnel, or a separate api.* domain -- the session
  // cookie belongs to that host and this process cannot see it. Denying on "no cookie"
  // would then lock out every signed-in user, so the gate stands down and SessionGuard
  // does the check client-side, where the cookie is actually reachable.
  if (apiIsCrossOrigin(request.nextUrl.hostname)) {
    return NextResponse.next();
  }

  // Either cookie means "this browser can probably reach a session" -- the access
  // cookie while it is alive, the hint for the days after it expires.
  const hasSession =
    request.cookies.has(SESSION_COOKIE) || request.cookies.has(SESSION_HINT_COOKIE);

  if (!hasSession && isProtectedPath(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/sign-in";
    url.search = "";
    // Round-trips the user back where they were aiming. Built from the request's own
    // pathname, so it is always same-origin and cannot smuggle an external URL.
    url.searchParams.set("next", `${pathname}${search}`);
    return NextResponse.redirect(url);
  }

  // Deliberately NOT the mirror image: a signed-in user is *not* bounced off /sign-in
  // here. This process can only see that a cookie exists, never that it verifies, and an
  // access cookie that has outlived its JWT is indistinguishable from a live one. Sending
  // that user to /vault means SessionGuard reads the 401, replaces back to /sign-in, and
  // this gate throws them at /vault again -- an unbreakable loop where the header offers
  // a "Sign in" link that appears to do nothing. `AlreadySignedIn` on the auth pages does
  // this redirect instead, from the one place that actually knows the answer.

  return NextResponse.next();
}

/**
 * `/api/*`, `/health` and `/ready` are left out: they are rewritten straight to FastAPI,
 * which does the real authorisation, so running this gate on them bought nothing and cost
 * an extra invocation on every call -- including the polling while an item processes.
 * Anchored (`api(?:/|$)`, `health$`) so a page such as `/apiary` or `/healthy` is still gated.
 */
export const config = {
  matcher: [
    "/((?!_next|api(?:/|$)|health$|ready$|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
  ],
};
