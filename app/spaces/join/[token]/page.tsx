import type { Metadata } from "next";
import { JoinSpaceView } from "./join-space";

export const metadata: Metadata = { title: "Join a space · RecallAI" };

export default function JoinSpace({ params }: { params: Promise<{ token: string }> }) {
  return <JoinSpaceView params={params} />;
}
