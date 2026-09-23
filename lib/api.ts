/**
 * Thin fetch wrapper around the FastAPI backend.
 *
 * Auth is a HttpOnly `recall_session` cookie owned by the backend, so every request
 * goes out with `credentials: "include"` and the browser attaches it. Nothing
 * auth-related is ever read from or written to JS-visible storage — that is the whole
 * point of an HttpOnly cookie, and mirroring the token into localStorage would hand it
 * to any XSS on the page.
 *
 * A login is two cookies: `recall_session` is a 15-minute access token and
 * `recall_refresh` is a 7-day opaque token scoped to /api/v1/auth. Neither is readable
 * from here, so the only way to tell a live session from a dead one is to make the call
 * and look at the status — which is why the refresh happens on a 401 rather than on a
 * timer.
 */

/**
 * Backend origin, or "" to call this app's own origin.
 *
 * Empty is the preferred setup: `next.config.ts` proxies /api to the backend, so the API
 * is same-origin and the session cookie is first-party. An absolute origin here makes
 * every request cross-site, which modern Chrome answers by stripping the cookie.
 *
 * Never taken from user input — only from build-time config.
 *
 * Unset also means "". Defaulting to localhost baked `http://localhost:8000` into any build
 * whose host dropped or refused an empty variable (a hosting dashboard, a CI secret), and
 * every visitor's browser then called its own machine. The rewrite already defaults
 * BACKEND_ORIGIN to localhost, so local dev reaches the API either way.
 */
export const API_BASE = (process.env.NEXT_PUBLIC_API_URL ?? "").replace(/\/$/, "");

export const API_PREFIX = "/api/v1";

/** Rotating this endpoint's own 401 through the refresh path would loop forever. */
const REFRESH_PATH = "/auth/refresh";

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }

  get isUnauthorized() {
    return this.status === 401;
  }
}

type RequestOptions = Omit<RequestInit, "body"> & { body?: unknown };

/** Headers every call carries, refresh included. */
function baseHeaders(): Record<string, string> {
  return {
    // Marks the request as programmatic. A cross-site form post cannot set a custom
    // header without a CORS preflight, so this is a cheap second CSRF signal on top
    // of the cookie's SameSite attribute.
    "X-Requested-With": "fetch",
    // ngrok's free tier answers browser-looking requests with an HTML interstitial
    // instead of proxying them, which arrives here as "unexpected token <" rather than
    // as an error anyone can act on. Any value of this header opts out. Harmless on
    // every other host, so it is sent unconditionally rather than sniffing the URL.
    "ngrok-skip-browser-warning": "true",
  };
}

/**
 * The single in-flight refresh, shared by every caller.
 *
 * Refresh tokens are single-use: the backend retires the row it was handed and issues a
 * new one, and a token presented *twice* means two parties hold it, so it revokes the
 * entire family as theft. A page load fires several requests at once, so N simultaneous
 * 401s must collapse into ONE refresh — firing one per request would trip that detector
 * with the user's own tabs and log them out for good. Every caller awaits this promise
 * instead of starting its own.
 */
let inflightRefresh: Promise<boolean> | null = null;

/**
 * Latched once the backend has *refused* a refresh, so a signed-out visitor does not pay
 * a refresh round-trip on every request they make.
 *
 * Module state on purpose: signing in is a full-page OAuth redirect, which reloads the
 * bundle and clears this.
 *
 * Only an explicit refusal counts. Anything else — a network error, a 5xx, a dev server
 * mid-restart that the Next proxy surfaces as a 502 — says nothing about whether the
 * session is still good, and latching on it disables recovery for the rest of the page's
 * life: every later 401 is then reported as "signed out" while the browser is still
 * holding a valid 7-day refresh token, and the user is bounced to /sign-in for no reason.
 */
let refreshRefused = false;

/**
 * Called after a refresh that actually restored the session.
 *
 * Queries that resolved to "signed out" before the refresh landed have that answer
 * cached; without a nudge they keep it until their own staleTime elapses. Registered by
 * QueryProvider so this module stays framework-free.
 */
let onRefreshed: (() => void) | null = null;

export function setOnSessionRefreshed(fn: (() => void) | null): void {
  onRefreshed = fn;
}

