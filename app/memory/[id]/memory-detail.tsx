"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Sparkles,
  Share2,
  Bookmark,
  Trash2,
  ExternalLink,
  Clock,
  Tag,
  MessageSquare,
  Search,
  ArrowUpRight,
  AlertTriangle,
  Pencil,
} from "lucide-react";
import { toast } from "@/lib/toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { HighlightedText } from "@/components/highlighted-text";
import { ContentEditor } from "@/components/content-editor";
import { RichContent } from "@/components/rich-content";
import { MemoryBanner } from "@/components/memory-banner";
import { MemoryCard } from "@/components/memory-card";
import { useCapture } from "@/components/capture-sheet";
import { useSession } from "@/hooks/use-auth";
import { useDeleteVaultItem, useVaultItem, useVaultItems } from "@/hooks/use-vault";
import { ApiError } from "@/lib/api";
import { toMemories, toMemory } from "@/lib/vault-adapter";
import { storedDocument } from "@/lib/editor-doc";
import { toggleFavorite, useStore } from "@/lib/store";
import { kindMeta } from "@/lib/mock-data";
import type { VaultItemDetail } from "@/lib/types";

const plain = "rounded-xl tracking-normal normal-case";
const softCard = "card-soft gap-0 rounded-[calc(var(--radius)+4px)] py-0 shadow-none ring-0";

/**
 * Only http(s) links are ever turned into an anchor.
 *
 * `source_url` is whatever the user pasted. The backend validates it before *fetching*
 * it, but this is the one place it becomes something a person clicks, and a
 * `javascript:` href would run in the app's own origin. Anything that is not plain web
 * navigation simply does not get a link.
 */
function externalHref(url: string | null): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:" ? parsed.href : null;
  } catch {
    return null;
  }
}

/** What the body says while the worker has not produced text yet. */
function contentNotice(item: VaultItemDetail): string {
  switch (item.processing_status) {
    case "pending":
      return "Queued. Recall reads, summarizes and tags this in the background — reopen in a moment.";
    case "processing":
      return "Reading this now…";
    case "failed":
      return "We couldn't read this one. Open the original to check it's still reachable.";
    case "skipped":
      return "Stored as-is. There was no readable text to index — the file itself is unchanged.";
    default:
      return "No text was extracted from this memory.";
  }
}

function DetailShell({ children }: { children: React.ReactNode }) {
  return (
    <Card className="mx-auto max-w-md gap-0 rounded-3xl border border-dashed border-border bg-secondary/30 py-0 shadow-none ring-0">
      <CardContent className="px-6 py-16 text-center">{children}</CardContent>
    </Card>
  );
}

