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
  },
  vault: {
    all: ["vault"] as const,
    list: (limit: number, offset: number) => ["vault", "list", { limit, offset }] as const,
    /** Paged, chronological read for the timeline. Separate from `list` because it is an
     *  infinite query — one cache entry that grows — not a page-at-a-time one. */
    timeline: (pageSize: number) => ["vault", "timeline", { pageSize }] as const,
    detail: (id: string) => ["vault", "detail", id] as const,
    file: (id: string) => ["vault", "file", id] as const,
    limits: ["vault", "limits"] as const,
  },
} as const;
