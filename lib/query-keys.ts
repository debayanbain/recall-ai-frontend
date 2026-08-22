/** Central query-key registry, so invalidation never has to guess a key shape. */
export const queryKeys = {
  session: ["auth", "session"] as const,
  providers: ["auth", "providers"] as const,
  integrations: {
    instagram: ["integrations", "instagram"] as const,
  },
  vault: {
    all: ["vault"] as const,
    list: (limit: number, offset: number) => ["vault", "list", { limit, offset }] as const,
    detail: (id: string) => ["vault", "detail", id] as const,
  },
} as const;
