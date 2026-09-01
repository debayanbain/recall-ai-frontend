import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { fetchPublicSpace } from "@/lib/public-api";
import { PublicSpaceView } from "./public-space";

type Params = { slug: string };

/**
 * Rendered on the server, unlike every other page here.
 *
 * A shared Space exists to be opened by people who are not signed in and to be readable
 * by a crawler, so the content has to be in the HTML. The endpoint behind it is the only
 * unauthenticated one in the API, which is what makes a server-side fetch safe: there is
 * no session cookie to lose. See `lib/public-api.ts`.
 *
 * No `generateStaticParams`: slugs belong to real Spaces created after the build, and
 * prerendering a fixed list would 404 every one of them.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { slug } = await params;
  const space = await fetchPublicSpace(slug);
  if (!space) return { title: "Space not found · RecallAI" };
  return {
    title: `${space.name} · Shared on RecallAI`,
    description:
      space.ai_overview ?? space.description ?? "A shared knowledge space on RecallAI.",
  };
}

export default async function PublicShare({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const space = await fetchPublicSpace(slug);
  // 404 covers "no such slug", "not published" and "published then made private alike" --
  // the API answers all three the same way, and so should the page.
  if (!space) notFound();

  return <PublicSpaceView space={space} />;
}
