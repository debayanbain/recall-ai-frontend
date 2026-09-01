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

**The vault and Spaces are on the real API; timeline, chat and connections are still
mock.** `/vault` renders
`useVaultItems()` through `lib/vault-adapter.ts`, which maps a `VaultItem` onto the `Memory`
shape the cards already speak — the enums differ on purpose (the API discriminates by *source*,
the UI by *medium*), so the mapping is lossy. `MemoryGrid` takes an optional `items` prop and
falls back to the local store when it is omitted, which is what timeline and chat still
use. Spaces and the public share page pass real items through the same adapter. A fresh item legitimately has no summary until the worker runs, so the adapter
supplies status-aware placeholder copy.

**Every kind in the capture modal reaches the real API**, and which fields a kind shows is
decided by what the API can store for it — offering a field nothing reads from is offering
to write into a hole. `link` → `POST /vault/save` (its optional second field is the
*title*, since the body is whatever the extractor reads); `note` → `/vault/note`, where the
title stands in as `content` when the details box is empty, because `content` is required
server-side and a title-only note is a real thing someone writes; `pdf` → `/vault/upload`
via `components/file-picker.tsx`, whose size cap and extension list come from
`GET /vault/uploads/limits` rather than a constant that drifts from the backend allowlist;
`voice` → `/vault/voice`. **There is one upload flow, not two** — the old `PdfDrop` dialog
was a second one whose copy still promised the file was not stored, which stopped being
true when uploads started going to B2.

`lib/store.ts`'s `addMemory` is now written to by **nothing** — `/editor` posts to
`/vault/note` like everything else. Anything calling it is writing to a store the vault
never sees; the store's remaining job is favourites and the mock feeds that
spaces/timeline/chat/share still render.

**Anything that shows processing state must poll.** A capture is enriched out of band, so
`useVaultItems` and `useVaultItem` both refetch while any item is `pending`/`processing`
and stop the moment it lands. The detail query was missing that and it was the worse
omission of the two: the list is glanced at, the detail page is *watched* — it showed
"Queued" and, after a re-transcription, "Transcribing" indefinitely while the worker had
finished in fifteen seconds. Nothing was wrong on the server and nothing said so.

**A failed capture is a state the page explains, not a card with an empty summary.**
`components/processing-state.tsx` sits above the AI summary and **renders nothing when
the item completed** — the retry is an escape hatch from a bad state, not a feature of a
good one, and a reprocess button on a healthy memory invites spending the whole AI
pipeline again to replace a result with itself. `pending`/`processing` get a quiet line
and no button (the server refuses a second request anyway). `failed` and `skipped` get an
explanation plus `useReprocessItem()`; the stored `processing_error` is shown in a
collapsed `<details>` and is safe to render because credential-shaped text is stripped
before it is stored, not at render time.

**Client state → zustand** (`lib/store.ts` for memories, `lib/stores/ui-store.ts` for view
prefs). Both persist with `skipHydration: true` and are rehydrated by `useHydrateStores()` inside
`Providers` — rehydrating at module scope makes the first client render disagree with the SSR
HTML and React discards the tree. Never persist ephemeral overlay state (open modals).

**AI label vs tags vs highlights.** `ai_label` is one distinctive line per memory — it answers
"which one is this" in a grid where every card is tagged `[jobs]`, so it renders as the eyebrow
above the title on both the card and the detail page. Tags stay topical and are allowed to
collide. `ai_highlights` are sentences the backend copied **verbatim** out of `content`;
`components/highlighted-text.tsx` locates each one and wraps it in a real `<mark>` so assistive
tech announces the emphasis, never `dangerouslySetInnerHTML` — the text is whatever was on
someone's Facebook post. The matcher is whitespace-tolerant on purpose (it joins the span's
tokens with `[\s\u200B-\u200D\uFEFF]+`): captions wrap mid-sentence and are padded with
zero-width characters, so an exact `indexOf` finds nothing on precisely the content this
feature exists for. A span that still cannot be located is skipped, never approximated —
a mark in the wrong place reads as the author having said something they did not.

