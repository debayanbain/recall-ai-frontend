<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Data & auth conventions

Auth is **backend-owned**, not Clerk (removed). The FastAPI service at `NEXT_PUBLIC_API_URL`
sets an HttpOnly `recall_session` cookie; nothing auth-related is readable from JS.

- **Browsing through a tunnel needs `allowedDevOrigins`** (also `next.config.ts`). Next blocks
  cross-origin requests to `/_next/*` and the HMR socket, so without it every chunk 403s and
  HMR retries forever — which reads as "the API keeps calling and never responds" even though
  no API call is involved. Check the dev log for `Blocked cross-origin request` before
  suspecting the backend.
- **The API is same-origin, proxied by `next.config.ts`.** `NEXT_PUBLIC_API_URL` is empty and
  requests go to `/api/v1/*` on this app's own origin; Next rewrites them to `BACKEND_ORIGIN`.
  Pointing the browser straight at a different API host makes the session cookie third-party,
  and Chrome strips those — the login succeeds, then every request arrives unauthenticated and
  the app loops back to sign-in. No SameSite value fixes it; the cross-site hop is the problem.
- `lib/api.ts` is the only place that talks to the API. Every call goes out with
  `credentials: "include"`; never build a `fetch` to the backend by hand. It also sends
  `ngrok-skip-browser-warning`, because ngrok's free tier answers browser-looking requests
  with an HTML interstitial instead of proxying them — which surfaces as a JSON parse error,
  not as anything resembling "your tunnel is showing a warning page". Top-level navigations
  (the OAuth buttons) cannot send headers, so those still hit the interstitial once per
  browser; `TUNNEL=cloudflared make dev-tunnel` avoids it entirely.
- `proxy.ts` (Next 16's renamed middleware) only checks that the cookie *exists*. It cannot
  verify the signature — the JWT secret is server-side. It is a redirect convenience, never
  authorization. Real checks live in FastAPI.
- **When the API is on another host, the proxy gate stands down** and `SessionGuard` takes
  over client-side. The session cookie belongs to the API's host, so behind a tunnel (or a
  separate `api.*` domain) the Next server cannot see it and would otherwise redirect every
  signed-in user straight back to `/sign-in`. Both read the same list from
  `lib/protected-routes.ts`; add new protected routes there, not in either consumer.
- Sign-in is `/sign-in` + `/sign-up`, rendering `<OAuthButtons />`, which reads
  `GET /auth/providers` so an unconfigured provider is never offered. Clicking does a full-page
  `window.location.assign` to the backend — not a fetch — because the provider owns the address
  bar for its consent screen.
- Backend failures come back as `?error=<code>` on `/sign-in`. Map them through
  `lib/oauth-errors.ts`; never render the raw query value.

**Server state → TanStack Query** (`hooks/use-auth.ts`, `hooks/use-vault.ts`), keyed through
`lib/query-keys.ts`. `useSession()` resolves a 401 to `null` rather than throwing, since signed
out is an answer, not a failure.

**The vault is on the real API; everything else is still mock.** `/vault` renders
`useVaultItems()` through `lib/vault-adapter.ts`, which maps a `VaultItem` onto the `Memory`
shape the cards already speak — the enums differ on purpose (the API discriminates by *source*,
the UI by *medium*), so the mapping is lossy. `MemoryGrid` takes an optional `items` prop and
falls back to the local store when it is omitted, which is what spaces/timeline/chat/share
still use. Capture posts to `/vault/save` or `/vault/note`; a fresh item legitimately has no
summary until the worker runs, so the adapter supplies status-aware placeholder copy.

**Client state → zustand** (`lib/store.ts` for memories, `lib/stores/ui-store.ts` for view
prefs). Both persist with `skipHydration: true` and are rehydrated by `useHydrateStores()` inside
`Providers` — rehydrating at module scope makes the first client render disagree with the SSR
HTML and React discards the tree. Never persist ephemeral overlay state (open modals).

## Connected accounts (integrations)

Instagram appears in **both** places, and they are different integrations:

- **Sign-in** — an Instagram button in `<OAuthButtons />`, driven by `/auth/providers` like
  any other provider. Uses Instagram Login and the Instagram App ID.
- **Connection** — `/settings` links an Instagram Business account to an already-authenticated
  user via `/api/v1/integrations/instagram/*`, through Facebook, for reading their media.

A user can do either or both; connecting is what enables ingestion.

- `hooks/use-integrations.ts` owns the queries; `instagramConnectUrl()` is a full-page
  navigation, same reason as the OAuth buttons — Facebook needs the address bar.
- Failures come back as `/settings?instagram=error&reason=<code>`. Map through
  `lib/integration-errors.ts`; never render the raw query value. Every message names a
  recovery path, because most failures here are fixable by the user (wrong account type,
  declined permission).
- Disconnect is destructive and only reversible via another Facebook round trip, so it
  sits behind a confirmation dialog.
