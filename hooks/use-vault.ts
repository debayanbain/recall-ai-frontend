"use client";

import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { apiFetch, apiUpload } from "@/lib/api";
import { useSession } from "@/hooks/use-auth";
import { queryKeys } from "@/lib/query-keys";
import type { EditorBlock } from "@/lib/editor-doc";
import type {
  FileLinkResponse,
  VaultItem,
  VaultItemDetail,
  VaultListResponse,
} from "@/lib/types";

export function useVaultItems({ limit = 20, offset = 0 } = {}) {
  const { isSignedIn } = useSession();
  return useQuery({
    queryKey: queryKeys.vault.list(limit, offset),
    queryFn: () => apiFetch<VaultListResponse>(`/vault?limit=${limit}&offset=${offset}`),
    // The home feed is on a public page, so an anonymous visitor would otherwise fire a
    // request that can only ever 401 — and a 401 is not a failure worth showing anyone.
    enabled: isSignedIn,
    // Saves are processed by a worker, so a freshly saved item flips from `pending` to
    // `completed` out of band. Poll while anything is still in flight, then stop.
    refetchInterval: (query) =>
      query.state.data?.items.some(
        (i) => i.processing_status === "pending" || i.processing_status === "processing",
      )
        ? 5_000
        : false,
  });
}

/**
 * The whole vault, oldest-ward, a page at a time.
 *
 * The timeline groups by real calendar periods, so it needs to keep walking backwards
 * rather than showing one window: an infinite query is one growing cache entry, where
 * `useVaultItems` is a fresh entry per offset. `/vault` already returns `created_at`
 * descending, so page order *is* chronological order and nothing is re-sorted here.
 *
 * The server caps `limit` at 100 and scopes every row to the session's own user, so the
 * page size below is a request shape, never an authorization boundary.
 */
export function useVaultTimeline({ pageSize = 60 } = {}) {
  const { isSignedIn } = useSession();
  return useInfiniteQuery({
    queryKey: queryKeys.vault.timeline(pageSize),
    queryFn: ({ pageParam }) =>
      apiFetch<VaultListResponse>(`/vault?limit=${pageSize}&offset=${pageParam}`),
    initialPageParam: 0,
    // `total` comes from the same scan as the rows (count(*) OVER ()), so it is the
    // authority on whether another page exists — not "did this page come back full".
    getNextPageParam: (last) => {
      const loaded = last.offset + last.items.length;
      return last.items.length > 0 && loaded < last.total ? loaded : undefined;
    },
    // A public shell would otherwise fire a request that can only ever 401.
    enabled: isSignedIn,
    // Same rule the list follows: a freshly captured item is enriched out of band, so
    // poll while anything is in flight and stop the moment nothing is.
    refetchInterval: (query) =>
      query.state.data?.pages.some((page) =>
        page.items.some(
          (i) => i.processing_status === "pending" || i.processing_status === "processing",
        ),
      )
        ? 5_000
        : false,
  });
}

export function useVaultItem(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.vault.detail(id ?? ""),
    queryFn: () => apiFetch<VaultItemDetail>(`/vault/${id}`),
    enabled: Boolean(id),
    // The same rule the list already followed, and this is the page that needed it more:
    // the list is glanced at, the detail page is *watched*. A freshly saved item is
    // processed out of band, so without this the page shows "Queued" until someone
    // reloads by hand -- and after a re-transcription it shows "Transcribing" forever
    // while the worker had already finished. Stops polling the moment it lands.
    refetchInterval: (query) =>
      query.state.data?.processing_status === "pending" ||
      query.state.data?.processing_status === "processing"
        ? 3_000
        : false,
  });
}

export function useSaveUrl() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { url: string; title?: string }) =>
      apiFetch<VaultItem>("/vault/save", { method: "POST", body: input }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.vault.all }),
  });
}

export function useSaveNote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { title: string; content: string }) =>
      apiFetch<VaultItem>("/vault/note", { method: "POST", body: input }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.vault.all }),
  });
}

/**
 * Replace an item's body with what the user wrote in the editor.
 *
 * Only the blocks go over the wire: the plain text, the stored document and the
 * surviving highlights are all derived by the backend, so the browser cannot post a
 * `content` that disagrees with the document beside it — or reach any other column by
 * adding it to the body.
 *
 * The response is the updated item, so it is written straight into the detail cache
 * rather than refetched; the list is only invalidated because a card shows the summary,
 * which the edit does not touch but a later reprocess might.
 */
export function useUpdateVaultContent(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (blocks: EditorBlock[]) =>
      apiFetch<VaultItemDetail>(`/vault/${encodeURIComponent(id)}/content`, {
        method: "PATCH",
        body: { blocks },
      }),
    onSuccess: (item) => {
      queryClient.setQueryData(queryKeys.vault.detail(id), item);
      queryClient.invalidateQueries({ queryKey: queryKeys.vault.all });
    },
  });
}

/**
 * Put a failed or skipped item back on the queue.
 *
 * The response is the item at its new `pending` status, written straight into the detail
 * cache so the retry button disappears on the same tick the request lands rather than one
 * poll later. The list is invalidated because a card shows the status too.
 */
export function useReprocessItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, language }: { id: string; language?: string }) =>
      apiFetch<VaultItem>(`/vault/${encodeURIComponent(id)}/reprocess`, {
        method: "POST",
        // Only for a voice note, and only when one was chosen: repeating a failed
        // auto-detection unchanged is the same coin flip.
        body: language ? { language } : {},
      }),
    onSuccess: (item) => {
      queryClient.setQueryData<VaultItemDetail | undefined>(
        queryKeys.vault.detail(item.id),
        (current) => (current ? { ...current, ...item } : current),
      );
      queryClient.invalidateQueries({ queryKey: queryKeys.vault.all });
    },
  });
}

