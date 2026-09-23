import type { NextConfig } from "next";

/**
 * Where the FastAPI backend actually listens. Server-side only — never inlined into the
 * client bundle, because the browser is meant to reach the API through this app's own
 * origin, not directly.
 */
const BACKEND_ORIGIN = process.env.BACKEND_ORIGIN ?? "http://localhost:8000";

/**
 * Hosts allowed to request dev-only assets (`/_next/*`, the HMR socket).
 *
 * Next blocks these cross-origin by default. When the app is browsed through a tunnel,
 * every chunk request comes from the tunnel host and gets refused with a 403 while the
 * HMR websocket 404s -- which looks like "the API keeps retrying and never answers", even
 * though no API call is involved. Wildcards cover a tunnel whose subdomain changes.
 *
 * Development only; Next ignores this in production builds.
 */
const DEV_ORIGINS = [
  "*.ngrok-free.dev",
  "*.ngrok-free.app",
  "*.ngrok.app",
  "*.trycloudflare.com",
  ...(process.env.DEV_ORIGIN ? [process.env.DEV_ORIGIN] : []),
];

/**
 * `next dev` only ever prints the address it bound to, because a tunnel is a separate
 * process it knows nothing about. When the app is actually reached through one, the
 * localhost line is actively misleading: OAuth callbacks are registered against the
 * tunnel, so opening localhost produces `invalid_state` on every sign-in.
 *
 * next.config.ts is evaluated at startup, so printing here puts the real entry point in
 * the same banner. Dev only — a production build has no tunnel and no need.
 */
if (process.env.NODE_ENV !== "production" && process.env.APP_ORIGIN) {
  const origin = process.env.APP_ORIGIN.replace(/\/$/, "");
  console.log(
    [
      "",
      `  ▲ RecallAI is served at  ${origin}`,
      "    Open that, not localhost — OAuth callbacks are registered against it.",
      "",
    ].join("\n"),
  );
}

const nextConfig: NextConfig = {
  /**
   * Emits .next/standalone/server.js -- a server carrying only the modules the app
   * actually imports, instead of the whole node_modules tree. It is what the Docker
   * image runs; `next dev` and `next start` are unaffected.
   *
   * Off on Vercel, which packages functions itself and never runs server.js. Next 16.3 with
   * Turbopack also stops writing `.next/next-server.js.nft.json` when Vercel's adapter is
   * present, and the standalone step then fails the build with ENOENT (vercel/next.js#96646,
   * fixed in 16.4). `VERCEL` is set on every Vercel build.
   */
  output: process.env.VERCEL ? undefined : "standalone",

  allowedDevOrigins: DEV_ORIGINS,

  experimental: {
    // Next buffers a proxied request body in memory, defaulting to 10MB — and on
    // exceeding it the body is TRUNCATED, not rejected. Our PDF cap is also 10MB, so at
    // the boundary FastAPI would receive a half-file and report "this PDF is corrupt"
    // instead of "too big". Raising the proxy above the app's limit keeps FastAPI the
    // single place that decides, and keeps its error message the accurate one.
    proxyClientMaxBodySize: "16mb",
  },

  /**
   * Same-origin proxy for the API.
   *
   * Modern Chrome blocks third-party cookies, so a browser on this origin talking to an
   * API on a *different* host simply will not send the session cookie — the request
   * arrives unauthenticated and every page bounces back to sign-in. No combination of
   * SameSite/Secure fixes that; the cross-site hop itself is the problem.
   *
   * Proxying /api through Next makes the API same-origin: the cookie is first-party, no
   * CORS preflights, and no reliance on a cookie policy browsers are actively removing.
   * Set NEXT_PUBLIC_API_URL to "" (or leave it unset in that mode) so `lib/api.ts` emits
   * relative URLs that land here.
   */
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${BACKEND_ORIGIN}/api/:path*`,
      },
      // `/health` and `/ready` sit at the API's root, not under /api/v1, because load
      // balancers and uptime checks expect them there. Without these two entries they
      // are unreachable from the public URL — Next answers its own 404 and the request
      // never reaches FastAPI at all.
      { source: "/health", destination: `${BACKEND_ORIGIN}/health` },
      { source: "/ready", destination: `${BACKEND_ORIGIN}/ready` },
    ];
  },
};

export default nextConfig;
