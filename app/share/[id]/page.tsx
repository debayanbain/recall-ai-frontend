import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { spaces } from "@/lib/mock-data";
import { PublicSpaceView } from "./public-space";

type Params = { id: string };

export function generateStaticParams(): Params[] {
  return spaces.map((s) => ({ id: s.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { id } = await params;
  const space = spaces.find((s) => s.id === id);
  return {
    title: `${space?.title ?? "Space"} · Shared on RecallAI`,
    description: space?.summary ?? "A shared knowledge space on RecallAI.",
  };
}

export default async function PublicShare({ params }: { params: Promise<Params> }) {
  const { id } = await params;
  const space = spaces.find((s) => s.id === id);
  if (!space) notFound();

  return <PublicSpaceView space={space} />;
}
