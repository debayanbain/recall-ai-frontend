/**
 * Thin fetch wrapper around the FastAPI backend.
 *
 * Auth is a HttpOnly `recall_session` cookie owned by the backend, so every request
 * goes out with `credentials: "include"` and the browser attaches it. Nothing
 * auth-related is ever read from or written to JS-visible storage — that is the whole
 * point of an HttpOnly cookie, and mirroring the token into localStorage would hand it
 * to any XSS on the page.
 */

/**
 * Backend origin, or "" to call this app's own origin.
 *
 * Empty is the preferred setup: `next.config.ts` proxies /api to the backend, so the API
 * is same-origin and the session cookie is first-party. An absolute origin here makes
 * every request cross-site, which modern Chrome answers by stripping the cookie.
 *
 * Never taken from user input — only from build-time config.
 */
export const API_BASE = (
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"
).replace(/\/$/, "");

export const API_PREFIX = "/api/v1";

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

export async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { body, headers, ...rest } = options;

  const response = await fetch(`${API_BASE}${API_PREFIX}${path}`, {
    ...rest,
    // Sends the session cookie cross-origin. The backend allowlists this exact origin;
    // it must never run CORS with `*` while credentials are on.
    credentials: "include",
    headers: {
      ...(body === undefined ? {} : { "Content-Type": "application/json" }),
      // Marks the request as programmatic. A cross-site form post cannot set a custom
      // header without a CORS preflight, so this is a cheap second CSRF signal on top
      // of the cookie's SameSite attribute.
      "X-Requested-With": "fetch",
      // ngrok's free tier answers browser-looking requests with an HTML interstitial
      // instead of proxying them, which arrives here as "unexpected token <" rather than
      // as an error anyone can act on. Any value of this header opts out. Harmless on
      // every other host, so it is sent unconditionally rather than sniffing the URL.
      "ngrok-skip-browser-warning": "true",
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


/**
 * Multipart upload. Separate from `apiFetch` because the browser must set
 * `Content-Type: multipart/form-data; boundary=…` itself — setting it by hand omits the
 * boundary and the server cannot parse the body.
 */
export async function apiUpload<T>(path: string, form: FormData): Promise<T> {
  const response = await fetch(`${API_BASE}${API_PREFIX}${path}`, {
    method: "POST",
    credentials: "include",
    headers: {
      "X-Requested-With": "fetch",
      "ngrok-skip-browser-warning": "true",
    },
    body: form,
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const detail = typeof payload?.detail === "string" ? payload.detail : null;
    throw new ApiError(response.status, detail ?? `Upload failed (${response.status})`);
  }
  return payload as T;
}
