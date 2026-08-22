/**
 * Fixed copy for the coarse error codes the backend appends to /sign-in.
 *
 * The lookup is exhaustive by design: the query string is attacker-controllable, so an
 * unknown code falls back to generic copy instead of being rendered. That keeps a
 * crafted `?error=` from putting arbitrary text on the page.
 *
 * Lives in its own (non-"use client") module so the sign-in server component can call
 * it directly — a function exported from a client module is only callable as a
 * component or prop, never invoked on the server.
 */
const ERROR_COPY: Record<string, string> = {
  access_denied: "Sign-in was cancelled. Choose a provider to try again.",
  invalid_state:
    "That sign-in link expired or was opened in a different browser. Start again below.",
  exchange_failed: "We couldn't reach that provider. Try again, or use another one.",
  server_error:
    "You signed in with the provider, but we couldn't finish setting up your account. "
    + "Try again in a moment.",
};

export function oauthErrorMessage(code: string | null | undefined): string | null {
  if (!code) return null;
  return ERROR_COPY[code] ?? "Sign-in didn't complete. Try again below.";
}
