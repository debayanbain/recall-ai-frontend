import type { Metadata } from "next";
import { SpaceDetailView } from "./space-detail";

/**
 * Static metadata, like `/memory/[id]`.
 *
 * A per-Space title would need a server-side fetch carrying the session cookie, and the
 * name of a private Space has no business in a `<title>` that a share sheet or a browser
 * history sync might carry off the page.
 */
export const metadata: Metadata = { title: "Space · RecallAI" };

export default function SpaceDetail({ params }: { params: Promise<{ id: string }> }) {
  return <SpaceDetailView params={params} />;
}
