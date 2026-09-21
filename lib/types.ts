/** Wire types mirroring the backend's pydantic schemas. */

export type Plan = "free" | "pro" | "team";

export type SessionUser = {
  id: string;
  email: string;
  /** False for phone-only Facebook accounts: `email` is a synthetic placeholder. */
  email_verified: boolean;
  name: string | null;
  avatar_url: string | null;
  plan: Plan;
  linked_providers: string[];
};

export type OAuthProviderInfo = {
  id: string;
  label: string;
  login_url: string;
};

export type ProvidersResponse = { providers: OAuthProviderInfo[] };

export type ProcessingStatus =
  "pending" | "processing" | "completed" | "failed" | "skipped";

export type ContentType =
  | "youtube"
  | "article"
  | "pdf"
  /** Any uploaded file that is not a PDF: docx, xlsx, csv, txt, … */
  | "document"
  | "note"
  | "instagram"
  | "facebook"
  | "tiktok"
  | "linkedin"
  | "voice"
  | "image";

export type VaultItem = {
  id: string;
  type: ContentType;
  source_url: string | null;
  title: string | null;
  summary: string | null;
  thumbnail_url: string | null;
  ai_tags: string[];
  ai_category: string | null;
  /** One distinctive line per memory. Tags are topical and collide; this does not. */
  ai_label: string | null;
  processing_status: ProcessingStatus;
  /**
   * Why the pipeline gave up. Scrubbed of anything credential-shaped before it was
   * stored, so it is safe to show its owner — a provider error carries the whole request
   * URL, and some of those URLs carry tokens.
   */
  processing_error: string | null;
  created_at: string;

  /**
   * Stored-file metadata. Present only when there is really an object in the bucket, so
   * these are what the UI reads to decide whether to offer playback and a download.
   * `storage_key` is deliberately never serialized — the only way to reach a file is
   * GET /vault/{id}/file, which re-checks ownership and mints a short-lived URL.
   */
  file_name: string | null;
  file_size: number | null;
  mime_type: string | null;
};

/**
 * A presigned download URL. It is a bearer credential until it expires: navigate to it,
 * never render it as visible text, log it, or persist it.
 */
export type FileLinkResponse = {
  url: string;
  expires_in: number;
  file_name: string | null;
  file_size: number | null;
  mime_type: string | null;
};

export type VaultItemDetail = VaultItem & {
  content: string | null;
  /**
   * Sentences the model copied verbatim out of `content`, for marking in place.
   *
   * The backend discards any span that is not actually present in the text, so these are
   * quotes rather than paraphrases — but the renderer still only marks what it can find.
   */
  ai_highlights: string[];
  item_metadata: Record<string, unknown>;
  /**
   * A carousel's slides, in order, already signed by the API.
   *
   * `null` in a position is a slide that failed to mirror. The hole is deliberate — a
   * carousel is ordered and its caption refers to slides by number, so compacting the
   * list would put slide 10 where the caption says 9.
   */
  slide_urls?: (string | null)[];
};

export type VaultListResponse = {
  items: VaultItem[];
  total: number;
  limit: number;
  offset: number;
};

/**
 * A memory in the trash: a card, plus the two dates that page is about.
 *
 * `purge_after` is computed by the server from `deleted_at` and its own retention
 * setting, so it is the day the sweep will really act on — never a date the client works
 * out from a number it was told once.
 */
export type TrashItem = VaultItem & {
  deleted_at: string;
  purge_after: string;
};

export type TrashListResponse = {
  items: TrashItem[];
  total: number;
  limit: number;
  offset: number;
  /** So the page can explain the window without hardcoding a number the server owns. */
  retention_days: number;
};

export type InstagramAccount = {
  id: string;
  instagram_user_id: string;
  username: string | null;
  name: string | null;
  profile_picture_url: string | null;
  /** The Facebook Page the Instagram account is linked to. */
  page_name: string | null;
  /** Expiry of the long-lived user token; after this the user must reconnect. */
  token_expires_at: string | null;
  created_at: string;
};

