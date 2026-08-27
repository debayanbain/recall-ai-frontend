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

export type ProcessingStatus = "pending" | "processing" | "completed" | "failed" | "skipped";

export type ContentType =
  | "youtube"
  | "article"
  | "pdf"
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
  created_at: string;
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
};

export type VaultListResponse = {
  items: VaultItem[];
  total: number;
  limit: number;
  offset: number;
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
