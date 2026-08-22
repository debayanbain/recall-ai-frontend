/**
 * Copy for the `?reason=` codes the Instagram callback appends to /settings.
 *
 * Same discipline as lib/oauth-errors: the query string is attacker-controllable, so an
 * unrecognised code falls back to fixed copy rather than being rendered. Each message
 * names a recovery path, because "it failed" without a next step is not an error message.
 */
const REASON_COPY: Record<string, string> = {
  access_denied: "You cancelled before granting access. Nothing was connected.",
  invalid_state:
    "That connection link expired or was opened in a different browser. Start again from this page.",
  permissions_declined:
    "One of the requested permissions was turned off on the Facebook screen. Connect again and leave all of them enabled.",
  no_instagram_account:
    "We couldn't find an Instagram Business or Creator account linked to a Facebook Page you manage. Convert your account in the Instagram app, link it to a Page, then try again.",
  exchange_failed: "Facebook didn't complete the handshake. Try connecting again.",
  graph_failed: "We couldn't read your accounts from Facebook. Try again in a moment.",
  server_error: "Facebook approved the connection, but we couldn't save it. Try again.",
};

export function instagramErrorMessage(code: string | null | undefined): string | null {
  if (!code) return null;
  return REASON_COPY[code] ?? "The connection didn't complete. Try again below.";
}