/**
 * Trade the refresh cookie for a fresh access token. Resolves true when the browser is
 * now holding a usable session.
 *
 * The response body is ignored: both tokens arrive as Set-Cookie headers the page cannot
 * read, and the status is the entire signal. The backend answers every rejection —
 * unknown token, already rotated, expired, revoked family, deleted user — with the same
 * opaque 401 and clears both cookies, so there is nothing here worth branching on.
 */
async function refreshSession(): Promise<boolean> {
  if (refreshRefused) return false;

  inflightRefresh ??= (async () => {
    try {
      const response = await fetch(`${API_BASE}${API_PREFIX}${REFRESH_PATH}`, {
        method: "POST",
        credentials: "include",
        headers: baseHeaders(),
      });
      if (!response.ok) {
        // 401 (no/dead refresh cookie) and 403 (origin not allowlisted) are the only
        // final answers: the session will not come back, so stop asking. Everything else
        // stays retryable — see the note on `refreshRefused`.
        if (response.status === 401 || response.status === 403) refreshRefused = true;
        return false;
      }
      onRefreshed?.();
      return true;
    } catch {
      return false;
    } finally {
      inflightRefresh = null;
    }
  })();

  return inflightRefresh;
}

async function sendJson<T>(path: string, options: RequestOptions): Promise<T> {
  const { body, headers, ...rest } = options;

  const response = await fetch(`${API_BASE}${API_PREFIX}${path}`, {
    ...rest,
    // Sends the session cookie cross-origin. The backend allowlists this exact origin;
    // it must never run CORS with `*` while credentials are on.
    credentials: "include",
    headers: {
      ...(body === undefined ? {} : { "Content-Type": "application/json" }),
      ...baseHeaders(),
      ...headers,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  if (response.status === 204) return undefined as T;

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    // FastAPI puts the message in `detail`; anything else gets a generic string so a
    // raw upstream body is never rendered into the page.
    const detail = typeof payload?.detail === "string" ? payload.detail : null;
    throw new ApiError(response.status, detail ?? `Request failed (${response.status})`);
  }

  return payload as T;
}

/** True when a 401 is worth answering with a refresh rather than surfacing. */
function shouldRefresh(error: unknown, path: string): boolean {
  return error instanceof ApiError && error.isUnauthorized && path !== REFRESH_PATH;
}

export async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  try {
    return await sendJson<T>(path, options);
  } catch (error) {
    if (!shouldRefresh(error, path)) throw error;
    if (!(await refreshSession())) throw error;
    // Replaying is safe even for POST/DELETE: a 401 is refused at the auth boundary,
    // before the handler runs, so the first attempt changed nothing. Exactly one retry —
    // a second 401 means the fresh token was rejected too, and that is a real answer.
    return await sendJson<T>(path, options);
  }
}

/**
 * Full-page URL that starts an OAuth flow.
 *
 * Built here from a known provider id rather than followed from a server-supplied
 * absolute URL, and `next` is forced to a relative path so this helper can never be
 * turned into an open redirect. The backend re-validates it anyway.
 */
export function oauthLoginUrl(provider: string, next = "/vault"): string {
  const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/vault";
  const query = new URLSearchParams({ next: safeNext });
  return `${API_BASE}${API_PREFIX}/auth/${encodeURIComponent(provider)}/login?${query}`;
}

async function sendForm<T>(path: string, form: FormData): Promise<T> {
  const response = await fetch(`${API_BASE}${API_PREFIX}${path}`, {
    method: "POST",
    credentials: "include",
    headers: baseHeaders(),
    body: form,
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const detail = typeof payload?.detail === "string" ? payload.detail : null;
    throw new ApiError(response.status, detail ?? `Upload failed (${response.status})`);
  }
  return payload as T;
}

/**
 * Multipart upload. Separate from `apiFetch` because the browser must set
 * `Content-Type: multipart/form-data; boundary=…` itself — setting it by hand omits the
 * boundary and the server cannot parse the body.
 */
export async function apiUpload<T>(path: string, form: FormData): Promise<T> {
  try {
    return await sendForm<T>(path, form);
  } catch (error) {
    if (!shouldRefresh(error, path)) throw error;
    if (!(await refreshSession())) throw error;
    // FormData is re-serialized per request, so the same object replays cleanly.
    return await sendForm<T>(path, form);
  }
}