**Editing a memory's body is EditorJS, and it is the one place text goes *back* into the
DOM.** The Edit button on `/memory/[id]` swaps the Full content block for
`components/content-editor.tsx`, which mounts EditorJS into a div React never renders
into (create in an effect, `destroy()` on unmount — it owns that node).

**A saved edit is rendered from the block document, not from `content`.** The API stores
both: `content` is the flat projection for search and highlights, and
`item_metadata.editor_doc` carries the structure plus a small allowlist of inline markup
(`b i u mark code a[href] br`). `components/rich-content.tsx` renders the document and
`components/rich-text.tsx` renders the inline subset — as React elements built from tag
names it recognises, never `dangerouslySetInnerHTML`. Rendering `content` instead is
exactly why a heading someone applied came back looking like an ordinary paragraph.
`HighlightedText` remains the path for an item nobody has edited.

`lib/editor-doc.ts` is the bridge and it **re-applies the allowlist client-side**
(`sanitizeInline`) before anything reaches EditorJS, which does set innerHTML. The
backend sanitizing is not treated as sufficient on its own — `editor_doc` is a JSONB
column, and the browser has to be the one deciding what it will render. Two carve-outs:
an item with only plain `content` is escaped instead (a scraped page may contain
anything), and a `code` block is passed through verbatim, because the tool assigns it to
a textarea's `.value` and sanitizing would eat the angle brackets that *are* the content.
On the way out only `blocks` are sent; `content`, the stored document and the surviving
highlights are all derived by the backend. The Edit button is hidden while
`processing_status` is `pending`/`processing`: the worker writes `content` when it
finishes and would overwrite anything typed meanwhile.

Two things about the editor component are load-bearing and both were bugs first:

- **The holder must be visible when EditorJS is constructed.** It measures its container
  at init to place the block toolbar and to pick its narrow layout; built inside a
  `display: none` element it measures zero and `.ce-toolbar` stays `display: none` with
  `top: auto` forever — the tools never appear, so the editor reads as broken and a Save
  writes the seeded text straight back. The "Loading the editor…" line therefore sits
  *above* an already-mounted holder instead of replacing it. For the same reason
  `globals.css` must not override `.ce-block__content` / `.ce-toolbar__content` widths:
  EditorJS positions the plus/settings buttons from those, and forcing full width pushes
  them outside the card.
- **Toolbar buttons must `preventDefault()` on mousedown.** Otherwise the button takes
  focus, the caret leaves the contenteditable, `blocks.getCurrentBlockIndex()` answers
  `-1`, and every tool appends an empty block at the end instead of formatting the block
  the user was in. Because the floating toolbar is unreliable, the formatting controls
  are a persistent row at the top of the editor rather than EditorJS's hover affordance.

**The banner uses the source's own still when there is one.** `components/memory-banner.tsx`
backs the block at the top of a memory card and of `/memory/[id]` with `thumbnail_url`
(a Facebook reel's `og:image`, an Instagram post's `displayUrl`, mapped to `Memory.cover`
by `lib/vault-adapter.ts`), and lays the memory's accent gradient over it as a wash that
fades out downward — solid where the type badge and hover actions sit, gone by the bottom
where the picture is. It is `mask-image` over the accent classes rather than a hardcoded
overlay colour, so the wash follows whatever accent the item drew. With no still, the
accent fills the block with the dot texture exactly as before.

Three things there are deliberate:

- **A plain `<img>`, not `next/image`.** These URLs are signed and expiring and the CDN
  host varies per node (`scontent.fixb5-1.fna.fbcdn.net`), so there is nothing stable to
  put in a remote pattern and nothing worth caching. `referrerPolicy="no-referrer"` keeps
  the memory's URL out of the request, and Meta's CDN tends to refuse a referrer anyway.
- **`onError` is not sufficient on its own.** The markup is server-rendered, so the browser
  begins fetching before React hydrates and a failure in that window is never replayed onto
  the handler — which leaves a permanently blank frame. A mount effect reconciles it:
  `complete && naturalWidth === 0` is an image that already failed.
