import type { SessionUser } from "@/lib/types";

/** Backend placeholder domain for providers that never release a real address. */
const PLACEHOLDER_DOMAIN = "@users.noreply.recall.invalid";

const PROVIDER_LABELS: Record<string, string> = {
  google: "Google",
  facebook: "Facebook",
  instagram: "Instagram",
};

/**
 * What to show under a user's name.
 *
 * X never hands back an email and Facebook omits it for phone-only accounts, so those
 * users carry a synthetic address. Printing it verbatim looks like a bug and hints at
 * internals, so fall back to the provider they signed in with.
 */
export function displayEmail(user: SessionUser): string {
  if (!user.email.endsWith(PLACEHOLDER_DOMAIN)) return user.email;
  const provider = user.linked_providers[0];
  return provider ? `Signed in with ${PROVIDER_LABELS[provider] ?? provider}` : "";
}
