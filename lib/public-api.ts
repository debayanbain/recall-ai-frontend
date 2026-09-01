import "server-only";

import type { PublicSpace } from "@/lib/types";

/**
 * The one server-side call to the API, for the one unauthenticated endpoint.
 *
 * `lib/api.ts` is otherwise the only thing that talks to the backend, and that rule
 * exists because of the *session cookie*: a browser reaching a different host would have
 * its cookie stripped, so every request must go same-origin through the Next rewrite.
 * None of that applies here. `GET /public/{slug}` carries no credential, and a shared
 * Space page is the one route whose whole purpose is to be readable by a crawler — which
 * means it has to render on the server, with the content in the HTML.
 *
 * Server-only (`import "server-only"` makes importing this from a client component a
 * build error), so `BACKEND_ORIGIN` never reaches the browser bundle.
 */
const BACKEND_ORIGIN = (process.env.BACKEND_ORIGIN ?? "http://localhost:8000").replace(/\/$/, "");

export async function fetchPublicSpace(slug: string): Promise<PublicSpace | null> {
  let response: Response;
  try {
    response = await fetch(`${BACKEND_ORIGIN}/api/v1/public/${encodeURIComponent(slug)}`, {
      headers: { Accept: "application/json" },
      // A published Space changes when its owner adds a memory, so a long cache would
      // serve a stale page for hours. A minute is enough to absorb a link going round.
      next: { revalidate: 60 },
    });
  } catch {
    // The API being unreachable is not "this Space does not exist" — but the page has
    // nothing to render either way, and a 404 is the honest thing to show a visitor.
    return null;
  }
  if (!response.ok) return null;
  return (await response.json()) as PublicSpace;
}
