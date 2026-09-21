/**
 * Page sizes the vault is read with.
 *
 * Plain module rather than part of `hooks/use-vault.ts`: that file is `"use client"`, and
 * the home page is a server component. A constant is importable across that boundary, but
 * routing it through a client module drags the whole module in for a number.
 */

/**
 * How many memories the home page loads.
 *
 * Two components read that page's query — the feed and the stat tiles — and
 * `useVaultItems` keys its cache by `limit`. Two different numbers meant two cache
 * entries and two requests for the same rows, each a full round trip to a database in
 * another region. It also meant the tiles said 21 while the feed said 12, which is the
 * mismatch this constant exists to make impossible: one number, one query, one answer.
 */
export const HOME_FEED_LIMIT = 12;

/** The full listing at `/vault`, and the page size the trash is read with. */
export const VAULT_PAGE_LIMIT = 60;
