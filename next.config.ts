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

const nextConfig: NextConfig = {
  allowedDevOrigins: DEV_ORIGINS,

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
    ];
  },
};

export default nextConfig;