export type InstagramConnectionsResponse = {
  /** False when this deployment has no Meta app configured. */
  available: boolean;
  accounts: InstagramAccount[];
};

export type TelegramAccount = {
  telegram_user_id: string;
  username: string | null;
  first_name: string | null;
  linked_at: string;
};

export type TelegramConnectionResponse = {
  /** False when this deployment has no bot token configured. */
  available: boolean;
  /** Without the @. Null when the bot is not configured. */
  bot_username: string | null;
  /** One Telegram account per RecallAI user, or none. */
  account: TelegramAccount | null;
};

export type TelegramLinkResponse = {
  /** Single-use t.me link. Valid for `expires_in` seconds, then dead. */
  deep_link: string;
  expires_in: number;
  expires_at: string;
};

// --- Spaces -------------------------------------------------------------------------

export type Visibility = "private" | "unlisted" | "public";

/** Least privilege first, matching the backend's `SpaceRole`. */
export type SpaceRole = "viewer" | "editor" | "owner";

export type SpaceMember = {
  user_id: string;
  name: string | null;
  avatar_url: string | null;
  role: SpaceRole;
};

export type Space = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  visibility: Visibility;
  /** One or two glyphs, chosen by the owner. Null until they pick one. */
  /** A Lucide icon *name* from `lib/space-icons` — resolved to a component there, so an
   *  unknown name falls back to `emoji` and then to a neutral mark. */
  icon: string | null;
  emoji: string | null;
  /**
   * An accent *key* ("violet", "rose", …), never a CSS class — the gradient strings live
   * in `lib/space-accent.ts`. Null falls back to a hash of the id, so a Space nobody has
   * styled still looks deliberate.
   */
  accent: string | null;
  pinned: boolean;
  /** Model-written, and labelled as such wherever it is rendered. */
  ai_overview: string | null;
  ai_topics: string[];
  created_at: string;
  /** The viewer's own role. Hiding a control is a courtesy; the server refuses anyway. */
  role: SpaceRole;
  memory_count: number;
  member_count: number;
  /**
   * Null means "never computed", which renders as nothing rather than as zero — "no
   * connections" and "not measured" are different claims and only one of them is true.
   */
  connection_count: number | null;
};

/**
 * One edge between two memories in a Space, with both ends.
 *
 * The API returns **only your own** edges. A connection is a judgement its author made
 * about their own memories, so two members see the same space with different graphs —
 * see the panel copy, which says so rather than letting people assume otherwise.
 */
export type SpaceConnection = {
  id: string;
  relation: Relation;
  note: string | null;
  ai_reason: string | null;
  created_at: string;
  source: VaultItem;
  target: VaultItem;
};

export type SpaceDetail = Space & {
  items: VaultItem[];
  members: SpaceMember[];
};

/** What `POST /spaces/{id}/items` reports back. Re-adding is `skipped`, not an error. */
export type AddItemsResponse = { added: number; skipped: number };

export type SpaceInvite = {
  /** Single-use. Treat it as a credential: anyone holding it can join until it is spent. */
  url: string;
  role: SpaceRole;
  expires_at: string;
};

/** The unauthenticated share page. Deliberately narrower than `Space`. */
export type PublicSpace = {
  name: string;
  description: string | null;
  /** A Lucide icon *name* from `lib/space-icons` — resolved to a component there, so an
   *  unknown name falls back to `emoji` and then to a neutral mark. */
  icon: string | null;
  emoji: string | null;
  accent: string | null;
  ai_overview: string | null;
  items: VaultItem[];
};

// --- Connections --------------------------------------------------------------------

/**
 * How one memory relates to another. Nine keys, matching the backend's `Relation`.
 *
 * `related_to` is the weakest claim and doubles as the "Other" of this vocabulary.
 * Anything stronger was chosen by a person, or by the model that judges a capture's
 * candidates — `MemoryConnection.origin` is which, and `ai_reason` is the sentence that
 * comes with the second.
 */
