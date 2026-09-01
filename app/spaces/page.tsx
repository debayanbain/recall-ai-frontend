import type { Metadata } from "next";
import { SpacesView } from "./spaces-view";

export const metadata: Metadata = { title: "Spaces · RecallAI" };

export default function Spaces() {
  return <SpacesView />;
}
