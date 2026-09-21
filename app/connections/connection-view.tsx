"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { Check, Link2, Sparkles, Wand2, X } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ConnectChip, MemoryRow } from "@/components/memory-card";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  useConfirmConnection,
  useConnections,
  useConnectionGraph,
  useConnectionHubs,
  useConnectionSuggestions,
  useCreateConnection,
  useDeleteConnection,
  useDismissConnection,
  useRetypeConnection,
  useUpdateConnection,
} from "@/hooks/use-connections";
import { useSession } from "@/hooks/use-auth";
import { useVaultItems } from "@/hooks/use-vault";
import { MAX_GRAPH_NODES } from "@/lib/connection-layout";
import { relationLabel, relationStyle } from "@/lib/connection-style";
import { fadeUp, motionVariants, stagger } from "@/lib/motion";
import { toMemory } from "@/lib/vault-adapter";
import type {
  ConnectionSuggestion,
  MemoryConnection,
  Relation,
  VaultItem,
} from "@/lib/types";
import { ConnectionGraph } from "./connection-graph";
import { ConnectDialog, type DrawnPair } from "./connect-dialog";
import { EdgeInspector } from "./edge-inspector";
import { VaultCanvas } from "./vault-canvas";
import { nodeStyle, type GraphNode } from "./graph-data";

/** Undoes the base-sera Button defaults (square, uppercase, wide tracking). */
const plain = "rounded-xl tracking-normal normal-case";
const relBadge =
  "gap-1.5 rounded-md px-2 py-0.5 text-[10.5px] font-medium tracking-normal normal-case ring-1";

/**
 * Connections, cards first.
 *
 * The graph is behind a toggle rather than in front of the content, for three reasons that
 * all point the same way: the product spec asks for the relationship to stay contextual
 * and not to open on "a giant technical graph"; every card here is a real link somebody
 * will want to follow, and a card is the thing this app already renders memories as; and
 * the canvas has never worked on a phone, so leading with it means leading with the one
 * view half the visitors cannot use. On mobile the toggle is not rendered at all — that is
 * the old `md:hidden` split, kept, rather than a second list implementation.
 */