export function useDeleteVaultItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiFetch<void>(`/vault/${id}`, { method: "DELETE" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.vault.all }),
  });
}


/**
 * Send a recording and get back the memory it became.
 *
 * The transcript is produced server-side, which is also where the language is detected —
 * so the round trip is longer than an ordinary save and the caller must show that it is
 * working rather than assume it is instant.
 *
 * `title` is optional and only sent when the user typed one: an empty field must not
 * overwrite the title the backend derives from what was actually said.
 */
export type UploadLimits = {
  max_bytes: number;
  extensions: string[];
  storage_enabled: boolean;
  voice: {
    enabled: boolean;
    max_bytes: number;
    max_seconds: number;
    /** Codes the server will actually honour. The picker is built from this, never from
     *  a list copied into the client: a code we offer that the server rejects falls back
     *  to auto-detect silently, which is the bug the picker exists to prevent. */
    languages: { code: string; label: string }[];
    default_language: string | null;
  };
  /**
   * Whether this deployment can read a video at all. The detail page reads it to decide
   * whether to offer a re-read of a memory whose video was never looked at — the
   * alternative is a button whose only possible outcome is the server refusing it, and
   * on that page the refusal costs a round trip to learn.
   */
  video: { enabled: boolean };
};

/**
 * What this deployment will actually accept.
 *
 * Voice can be off while uploads are on — it needs a speech key, not a bucket — and a
 * record button that can only ever answer 503 is worse than no button: the cost of
 * finding out is a recording the user already made.
 *
 * Cached for the session; these are deployment facts, not user data.
 */
export function useUploadLimits() {
  const { isSignedIn } = useSession();
  return useQuery({
    queryKey: queryKeys.vault.limits,
    queryFn: () => apiFetch<UploadLimits>("/vault/uploads/limits"),
    enabled: isSignedIn,
    staleTime: Infinity,
  });
}

export function useSaveVoiceNote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      blob,
      title,
      peaks,
      language,
      duration,
    }: {
      blob: Blob;
      title?: string;
      /** Amplitude peaks measured while recording, for the waveform on the memory page. */
      peaks?: number[];
      /** ISO-639-1. Omitted means "let the model detect it". */
      language?: string;
      /** Seconds, measured here — only the whisper-* models report one. */
      duration?: number;
    }) => {
      const form = new FormData();
      // The filename is a formality — the server sniffs the container from the bytes and
      // never reads this — but multipart requires one, and the extension keeps the part
      // legible in a request log.
      form.append("audio", blob, "voice-note.webm");
      if (title?.trim()) form.append("title", title.trim());
      // Validated, truncated and clamped server-side before it reaches the JSONB column;
      // a malformed value is dropped there rather than failing the save.
      if (peaks?.length) form.append("peaks", JSON.stringify(peaks));
      // Only when the user actually chose one: an empty string would be a code the
      // server does not recognise, and the fallback for that is the detection we are
      // trying to skip.
      if (language) form.append("language", language);
      if (duration && duration > 0) form.append("duration", String(duration));
      return apiUpload<VaultItem>("/vault/voice", form);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.vault.all }),
  });
}

/**
 * Mint a short-lived download URL for an item's stored file.
 *
 * A mutation rather than a query on purpose: the URL is a bearer credential with a
 * few-minutes TTL, so it is fetched at the moment it is used and never cached, prefetched
 * or held across a page that has been open for a while. Every call re-checks ownership
 * server-side, so a fresh one is also the cheapest way to recover from an expired link.
 */
export function useFileLink() {
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<FileLinkResponse>(`/vault/${encodeURIComponent(id)}/file`),
  });
}

/**
 * The presigned URL for an item's stored file, for *displaying* it rather than saving it.
 *
 * A query where `useFileLink` is a mutation, and the difference is deliberate. A download
 * is one deliberate click, so its URL is minted at that moment and dropped. A thumbnail
 * has to survive every re-render of a grid that re-renders on hover, on favourite, and on
 * every five-second poll — minting per render would be a request storm, and minting per
 * mount would restart the image load each time.
 *
 * So it is cached, and only barely: `DOWNLOAD_LINK_TTL_SECONDS` is 300, and a link served
 * from cache at 299 seconds is a broken image. Four minutes leaves a working link for the
 * whole window it is handed out in, and `gcTime` matches so an unmounted card does not
 * leave a dead credential behind for the next one to pick up. It is never persisted, and
 * `enabled` is what keeps it from being minted for a card nobody has scrolled to.
 */
export function useStoredFileUrl(id: string, enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.vault.file(id),
    queryFn: () => apiFetch<FileLinkResponse>(`/vault/${encodeURIComponent(id)}/file`),
    enabled,
    staleTime: 240_000,
    gcTime: 240_000,
    // A 404 means the object is gone and a 403 means it is not ours; neither improves on
    // a retry, and the card has a perfectly good fallback to fall back to.
    retry: false,
    refetchOnWindowFocus: false,
  });
}

/**
 * Upload one document. Named for what the endpoint takes, not for the first thing it ever
 * took: the allowlist covers PDFs, images, text and Office files, and the server decides
 * which it is from the bytes rather than from the name sent here.
 */
export function useUploadDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => {
      const form = new FormData();
      form.append("file", file);
      return apiUpload<VaultItem>("/vault/upload", form);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.vault.all }),
  });
}
