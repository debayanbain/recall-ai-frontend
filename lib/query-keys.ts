/** Central query-key registry, so invalidation never has to guess a key shape. */
export const queryKeys = {
  session: ["auth", "session"] as const,
  providers: ["auth", "providers"] as const,
  integrations: {
    instagram: ["integrations", "instagram"] as const,
    telegram: ["integrations", "telegram"] as const,
  },
  spaces: {
    all: ["spaces"] as const,
    list: ["spaces", "list"] as const,
    detail: (id: string) => ["spaces", "detail", id] as const,
    /** Which of my Spaces already hold this memory — drives the card's + menu. */
    forItem: (itemId: string) => ["spaces", "for-item", itemId] as const,
    /** Your own connections between memories in one space. */
    connections: (id: string) => ["spaces", "connections", id] as const,
  },
  connections: {
    all: ["connections"] as const,
    /** One memory's neighbourhood. */
    forItem: (itemId: string) => ["connections", "for-item", itemId] as const,
    /** The same neighbourhood with the undecided edges in it. A separate entry rather
     *  than a flag on `forItem`: the two answers differ, and one cache key holding both
     *  would serve whichever was fetched last to a caller that asked for the other. */
    forItemSuggested: (itemId: string) =>
      ["connections", "for-item", itemId, "suggested"] as const,
    /** The undecided edges, which are per *user* and not per memory. */
    suggestions: ["connections", "suggestions"] as const,
    /** The most-connected memories — the fallback when the canvas has nothing to draw. */
    hubs: ["connections", "hubs"] as const,
    /** The whole vault as nodes and edges. What the canvas is drawn from. */
    graph: (includeDismissed: boolean) =>
      ["connections", "graph", { includeDismissed }] as const,
  },
  vault: {
    all: ["vault"] as const,
    list: (limit: number, offset: number) => ["vault", "list", { limit, offset }] as const,
    /** Paged, chronological read for the timeline. Separate from `list` because it is an
     *  infinite query — one cache entry that grows — not a page-at-a-time one. */
    timeline: (pageSize: number) => ["vault", "timeline", { pageSize }] as const,
    /** Deleted memories that can still come back. Under `vault` so any vault write —
     *  a delete, a restore, a purge — invalidates it along with the listings. */
    trash: (limit: number, offset: number) => ["vault", "trash", { limit, offset }] as const,
    detail: (id: string) => ["vault", "detail", id] as const,
    file: (id: string) => ["vault", "file", id] as const,
    limits: ["vault", "limits"] as const,
  },
} as const;