- **Only `http(s)` reaches `src`.** `thumbnail_url` comes from a scraped meta tag, so a
  `javascript:` or `data:` value is treated as "no cover" rather than handed to the browser.

## Spaces

**Spaces are real; the AI half of them is not yet.** `/spaces`, `/spaces/[id]`,
`/share/[slug]`, the pinned-spaces sidebar group and the palette's Spaces group all read
`hooks/use-spaces.ts`. The Overview, Connections and Ask AI panels render **honest empty
states** rather than placeholder content — the backend has no proposal, connection graph
or space-scoped ask yet, and a mock panel next to real data is how a demo becomes a
promise. `lib/mock-data.ts`'s `spaces` fixture survives for one consumer only, `/mobile`,
which is a static design reference; its shape deliberately does not match `Space`.

- **`accent` is a key, not a class.** The API sends `"violet"`; `lib/space-accent.ts` maps
  it to gradient classes, written out in full because Tailwind scans source text for
  literals and `from-${c}-200` never reaches the stylesheet. An unset or unrecognised
  accent falls back to a hash of the id, so a wall of unstyled spaces still reads as
  distinct cards. Same hash trick as `lib/vault-adapter.ts` uses for card heights, and for
  the same reason: `Math.random()` would disagree with the server HTML and React would
  throw away the tree.
- **`connection_count: null` renders as nothing, never as `0`.** "No connections" and "not
  measured" are different claims and only one of them is currently true. The same applies
  to collaborators: the count appears only when there is more than one member.
- **`/share/[slug]` is the one page fetched on the server** (`lib/public-api.ts`,
  `import "server-only"`). It exists to be opened by strangers and read by crawlers, so
  the content has to be in the HTML — and the endpoint behind it is the only
  unauthenticated one in the API, which is what makes that safe: there is no session
  cookie to lose to a cross-origin hop. Everything else still goes through `lib/api.ts`.
  The public view is deliberately smaller than the owner's: no Ask AI (a stranger must not
  spend the owner's model budget), no members, no navigation into `/memory/{id}`, which
  would 404 for them anyway. `MemoryCard` takes `readOnly` for exactly that.
- **Writes to `/api/v1/spaces/*` are Origin-checked server-side.** Browsing
  `http://localhost:3000` while the backend's `CORS_ORIGINS` is a tunnel gets a **403 on
  every space mutation** while reads and the whole vault keep working. That is the
  backend guard doing its job (auth and integrations behave the same way) — browse the
  tunnel URL, or add localhost to `CORS_ORIGINS`.

**Selection mode** (`lib/stores/selection-store.ts`) is zustand and **not persisted**, for
the reason the UI store gives for modals: a selection restored a day later would greet the
user with a bulk action bar naming five memories they do not remember choosing. Three
things about it are load-bearing:

- **The card's overlay has three modes.** Not picking: the whole-card `<Link>`. Picking: a
  real `<input type="checkbox">` inside a full-card `<label>`, so it is announced,
  focusable and toggled by Space — and the link is *not rendered*, because a card that
  navigates while you are choosing is a card you cannot choose. Read-only: neither.
- **The bar replaces the bottom nav on a phone** rather than stacking above it
  (`AppShell` hides `BottomNav` while `selecting`). Two fixed bars plus the raised capture
  button on a 375px screen leaves about four fingers of list. Escape exits; focus moves to
  the bar the first time it appears and not on every subsequent pick.
- **Selection is disabled while `duplicateForDensity` is padding the mock library**, which
  repeats items under a `${id}-${i}` key — one tap would select two cards and the count
  would be a lie.

**"Add to space" must work with the model switched off.** The proposal block is an
enhancement at the top of `components/add-to-space.tsx`; the space list and the manual
create form below it are the feature. Checkmarks are shown for a *single* memory only
(via `GET /spaces/for-item/{id}`) — knowing whether a space already holds all of a
twenty-item selection would be twenty lookups, and adding is idempotent anyway, so the
multi-select path adds and reports `added`/`skipped` instead of claiming something it has
not checked.

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
