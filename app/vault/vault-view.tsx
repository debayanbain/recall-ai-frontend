"use client";

import { MemoryFeed } from "@/components/memory-feed";

export function VaultView() {
  return <MemoryFeed showViewToggle limit={60} />;
}