export function MemoryDetail({ id }: { id: string }) {
  const router = useRouter();
  const capture = useCapture();
  const { favorites } = useStore();
  const { isSignedIn, isLoading: sessionLoading } = useSession();

  // The memory itself now comes from the API. It used to be looked up in the local
  // Zustand store, which only ever holds the seeded demo library -- so every *real*
  // memory opened to "Memory not found" while the vault list, which does read the API,
  // showed it sitting right there.
  const { data: item, isPending, isError, error, refetch } = useVaultItem(id);
  const deleteItem = useDeleteVaultItem();
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [editing, setEditing] = useState(false);
  const [question, setQuestion] = useState("");

  // Neighbours for the "Related" rail. Same list the vault renders, minus this item.
  const { data: list } = useVaultItems({ limit: 12 });
  const related = useMemo(
    () => toMemories((list?.items ?? []).filter((i) => i.id !== id)).slice(0, 3),
    [list, id],
  );

  if (sessionLoading || (isSignedIn && isPending)) {
    return (
      <div className="space-y-6" aria-busy="true" aria-label="Loading memory">
        <Skeleton className="h-5 w-56 rounded-lg" />
        <Skeleton className="h-44 w-full rounded-[24px] sm:h-60 md:h-72" />
        <Skeleton className="h-10 w-3/4 rounded-lg" />
        <Skeleton className="h-32 w-full rounded-2xl" />
      </div>
    );
  }

  const unauthorized = error instanceof ApiError && error.isUnauthorized;
  if (!isSignedIn || unauthorized) {
    return (
      <DetailShell>
        <div className="mx-auto grid size-12 place-items-center rounded-2xl bg-primary-soft text-primary">
          <Search className="size-5" aria-hidden />
        </div>
        <h1 className="mt-4 font-display text-[26px] tracking-tight">Sign in to open this</h1>
        <p className="mt-2 text-[13.5px] leading-relaxed text-muted-foreground">
          Memories are private to your account.
        </p>
        <Button
          nativeButton={false}
          render={<Link href={`/sign-in?next=/memory/${encodeURIComponent(id)}`} />}
          className={`${plain} mt-6 h-11 gradient-primary px-4 text-[13.5px] font-semibold text-white hover:bg-transparent`}
        >
          Sign in
        </Button>
      </DetailShell>
    );
  }

  const notFound = error instanceof ApiError && error.status === 404;
  if (isError && !notFound) {
    // A network blip or a 500 is not the same thing as "this memory is gone", and telling
    // someone their memory was deleted when the server merely hiccupped is the worse lie.
    return (
      <DetailShell>
        <div className="mx-auto grid size-12 place-items-center rounded-2xl bg-destructive/10 text-destructive">
          <AlertTriangle className="size-5" aria-hidden />
        </div>
        <h1 className="mt-4 font-display text-[26px] tracking-tight">Couldn&rsquo;t load this</h1>
        <p className="mt-2 text-[13.5px] leading-relaxed text-muted-foreground">
          The memory is still there — the request didn&rsquo;t get through.
        </p>
        <Button
          onClick={() => refetch()}
          className={`${plain} mt-6 h-11 gradient-primary px-4 text-[13.5px] font-semibold text-white hover:bg-transparent`}
        >
          Try again
        </Button>
      </DetailShell>
    );
  }

  if (!item) {
    return (
      <DetailShell>
        <div className="mx-auto grid size-12 place-items-center rounded-2xl bg-primary-soft text-primary">
          <Search className="size-5" aria-hidden />
        </div>
        <h1 className="mt-4 font-display text-[26px] tracking-tight">Memory not found</h1>
        <p className="mt-2 text-[13.5px] leading-relaxed text-muted-foreground">
          This memory may have been removed, or the link is out of date.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Button
            nativeButton={false}
            render={<Link href="/vault" />}
            className={`${plain} h-11 gradient-primary px-4 text-[13.5px] font-semibold text-white hover:bg-transparent`}
          >
            Back to vault
          </Button>
          <Button
            variant="outline"
            onClick={() => capture.open()}
            className={`${plain} h-11 border-border bg-card px-4 text-[13.5px] font-medium text-foreground/80`}
          >
            Capture something new
          </Button>
        </div>
      </DetailShell>
    );
  }

  const memory = toMemory(item);
  const meta = kindMeta[memory.kind];
  const favorited = favorites.includes(memory.id);
  const href = externalHref(item.source_url);
  const space = item.ai_category ?? "Inbox";
  const highlights = item.ai_highlights ?? [];
  // Present once someone has edited by hand. `content` stays the flat projection the
  // search and the embedding are built from, but rendering *that* is what made an
  // applied heading come back looking like a paragraph — so the document wins here.
  const document = storedDocument(item);
  // Hidden while the worker still owns this item: it writes `content` from the
  // extraction when it finishes, so anything typed in the meantime would be overwritten
  // without a word.
  const editable =
    item.processing_status !== "pending" && item.processing_status !== "processing";

  const actions = [
    ...(href
      ? [
          {
            i: ExternalLink,
            l: "Open original",
            run: () => window.open(href, "_blank", "noopener,noreferrer"),
          },
        ]
      : []),
    {
      i: Share2,
      l: "Copy link",
      run: async () => {
        try {
          await navigator.clipboard.writeText(`${window.location.origin}/memory/${memory.id}`);
          toast.success("Link copied", { description: memory.title });
        } catch {
          toast.info("Couldn't copy automatically");
        }
      },
    },
    {
      i: Bookmark,
      l: favorited ? "Saved" : "Save",
      run: () => {
        const next = toggleFavorite(memory.id);
        const fn = next ? toast.success : toast.info;
        fn(next ? "Added to favorites" : "Removed from favorites", { description: memory.title });
      },
    },
    {
      i: Trash2,
      // Two clicks rather than a browser confirm: deleting is the one action here that
      // cannot be undone, and the label says exactly what the second click does.
      l: confirmingDelete ? "Confirm delete" : "Delete",
      run: () => {
        if (!confirmingDelete) {
          setConfirmingDelete(true);
          return;
        }
        deleteItem.mutate(memory.id, {
          onSuccess: () => {
            toast.success("Memory deleted", { description: memory.title });
            router.push("/vault");
          },
          onError: () => {
            setConfirmingDelete(false);
            toast.error("Couldn't delete that", { description: "Try again in a moment." });
          },
        });
      },
    },
  ];

  return (
    <>
      <Breadcrumb className="mb-5">
        <BreadcrumbList className="gap-2 text-[12.5px] tracking-normal normal-case sm:gap-2">
          <BreadcrumbItem>
            <BreadcrumbLink render={<Link href="/vault" />} className="hover:text-foreground">
              Vault
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator>/</BreadcrumbSeparator>
          <BreadcrumbItem>{space}</BreadcrumbItem>
          <BreadcrumbSeparator>/</BreadcrumbSeparator>
          <BreadcrumbItem>
            <BreadcrumbPage className="max-w-[16rem] truncate text-foreground">
              {memory.title}
            </BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="grid grid-cols-1 gap-7 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-8">
        <article className="min-w-0">
          <MemoryBanner
            cover={memory.cover}
            accent={memory.accent}
            alt={memory.cover ? memory.title : ""}
            className="h-44 rounded-[24px] border border-border sm:h-60 sm:rounded-[28px] md:h-72"
          >
            <Badge className="absolute left-4 top-4 max-w-[calc(100%-2rem)] gap-2 rounded-full border border-white/80 bg-white/85 px-3 py-1.5 text-[12px] font-medium tracking-normal normal-case backdrop-blur sm:left-6 sm:top-6">
              <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${meta.dot}`} /> {meta.label}
              <span className="truncate text-muted-foreground">· {memory.source}</span>
            </Badge>
          </MemoryBanner>

          <div className="mt-6 flex flex-col gap-4 sm:mt-7">
            <div className="min-w-0">
              {/* The AI's name for this one memory. Tags answer "what is this about";
                  this answers "which one is this", which is the question a list of
                  fifty memories tagged [jobs] actually poses. */}
              {item.ai_label && (
                <div className="mb-2.5 inline-flex max-w-full items-center gap-1.5 rounded-full bg-primary-soft px-3 py-1.5 text-[12.5px] font-medium text-brand-accent ring-1 ring-brand-accent/15">
                  <Sparkles className="size-3.5 shrink-0" aria-hidden />
                  <span className="truncate">{item.ai_label}</span>
                </div>
              )}
              <h1 className="font-display text-[30px] leading-[1.1] tracking-tight sm:text-[40px] md:text-[52px]">
                {memory.title}
              </h1>
              <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1.5 text-[12.5px] text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 shrink-0" /> Saved {memory.savedAt}
                </span>
                <span aria-hidden="true">·</span>
                <span className="inline-flex items-center gap-1.5">
                  <Tag className="h-3.5 w-3.5 shrink-0" /> {memory.tags.join(", ")}
                </span>
                <span aria-hidden="true">·</span>
                <span>In {space}</span>
              </div>
            </div>
            <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0 sm:pb-0">
              {actions.map((a) => (
                <Button
                  key={a.l}
                  variant="outline"
                  onClick={a.run}
                  disabled={deleteItem.isPending}
                  className={`${plain} h-10 shrink-0 gap-1.5 border-border bg-card px-3 text-[12.5px] font-medium text-foreground/80 hover:bg-secondary`}
                >
                  <a.i className="size-3.5" /> {a.l}
                </Button>
              ))}
            </div>
          </div>

          <Card className={`${softCard} mt-6 sm:mt-7`}>
            <CardContent className="p-5 sm:p-6">
              <div className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-wider text-primary">
                <Sparkles className="h-3.5 w-3.5 shrink-0" /> AI summary
              </div>
              {/* Exactly what the model returned, and nothing else. The page used to append
                  invented sentences and four fixed "key ideas" to this, which read as
                  Recall's analysis of the user's own document. */}
              <p className="mt-3 text-[14.5px] leading-relaxed text-foreground/85 sm:text-[15px]">
                {memory.summary}
              </p>
              {item.ai_tags.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {item.ai_tags.map((t) => (
                    <Badge
                      key={t}
                      variant="secondary"
                      className="rounded-full px-2.5 py-1 text-[11.5px] font-medium tracking-normal normal-case"
                    >
                      {t}
                    </Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <div className="mt-6 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
              <h2 className="font-display text-[22px] sm:text-[24px]">Full content</h2>
              <div className="flex flex-wrap items-center gap-3">
                {(item.content || document) && highlights.length > 0 && !editing && (
                  // Says why parts of the text are tinted. Without it the marks read as a
                  // rendering artefact rather than as the model pointing at something.
                  <span className="text-[12.5px] text-muted-foreground">
                    {highlights.length} key {highlights.length === 1 ? "line" : "lines"} highlighted
                  </span>
                )}
                {!editing && editable && (
                  <Button
                    variant="outline"
                    onClick={() => setEditing(true)}
                    className={`${plain} h-10 shrink-0 gap-1.5 border-border bg-card px-3 text-[12.5px] font-medium text-foreground/80 hover:bg-secondary`}
                  >
                    <Pencil className="size-3.5" aria-hidden />
                    {item.content || document ? "Edit" : "Add content"}
                  </Button>
                )}
              </div>
            </div>
            {editing ? (
              // Unmounted on close, so reopening always re-seeds from what the cache
              // holds after the save rather than from a stale editor instance.
              <ContentEditor item={item} onClose={() => setEditing(false)} />
            ) : document ? (
              <RichContent
                blocks={document}
                spans={highlights}
                className="text-[15px] leading-relaxed text-foreground/85 sm:text-[16px]"
              />
            ) : item.content ? (
              // whitespace-pre-wrap keeps the extracted line breaks. Rendered as text
              // nodes, never as HTML -- this is third-party content off the open web.
              <HighlightedText
                text={item.content}
                spans={highlights}
                className="text-[15px] leading-relaxed text-foreground/85 sm:text-[16px]"
              />
            ) : (
              <p className="rounded-2xl border border-dashed border-border bg-secondary/30 p-4 text-[13.5px] leading-relaxed text-muted-foreground">
                {contentNotice(item)}
              </p>
            )}
          </div>
        </article>

        <aside className="min-w-0 space-y-5 lg:sticky lg:top-32 lg:self-start">
          <Card className={softCard}>
            <CardContent className="p-5">
              <div className="text-[12px] font-semibold uppercase tracking-wider text-muted-foreground">
                Ask about this memory
              </div>
              <div className="mt-3 flex items-center gap-2 rounded-xl border border-border bg-secondary/50 px-3">
                <MessageSquare className="h-3.5 w-3.5 shrink-0 text-primary" />
                <Input
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  onKeyDown={(e) =>
                    e.key === "Enter" && toast.info("Ask isn't wired up to the model yet")
                  }
                  aria-label="Ask about this memory"
                  className="h-11 min-w-0 border-transparent px-0 text-[12.5px] focus-visible:border-transparent"
                  placeholder="Summarize the key argument…"
                />
                <Button
                  variant="ghost"
                  size="icon-sm"
                  // Answers used to be composed client-side from the memory's own summary
                  // and presented as the model's. Saying "not yet" is the honest version.
                  onClick={() => toast.info("Ask isn't wired up to the model yet")}
                  aria-label="Ask Recall"
                  className={`${plain} size-10 shrink-0 text-muted-foreground hover:bg-white hover:text-primary`}
                >
                  <ArrowUpRight className="size-3.5" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {related.length > 0 && (
            <div>
              <div className="mb-3 text-[12px] font-semibold uppercase tracking-wider text-muted-foreground">
                Related memories
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-1">
                {related.map((m) => (
                  <MemoryCard key={m.id} m={m} compact />
                ))}
              </div>
            </div>
          )}
        </aside>
      </div>
    </>
  );
}