export function ConnectionView({ memoryId }: { memoryId?: string }) {
  const { data, isLoading, isError, refetch } = useConnections(memoryId);
  const suggestions = useConnectionSuggestions();
  const [view, setView] = useState<"cards" | "graph">("cards");
  const isMobile = useIsMobile();

  // No coordinates here. Where a node sits depends on how big the canvas is, and this
  // component has no idea -- `ConnectionGraph` measures itself and lays them out.
  const nodes = useMemo<GraphNode[]>(
    () =>
      (data?.connections ?? []).slice(0, MAX_GRAPH_NODES).map((connection) => ({
        id: connection.id,
        connection,
        item: connection.memory,
        label: relationLabel(connection.relation, connection.direction),
        href: `/memory/${connection.memory.id}`,
      })),
    [data?.connections],
  );

  if (!memoryId) return <VaultMap />;

  if (isLoading) {
    return (
      <div aria-busy="true" aria-label="Loading connections" className="flex flex-col gap-4">
        <Skeleton className="h-32 w-full rounded-[calc(var(--radius)+4px)]" />
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-20 w-full rounded-2xl" />
        ))}
      </div>
    );
  }

  if (isError || !data) {
    return (
      <Card className="gap-0 rounded-3xl border border-destructive/30 bg-destructive/5 py-0 shadow-none ring-0">
        <CardContent className="px-6 py-12 text-center" role="alert">
          <h2 className="font-display text-[20px] tracking-tight text-destructive">
            We couldn&rsquo;t load these connections
          </h2>
          <p className="mx-auto mt-1.5 max-w-sm text-[13px] leading-relaxed text-destructive/85">
            Your connections are saved — this is just the map failing to load.
          </p>
          <Button
            variant="ghost"
            onClick={() => refetch()}
            className={`${plain} mt-4 h-11 px-4 text-[13.5px] font-semibold text-destructive hover:bg-destructive/10`}
          >
            Try again
          </Button>
        </CardContent>
      </Card>
    );
  }

  const focus = toMemory(data.focus);
  const focusStyle = nodeStyle[focus.kind];
  const relevant = (suggestions.data?.suggestions ?? []).filter(
    (s) => s.source.id === data.focus.id || s.target.id === data.focus.id,
  );
  const groups = groupByRelation(data.connections);
  const stillReading =
    data.focus.processing_status === "pending" ||
    data.focus.processing_status === "processing";

  return (
    <div className="flex flex-col gap-5">
      {/* The focus, as a card like every other — it is a memory, not a diagram element. */}
      <Card className="gap-0 rounded-[calc(var(--radius)+4px)] border-2 border-primary/60 py-0 shadow-none ring-0">
        <CardContent className="p-5">
          <div className="flex items-center gap-2.5">
            <span className={`grid size-9 shrink-0 place-items-center rounded-xl ${focusStyle.tone}`}>
              <focusStyle.icon className="size-4" />
            </span>
            <Badge className="rounded-none px-0 font-mono text-[11px] tracking-wider text-primary">
              Focus
            </Badge>
          </div>
          <Link
            href={`/memory/${data.focus.id}`}
            className="mt-3 block text-[18px] font-semibold leading-snug tracking-tight focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            {focus.title}
          </Link>
          <div className="mt-2 flex items-center gap-1.5 text-[12px] text-muted-foreground">
            <Link2 className="size-3.5 shrink-0 text-primary" />
            {data.total} connected {data.total === 1 ? "memory" : "memories"}
          </div>
        </CardContent>
      </Card>

      {relevant.length > 0 && (
        <SuggestionStrip
          suggestions={relevant.map((s) => ({
            id: s.id,
            relation: s.relation,
            reason: s.ai_reason,
            other: s.source.id === data.focus.id ? s.target : s.source,
          }))}
        />
      )}

      {data.connections.length === 0 ? (
        <Card className="gap-0 rounded-3xl border border-dashed border-border bg-secondary/30 py-0 shadow-none ring-0">
          <CardContent className="px-6 py-14 text-center">
            <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-primary-soft text-primary">
              <Link2 className="h-5 w-5" />
            </div>
            {/* Three states, not two. With a suggestion sitting directly above it, the
                old copy -- "wait for Recall to suggest one" -- contradicted the thing the
                reader was looking at. `connections` is confirmed edges only, so "none"
                here does not mean "none proposed". */}
            <h2 className="mt-4 font-display text-[22px] tracking-tight">
              {stillReading
                ? "Recall is still reading this"
                : relevant.length
                  ? "Nothing confirmed yet"
                  : "Nothing connected yet"}
            </h2>
            <p className="mx-auto mt-1.5 max-w-md text-[13px] leading-relaxed text-muted-foreground">
              {stillReading
                ? "Connections are worked out once the memory has been processed."
                : relevant.length
                  ? "Tap Connect above and it joins the map here."
                  : "Connect a memory from its own page, or wait for Recall to suggest one."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {!isMobile && (
            <div className="flex justify-end">
              <div className="inline-flex rounded-xl border border-border bg-card p-1">
                {(["cards", "graph"] as const).map((option) => (
                  <Button
                    key={option}
                    variant="ghost"
                    aria-pressed={view === option}
                    onClick={() => setView(option)}
                    className={`${plain} h-9 px-3.5 text-[13px] font-semibold capitalize ${
                      view === option
                        ? "bg-primary-soft text-accent-foreground"
                        : "text-muted-foreground"
                    }`}
                  >
                    {option}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {view === "graph" && !isMobile ? (
            <>
              <ConnectionGraph focus={data.focus} nodes={nodes} />
              {data.connections.length > nodes.length && (
                // Never silently draw a subset: a ring of a dozen is already at the edge
                // of readable, and a picture that quietly omits memories is worse than one
                // that says it did.
                <p className="text-center text-[12.5px] text-muted-foreground">
                  Showing {nodes.length} of {data.connections.length} — switch to Cards for
                  the rest.
                </p>
              )}
            </>
          ) : (
            <>
              <p aria-live="polite" className="sr-only">
                {data.total} connected {data.total === 1 ? "memory" : "memories"}
              </p>
              {groups.map(([relation, edges]) => (
                <RelationGroup key={relation} relation={relation} edges={edges} />
              ))}
            </>
          )}
        </>
      )}
    </div>
  );
}

/**
 * One section per relation present. Grouping rather than one flat list because the
 * relation *is* the information here — "what contradicts this" and "what this is part of"
 * are different questions, and a list sorted by date answers neither.
 */
function RelationGroup({
  relation,
  edges,
}: {
  relation: Relation;
  edges: MemoryConnection[];
}) {
  const reduced = useReducedMotion();
  const listVariants = motionVariants(reduced, stagger(0.04));
  const itemVariants = motionVariants(reduced, fadeUp);
  const style = relationStyle[relation];
  const retype = useRetypeConnection();
  // Paired explicitly rather than by array position. `toMemories` is a plain map today,
  // so indexing would work -- but it is defined in another file, and the day somebody
  // adds a filter to it every edge here silently attaches to the wrong card, with no
  // error and nothing to fail. Every list on this page is built this way for that reason.
  // Every edge in a group shares a relation but not necessarily a direction, so the
  // heading uses the wording of the first and each row carries its own.
  const rows = useMemo(
    () => edges.map((edge) => ({ edge, memory: toMemory(edge.memory) })),
    [edges],
  );

  return (
    <section className="flex flex-col gap-2.5">
      <h2 className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-wider text-muted-foreground">
        <span className={`size-1.5 rounded-full ${style.dot}`} />
        {relationLabel(relation, edges[0].direction)}
        <span className="font-normal normal-case tracking-normal">({edges.length})</span>
      </h2>
      <motion.ul
        variants={listVariants}
        initial="hidden"
        animate="show"
        className="flex flex-col gap-2.5"
      >
        {rows.map(({ edge, memory }) => (
          <motion.li key={edge.id} variants={itemVariants} className="flex flex-col gap-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className={`${relBadge} ${style.chip}`}>
                <span className={`size-1.5 rounded-full ${style.dot}`} />
                {relationLabel(edge.relation, edge.direction)}
              </Badge>
              {/* A model's account of why two memories relate, marked as one. Rendering it
                  like the owner's own note is the single way this feature can lie -- which
                  is why it reads from `ai_reason` and the line below reads from `note`. */}
              {edge.ai_reason && <ConnectChip label={edge.ai_reason} />}
              {edge.note && (
                <span className="text-[12px] text-muted-foreground">{edge.note}</span>
              )}
              {/* Only offered on an edge nobody has labelled by hand. Re-labelling a
                  person's own choice with a guess is the wrong way round, and the server
                  refuses the whole thing with a 503 when labelling is switched off --
                  which is the default, so this button usually does nothing and says so. */}
              {edge.origin === "ai" && !edge.ai_reason && (
                <Button
                  variant="ghost"
                  onClick={() => retype.mutate(edge.id)}
                  disabled={retype.isPending}
                  aria-label="Suggest how these relate"
                  className={`${plain} h-7 gap-1.5 px-2 text-[11.5px] font-semibold text-muted-foreground`}
                >
                  <Wand2 className="size-3" /> Label it
                </Button>
              )}
            </div>
            <MemoryRow m={memory} />
          </motion.li>
        ))}
      </motion.ul>
    </section>
  );
}

/** Undecided edges touching this memory. Nothing here is in the vault's graph yet. */
function SuggestionStrip({
  suggestions,
}: {
  suggestions: {
    id: string;
    relation: Relation;
    reason: string | null;
    other: MemoryConnection["memory"];
  }[];
}) {
  const confirm = useConfirmConnection();
  const dismiss = useDismissConnection();
  const rows = useMemo(
    () => suggestions.map((s) => ({ ...s, memory: toMemory(s.other) })),
    [suggestions],
  );

  return (
    <Card className="gap-0 rounded-[calc(var(--radius)+4px)] border border-dashed border-primary/40 bg-primary-soft/30 py-0 shadow-none ring-0">
      <CardContent className="flex flex-col gap-3 p-5">
        <h2 className="flex items-center gap-2 text-[13px] font-semibold">
          <Sparkles className="size-4 text-primary" />
          Recall thinks these are related
        </h2>
        <ul className="flex flex-col gap-3">
          {rows.map((suggestion) => (
            <li key={suggestion.id} className="flex flex-col gap-2">
              <MemoryRow m={suggestion.memory} />
              {suggestion.reason && <ConnectChip label={suggestion.reason} />}
              <div className="flex gap-2">
                <Button
                  onClick={() => confirm.mutate(suggestion.id)}
                  disabled={confirm.isPending}
                  className={`${plain} h-9 gap-1.5 px-3 text-[12.5px] font-semibold`}
                >
                  <Check className="size-3.5" /> Connect
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => dismiss.mutate(suggestion.id)}
                  disabled={dismiss.isPending}
                  className={`${plain} h-9 gap-1.5 px-3 text-[12.5px] font-semibold text-muted-foreground`}
                >
                  <X className="size-3.5" /> Not related
                </Button>
              </div>
            </li>
          ))}
        </ul>
        <p className="text-[11.5px] leading-relaxed text-muted-foreground">
          Dismissing one means Recall will not suggest that pair again. You can still
          connect them yourself later.
        </p>
      </CardContent>
    </Card>
  );
}

/**
 * The shape of the page, drawn before the page has anything in it.
 *
 * A single grey slab where the canvas goes was the old placeholder, and it told the
 * reader nothing about what was arriving -- then the real layout snapped in beside it
 * with a whole review column the slab never reserved. This mirrors the two-column
 * arrangement it is standing in for, at the same sizes, so nothing jumps when the data
 * lands (`content-jumping`). `aria-busy` with a name is what a screen reader gets
 * instead of the picture.
 */
function ConnectionsSkeleton() {
  return (
    <div
      aria-busy="true"
      aria-label="Loading your connection map"
      className="flex flex-col gap-4 xl:flex-row"
    >
      <div className="min-w-0 flex-1">
        <Skeleton className="h-[560px] w-full rounded-[calc(var(--radius)+4px)] lg:h-[680px]" />
      </div>
      <aside className="flex w-full shrink-0 flex-col gap-3 xl:max-w-sm">
        <Skeleton className="h-6 w-44 rounded-lg" />
        {[0, 1, 2].map((row) => (
          <Skeleton key={row} className="h-44 w-full rounded-2xl" />
        ))}
      </aside>
    </div>
  );
}

/**
 * Every undecided edge, both ends shown.
 *
 * `SuggestionStrip` renders suggestions *about one memory* and can name the other end
 * relative to it. Here there is no focus, so both memories are shown -- and that is the
 * only reason this is a second component rather than a prop.
 *
 * It exists because a backfill puts a whole vault's worth of suggestions into a queue
 * that, until now, was only reachable by opening a memory that happened to have one. A
 * decision nobody can find is a decision nobody makes.
 */
function SuggestionInbox({ suggestions }: { suggestions: ConnectionSuggestion[] }) {
  const confirm = useConfirmConnection();
  const dismiss = useDismissConnection();
  const rows = useMemo(
    () =>
      suggestions.map((s) => ({
        ...s,
        left: toMemory(s.source),
        right: toMemory(s.target),
      })),
    [suggestions],
  );

  return (
    <Card className="gap-0 rounded-[calc(var(--radius)+4px)] border border-dashed border-primary/40 bg-primary-soft/30 py-0 shadow-none ring-0">
      <CardContent className="flex min-w-0 flex-col gap-3 p-4 sm:p-5">
        <h2 className="flex items-center gap-2 text-[13px] font-semibold">
          <Sparkles className="size-4 shrink-0 text-primary" />
          {suggestions.length} connection{suggestions.length === 1 ? "" : "s"} to review
        </h2>
        {/* Each suggestion is its own bordered card. Flat, they ran together into one
            column of rows where a pair of buttons could belong to the row above or the
            two rows above -- the grouping has to be drawn, not inferred from spacing.
            Scrolls inside itself so a backfill's worth of them does not push the page
            metres past the canvas beside it. */}
        <ul className="-mr-1 flex max-h-[560px] min-w-0 flex-col gap-3 overflow-y-auto overscroll-contain pr-1 lg:max-h-[640px]">
          {rows.map((suggestion) => (
            <li
              key={suggestion.id}
              className="flex min-w-0 flex-col gap-2 rounded-2xl border border-border/70 bg-background p-3 shadow-[0_6px_18px_-16px_rgba(15,23,42,0.4)]"
            >
              {/* Not links and not favouritable: this is a decision about the pair, and a
                  full-card link here navigates away from the queue somebody is working
                  through. */}
              <MemoryRow m={suggestion.left} interactive={false} />
              <span className="flex items-center gap-1.5 pl-1 text-[11.5px] font-medium text-muted-foreground">
                <Link2 className="size-3 shrink-0 text-primary" />
                {relationLabel(suggestion.relation, "outgoing")}
              </span>
              <MemoryRow m={suggestion.right} interactive={false} />
              {suggestion.ai_reason && <ConnectChip label={suggestion.ai_reason} />}
              <div className="mt-0.5 flex flex-wrap gap-2">
                <Button
                  onClick={() => confirm.mutate(suggestion.id)}
                  disabled={confirm.isPending}
                  className={`${plain} h-10 gap-1.5 px-3.5 text-[12.5px] font-semibold`}
                >
                  <Check className="size-3.5" /> Connect
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => dismiss.mutate(suggestion.id)}
                  disabled={dismiss.isPending}
                  className={`${plain} h-10 gap-1.5 px-3.5 text-[12.5px] font-semibold text-muted-foreground`}
                >
                  <X className="size-3.5" /> Not related
                </Button>
              </div>
            </li>
          ))}
        </ul>
        <p className="text-[11.5px] leading-relaxed text-muted-foreground">
          Suggestions stay off the map until you accept one. Dismissing means Recall will
          not suggest that pair again — you can still connect them yourself later.
        </p>
      </CardContent>
    </Card>
  );
}

/**
 * `/connections` with no memory named: the whole vault, as a canvas you manage.
 *
 * This replaced a list, and the reasoning is worth keeping. The page is a top-level nav
 * destination, so it is reached with no parameter every time somebody clicks it — and
 * what it used to offer was a column of suggestions to approve one at a time. That is a
 * chore rather than a place: it shows what the system decided and gives no way to see
 * why, no way to see what *else* the memory sits near, and no way to connect two things
 * yourself without first opening one of them.
 *
 * A canvas answers all three with one surface, and the two ways an edge comes into
 * existence become the same gesture in the same place: a model proposes one and it
 * appears as a ghost you accept where it is drawn, or you drag one card onto another and
 * it is yours immediately.
 *
 * **The list did not go away.** It is the right-hand column when nothing is selected, and
 * it is the keyboard path — drag-to-connect has no keyboard equivalent worth pretending
 * about, so every action on the canvas is also an action in the list rather than the
 * canvas being the only way to reach one.
 *
 * **A vault with no edges still gets the old picker**, because a canvas of nothing is a
 * worse empty state than a list of the memories somebody could connect.
 */
function VaultMap() {
  const { isLoading: sessionLoading } = useSession();
  const graph = useConnectionGraph();
  const suggestions = useConnectionSuggestions();
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [drawn, setDrawn] = useState<DrawnPair | null>(null);

  const create = useCreateConnection();
  const confirm = useConfirmConnection();
  const dismiss = useDismissConnection();
  const update = useUpdateConnection();
  const retype = useRetypeConnection();
  const remove = useDeleteConnection();

  const byId = useMemo(() => {
    const map = new Map<string, VaultItem>();
    for (const node of graph.data?.nodes ?? []) map.set(node.id, node);
    return map;
  }, [graph.data?.nodes]);

  // The edge *and* both of its memories, resolved together. Resolving them separately and
  // falling back to "some other node" would render an inspector describing an edge that
  // does not exist -- the worst shape a bug can have here, since nothing errors and the
  // buttons all still work on the real row.
  const selected = useMemo(() => {
    const edge = (graph.data?.edges ?? []).find((row) => row.id === selectedEdgeId);
    if (!edge) return null;
    const source = byId.get(edge.source_id);
    const target = byId.get(edge.target_id);
    return source && target ? { edge, source, target } : null;
  }, [graph.data?.edges, selectedEdgeId, byId]);

  // Exactly the edge being written, so one pending mutation does not grey out the whole
  // canvas. `variables` is the id for every one of these except `update`, which takes an
  // object.
  const busyEdgeIds = useMemo(() => {
    const busy = new Set<string>();
    if (confirm.isPending && confirm.variables) busy.add(confirm.variables);
    if (dismiss.isPending && dismiss.variables) busy.add(dismiss.variables);
    if (retype.isPending && retype.variables) busy.add(retype.variables);
    if (remove.isPending && remove.variables) busy.add(remove.variables);
    if (update.isPending && update.variables) busy.add(update.variables.id);
    return busy;
  }, [
    confirm.isPending, confirm.variables,
    dismiss.isPending, dismiss.variables,
    retype.isPending, retype.variables,
    remove.isPending, remove.variables,
    update.isPending, update.variables,
  ]);

  const onDraw = useCallback(
    (sourceId: string, targetId: string) => {
      const source = byId.get(sourceId);
      const target = byId.get(targetId);
      // Both ends have to be on the canvas for the dialog to show what is being drawn.
      // A miss here means a stale render, not a reason to write an edge nobody could see.
      if (source && target) setDrawn({ source, target });
    },
    [byId],
  );

  /**
   * `isPending`, not `isLoading` -- and the session's own load alongside it.
   *
   * `useConnectionGraph` is `enabled: isSignedIn`, and a *disabled* React Query is not
   * "loading": `isLoading` is `isPending && isFetching`, which is false while nothing is
   * allowed to fetch yet. So during the window where `/auth/me` is still in flight this
   * gate was false, `graph.data` was undefined, `edges` was `[]` -- and the page answered
   * "Nothing to connect yet" to somebody with a vault full of connections, on every cold
   * load. `isPending` is true whenever the query has no answer, disabled included, which
   * is the question actually being asked here.
   */
  if (sessionLoading || graph.isPending) return <ConnectionsSkeleton />;

  const edges = graph.data?.edges ?? [];
  const pending = suggestions.data?.suggestions ?? [];

  // Nothing drawn yet. The picker is a better answer than an empty canvas -- it lists the
  // memories somebody could connect, which is the next thing they need.
  if (!graph.isError && edges.length === 0) return <FocusPicker />;

  if (graph.isError || !graph.data) {
    return (
      <Card className="gap-0 rounded-3xl border border-destructive/30 bg-destructive/5 py-0 shadow-none ring-0">
        <CardContent className="px-6 py-12 text-center" role="alert">
          <h2 className="font-display text-[20px] tracking-tight text-destructive">
            We couldn&rsquo;t load your map
          </h2>
          <p className="mx-auto mt-1.5 max-w-sm text-[13px] leading-relaxed text-destructive/85">
            Your connections are saved — this is just the map failing to load.
          </p>
          <Button
            variant="ghost"
            onClick={() => graph.refetch()}
            className={`${plain} mt-4 h-11 px-4 text-[13.5px] font-semibold text-destructive hover:bg-destructive/10`}
          >
            Try again
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-4 xl:flex-row">
      <div className="min-w-0 flex-1">
        <VaultCanvas
          graph={graph.data}
          selectedEdgeId={selectedEdgeId}
          onSelectEdge={setSelectedEdgeId}
          onDraw={onDraw}
          busyEdgeIds={busyEdgeIds}
        />
      </div>

      <aside className="flex w-full shrink-0 flex-col gap-4 xl:max-w-sm">
        {selected ? (
          <EdgeInspector
            edge={selected.edge}
            source={selected.source}
            target={selected.target}
            busy={busyEdgeIds.has(selected.edge.id)}
            // Hidden once the server has answered 503 -- labelling is off by default, so
            // a button that is always offered is usually one that does nothing. The first
            // press is what finds out; after that it stops asking.
            canRetype={!retype.isError}
            onConfirm={() => confirm.mutate(selected.edge.id)}
            onDismiss={() => {
              dismiss.mutate(selected.edge.id);
              setSelectedEdgeId(null);
            }}
            onRelabel={(relation) => update.mutate({ id: selected.edge.id, relation })}
            onRetype={() => retype.mutate(selected.edge.id)}
            onRemove={() => {
              remove.mutate(selected.edge.id);
              setSelectedEdgeId(null);
            }}
            onClose={() => setSelectedEdgeId(null)}
          />
        ) : pending.length > 0 ? (
          <SuggestionInbox suggestions={pending} />
        ) : (
          <Card className="gap-0 rounded-[calc(var(--radius)+4px)] border border-dashed border-border py-0 shadow-none ring-0">
            <CardContent className="p-5">
              <h2 className="text-[13px] font-semibold">Nothing to review</h2>
              <p className="mt-1.5 text-[12.5px] leading-relaxed text-muted-foreground">
                Every suggestion has been decided. Tap a connection on the map to change or
                remove it, or drag one memory onto another to make a new one.
              </p>
            </CardContent>
          </Card>
        )}
      </aside>

      <ConnectDialog
        // Keyed on the pair so a second drag starts from `related_to` and an empty note
        // rather than inheriting the last one's. See that component's docstring.
        key={drawn ? `${drawn.source.id}-${drawn.target.id}` : "idle"}
        pair={drawn}
        pending={create.isPending}
        onCancel={() => setDrawn(null)}
        onConfirm={(relation, note) => {
          if (!drawn) return;
          create.mutate(
            {
              sourceId: drawn.source.id,
              targetId: drawn.target.id,
              relation,
              note: note.trim() || null,
            },
            // Closed on success only. A failed write that dismissed the dialog would
            // leave somebody looking at a canvas with no new edge and no explanation.
            { onSuccess: () => setDrawn(null) },
          );
        }}
      />
    </div>
  );
}


/**
 * What `/connections` shows with no memory named.
 *
 * A picker, never an invented focus: this page is a top-level destination, so it is
 * reached with no parameter every time somebody clicks it in the nav, and quietly picking
 * a memory for them would be a page that claims to be about something they did not ask
 * about.
 *
 * **Ordered by how connected each memory is**, not by date. A list of the newest saves
 * points at exactly the wrong memories -- the newest capture is usually the *least*
 * connected, because everything it links to was found from its side and nothing has been
 * saved since. A vault with no edges yet has no hubs, and then recent memories are the
 * only honest thing to offer.
 */
function FocusPicker() {
  const { isLoading: sessionLoading } = useSession();
  const hubs = useConnectionHubs();
  // Decisions waiting on a person come before anything to browse. A backfill lands a
  // whole vault's worth here at once, and until this rendered there was no page that
  // listed them at all.
  const suggestions = useConnectionSuggestions();
  // Issued alongside the hubs rather than after them. Waiting to see whether there are
  // hubs before asking for the fallback would make the *empty* vault -- the one case
  // that always needs it -- pay two serial round trips, and against a database in another
  // region those add up where issued together they cost one. The price is one request a
  // connected vault does not render.
  const recent = useVaultItems({ limit: 20, offset: 0 });
  // Memoised off the response itself: `?? []` builds a new array every render, which
  // would defeat every memo downstream of it.
  const hubRows = useMemo(() => hubs.data?.hubs ?? [], [hubs.data?.hubs]);
  const hubCards = useMemo(
    () =>
      hubRows.map((h) => ({
        memory: toMemory(h.memory),
        count: h.connection_count as number | null,
      })),
    [hubRows],
  );
  const recentCards = useMemo(
    () =>
      (recent.data?.items ?? []).map((item) => ({
        memory: toMemory(item),
        count: null as number | null,
      })),
    [recent.data?.items],
  );

  // Same reason as the gate in `ConnectionView`: a disabled query is not `isLoading`,
  // and reading it as "done" is what turned a cold load into an empty vault.
  if (sessionLoading || hubs.isPending || (!hubRows.length && recent.isPending)) {
    return (
      <div aria-busy="true" aria-label="Loading memories" className="flex flex-col gap-2.5">
        {[0, 1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-20 w-full rounded-2xl" />
        ))}
      </div>
    );
  }

  const pending = suggestions.data?.suggestions ?? [];

  if (!hubRows.length && !pending.length && !recentCards.length) {
    return (
      <Card className="gap-0 rounded-3xl border border-dashed border-border bg-secondary/30 py-0 shadow-none ring-0">
        <CardContent className="px-6 py-14 text-center">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-primary-soft text-primary">
            <Link2 className="h-5 w-5" />
          </div>
          <h2 className="mt-4 font-display text-[22px] tracking-tight">Nothing to connect yet</h2>
          <p className="mx-auto mt-1.5 max-w-md text-[13px] leading-relaxed text-muted-foreground">
            Save a few memories first — connections are drawn between them.
          </p>
        </CardContent>
      </Card>
    );
  }

  const connected = hubCards.length > 0;
  const rows = connected ? hubCards : recentCards;

  return (
    <div className="flex flex-col gap-4">
      {pending.length > 0 && <SuggestionInbox suggestions={pending} />}
      <p className="text-[13px] text-muted-foreground">
        {connected
          ? "Your most connected memories. Open one to see how it relates to the rest."
          : pending.length
            ? "Nothing is confirmed yet — review the suggestions above to build the map."
            : "Nothing is connected yet. Open a memory to start connecting it to others."}
      </p>
      <div className="flex flex-col gap-2.5">
        {rows.map(({ memory, count }) => (
          <div key={memory.id} className="flex flex-col gap-1.5">
            {count !== null && (
              <span className="flex items-center gap-1.5 text-[11.5px] text-muted-foreground">
                <Link2 className="size-3 shrink-0 text-primary" />
                {count} connected
              </span>
            )}
            {/* `href` rather than a wrapping `<Link>`: the row already renders a
                full-bleed anchor of its own, and nesting one inside another is invalid
                HTML that React reports as a hydration error. */}
            <MemoryRow
              m={memory}
              href={`/connections?memory=${encodeURIComponent(memory.id)}`}
              label={`See what connects to ${memory.title}`}
            />
          </div>
        ))}
      </div>
    </div>
  );
}


/** Relations in the order `RELATIONS` declares, so the page does not reshuffle itself. */
function groupByRelation(
  connections: MemoryConnection[],
): [Relation, MemoryConnection[]][] {
  const groups = new Map<Relation, MemoryConnection[]>();
  for (const connection of connections) {
    const existing = groups.get(connection.relation);
    if (existing) existing.push(connection);
    else groups.set(connection.relation, [connection]);
  }
  return [...groups.entries()];
}