export type Relation =
  | "related_to"
  /**
   * The same thing kept twice — same video, same article, same link. Mechanical rather
   * than semantic: the backend hands its judge a measured "same source" signal rather
   * than asking it to infer one, so this label means two *rows*, not two opinions.
   */
  | "duplicate_of"
  | "expands"
  | "supports"
  | "contradicts"
  | "inspired_by"
  | "depends_on"
  | "example_of"
  | "part_of";

/** Who drew the edge. Only ever a thing to render — never an input to a decision. */
export type ConnectionOrigin = "user" | "ai";

export type ConnectionStatus = "suggested" | "confirmed" | "dismissed";

/**
 * Which way round the edge runs, **relative to the memory you asked about**. The same
 * stored row is `outgoing` from one of its two memories and `incoming` from the other,
 * and both readings are true — which is why the label has to be looked up per direction.
 */
export type ConnectionDirection = "outgoing" | "incoming";

export type MemoryConnection = {
  id: string;
  relation: Relation;
  direction: ConnectionDirection;
  origin: ConnectionOrigin;
  status: ConnectionStatus;
  /**
   * The similarity a derived edge was drawn at, 0..1. Null for a hand-made one, and the
   * UI shows nothing rather than a zero — "not measured" and "not similar" are different
   * claims, the same distinction `Space.connection_count` draws.
   */
  score: number | null;
  /** The person's own words. */
  note: string | null;
  /** Model-written. Render it marked as such; never style it like `note`. */
  ai_reason: string | null;
  created_at: string;
  /** The other end, as a card. Never the body — the API does not send one. */
  memory: VaultItem;
};

export type ConnectionNeighbourhood = {
  focus: VaultItem;
  connections: MemoryConnection[];
  total: number;
};

/**
 * An edge nobody has accepted yet. Carries *both* of its memories, unlike
 * `MemoryConnection`: a suggestion is read from an inbox rather than from one memory's
 * page, so there is no "the one you asked about" for the other end to be relative to.
 */
export type ConnectionSuggestion = {
  id: string;
  relation: Relation;
  score: number | null;
  ai_reason: string | null;
  created_at: string;
  source: VaultItem;
  target: VaultItem;
};

/**
 * One edge on the vault canvas, named by both of its memories rather than carrying a card.
 *
 * A graph is wired from ids — the nodes arrive once in `VaultGraph.nodes` however many
 * edges touch them — so shipping a card per edge would send a memory with six connections
 * six times.
 *
 * The direction here is the **stored** one and is meaningful: `part_of` and `depends_on`
 * read differently each way, and the backend normalises the symmetric relations on write
 * so the arrow drawn is always the one the label belongs to.
 */
export type GraphEdge = {
  id: string;
  source_id: string;
  target_id: string;
  relation: Relation;
  origin: ConnectionOrigin;
  status: ConnectionStatus;
  score: number | null;
  note: string | null;
  ai_reason: string | null;
  created_at: string;
};

/**
 * The whole vault as a graph.
 *
 * `nodes` is derived from `edges` server-side, which is what makes the two incapable of
 * disagreeing about which memories are on screen. A memory with no connections is
 * deliberately absent: it has nothing to draw, and a canvas of unattached cards is a
 * vault listing with worse ergonomics.
 *
 * `truncated` is the honest half of a ceiling — a vault past the limit gets its strongest
 * edges and is told so, rather than being shown part of itself as the whole.
 */
export type VaultGraph = {
  nodes: VaultItem[];
  edges: GraphEdge[];
  total: number;
  truncated: boolean;
};

/** A memory and how many things connect to it. */
export type ConnectionHub = {
  memory: VaultItem;
  connection_count: number;
};

export type ConnectionSuggestionList = {
  suggestions: ConnectionSuggestion[];
  total: number;
};
