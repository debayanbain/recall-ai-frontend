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
  processing_status: ProcessingStatus;
  created_at: string;
};

export type VaultItemDetail = VaultItem & {
  content: string | null;
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
