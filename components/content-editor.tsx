"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type EditorJS from "@editorjs/editorjs";
import {
  Code2,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Loader2,
  Quote,
  Save,
  Type,
  X,
} from "lucide-react";
import { toast } from "@/lib/toast";
import { Button } from "@/components/ui/button";
import { useUpdateVaultContent } from "@/hooks/use-vault";
import { ApiError } from "@/lib/api";
import { toEditorBlocks } from "@/lib/editor-doc";
import type { VaultItemDetail } from "@/lib/types";

const plain = "rounded-xl tracking-normal normal-case";

/**
 * The block tools, as an always-visible row.
 *
 * EditorJS's own block toolbar is a floating affordance that only appears once you hover
 * or focus a block, and it positions itself from measurements taken at init. That makes
 * it invisible often enough that the tools may as well not exist — so the formatting
 * controls are rendered here instead, where they are on screen before the user looks for
 * them. The native inline toolbar (bold/italic/link on a selection) is left alone.
 *
 * `convertible: false` marks a tool with no `conversionConfig`, which `blocks.convert`
 * rejects on — those are inserted as a new block instead of transforming the current one.
 */
const TOOLS = [
  { type: "paragraph", data: {}, icon: Type, label: "Text", convertible: true },
  { type: "header", data: { level: 2 }, icon: Heading2, label: "Heading", convertible: true },
  { type: "header", data: { level: 3 }, icon: Heading3, label: "Subheading", convertible: true },
  {
    type: "list",
    data: { style: "unordered" },
    icon: List,
    label: "Bulleted list",
    convertible: true,
  },
  {
    type: "list",
    data: { style: "ordered" },
    icon: ListOrdered,
    label: "Numbered list",
    convertible: true,
  },
  { type: "quote", data: {}, icon: Quote, label: "Quote", convertible: true },
  { type: "code", data: { code: "" }, icon: Code2, label: "Code", convertible: false },
] as const;

/** Where the visual groups break, so related tools sit together. */
const GROUP_AFTER = new Set([2, 4]);

/**
 * The manual editing surface for a memory's body.
 *
 * EditorJS owns a real DOM node rather than a React tree, so it is created once in an
 * effect and torn down on unmount — the holder is rendered childless and React never
 * diffs what the editor puts inside it.
 *
 * **The holder must be visible when the editor is constructed.** EditorJS measures its
 * container at init to decide where the block toolbar goes and whether to switch to its
 * narrow layout; built inside a `display: none` element it measures zero, and the
 * toolbar then never appears at all. The loading line therefore sits *above* an
 * already-mounted holder rather than replacing it.
 *
 * Everything that goes *into* the editor is HTML-escaped first (`lib/editor-doc.ts`):
 * the seed text is a scraped page, and a contenteditable renders whatever it is given.
 * Everything that comes *out* is re-sanitized server-side — the tools' own sanitizer is
 * a convenience, not a control we can rely on, since the request can be made without it.
 */
export function ContentEditor({
  item,
  onClose,
}: {
  item: VaultItemDetail;
  onClose: () => void;
}) {
  const holderRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<EditorJS | null>(null);
  const [ready, setReady] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [confirmingDiscard, setConfirmingDiscard] = useState(false);
  const update = useUpdateVaultContent(item.id);

  useEffect(() => {
    let disposed = false;
    let instance: EditorJS | null = null;

    // Imported here rather than at module scope: the editor touches `document` while it
    // builds its UI, and this component is inside a page that renders on the server.
    void (async () => {
      const [{ default: EditorConstructor }, header, list, quote, code] = await Promise.all([
        import("@editorjs/editorjs"),
        import("@editorjs/header"),
        import("@editorjs/list"),
        import("@editorjs/quote"),
        import("@editorjs/code"),
      ]);
      if (disposed || !holderRef.current) return;

      instance = new EditorConstructor({
        holder: holderRef.current,
        // The editor's own default reserves 300px of empty space below the last block,
        // which reads as a broken layout inside a page that is not a full-height editor.
        minHeight: 120,
        placeholder: "Write what you want to remember…",
        data: { blocks: toEditorBlocks(item) },
        tools: {
          header: { class: header.default, inlineToolbar: true },
          list: { class: list.default, inlineToolbar: true },
          quote: { class: quote.default, inlineToolbar: true },
          code: { class: code.default },
        },
        onChange: () => setDirty(true),
        onReady: () => {
          if (!disposed) setReady(true);
        },
      });
      editorRef.current = instance;
    })();

    return () => {
      disposed = true;
      setReady(false);
      // `destroy` only exists once the instance finished initialising; on a fast unmount
      // (React's development double-effect) the constructor may still be running, so the
      // teardown waits for readiness rather than assuming it.
      const pending = instance ?? editorRef.current;
      editorRef.current = null;
      void pending?.isReady
        .then(() => pending.destroy())
        .catch(() => {
          /* the instance never came up; there is nothing to tear down */
        });
    };
    // Mount-once on purpose: re-running this would rebuild the editor mid-typing and
    // throw away the user's unsaved blocks. Reopening the editor is what reloads `item`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * Turn the block the caret is in into `type`, or add one when that is not possible.
   *
   * With no caret anywhere (the user pressed a tool button before clicking into the
   * text) there is no block to convert, so the new one goes on the end — which is where
   * someone who has not placed a cursor is expecting to write.
   */
  const applyTool = async (tool: (typeof TOOLS)[number]) => {
    const editor = editorRef.current;
    if (!editor) return;
    const data = { ...tool.data } as Record<string, unknown>;
    const index = editor.blocks.getCurrentBlockIndex();
    const current = index >= 0 ? editor.blocks.getBlockByIndex(index) : undefined;

    try {
      if (current && tool.convertible) {
        await editor.blocks.convert(current.id, tool.type, data);
        editor.caret.setToBlock(index, "end");
        return;
      }
      const at = index >= 0 ? index + 1 : editor.blocks.getBlocksCount();
      editor.blocks.insert(tool.type, data, undefined, at, true);
    } catch {
      // A tool can refuse a conversion (an empty block, an incompatible shape). Adding
      // one is always available, and silently doing nothing would read as a dead button.
      editor.blocks.insert(tool.type, data, undefined, undefined, true);
    }
    setDirty(true);
  };

  const close = useCallback(() => {
    if (dirty && !confirmingDiscard) {
      setConfirmingDiscard(true);
      return;
    }
    onClose();
  }, [dirty, confirmingDiscard, onClose]);

  // Escape is the expected way out of an editing mode, and the confirm step means it
  // still cannot discard unsaved work on the first press.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [close]);

  const save = async () => {
    const editor = editorRef.current;
    if (!editor || update.isPending) return;
    let blocks;
    try {
      ({ blocks } = await editor.save());
    } catch {
      toast.error("Couldn't read the editor", { description: "Try again in a moment." });
      return;
    }
    update.mutate(blocks, {
      onSuccess: () => {
        toast.success("Content saved", { description: item.title ?? "This memory" });
        setDirty(false);
        onClose();
      },
      onError: (error) => {
        // 422 is the backend explaining what it refused (an empty document, too much
        // text); anything else is not the user's fault and gets a generic line.
        const detail =
          error instanceof ApiError && error.status === 422
            ? error.message
            : "Your text is still here — try saving again.";
        toast.error("Couldn't save that", { description: detail });
      },
    });
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3">
        <p className="text-[12.5px] text-muted-foreground" role="status">
          {confirmingDiscard
            ? "Discard your changes?"
            : dirty
              ? "Unsaved changes"
              : "Editing the full content"}
        </p>
        <div className="flex shrink-0 items-center gap-2">
          <Button
            variant="outline"
            onClick={close}
            disabled={update.isPending}
            className={`${plain} h-10 gap-1.5 border-border bg-card px-3 text-[12.5px] font-medium text-foreground/80 hover:bg-secondary`}
          >
            <X className="size-3.5" aria-hidden />
            {confirmingDiscard ? "Discard changes" : "Cancel"}
          </Button>
          <Button
            onClick={save}
            disabled={!ready || update.isPending}
            aria-label="Save content"
            className={`${plain} h-10 gap-1.5 gradient-primary px-4 text-[12.5px] font-semibold text-white hover:bg-transparent`}
          >
            {update.isPending ? (
              <Loader2 className="size-3.5 animate-spin" aria-hidden />
            ) : (
              <Save className="size-3.5" aria-hidden />
            )}
            {update.isPending ? "Saving…" : "Save"}
          </Button>
        </div>
      </div>

      {/* Sticky so the tools stay reachable in a body long enough to scroll past them. */}
      <div
        role="toolbar"
        aria-label="Formatting"
        aria-controls="recall-editor-body"
        className="sticky top-0 z-10 flex flex-wrap items-center gap-1 border-b border-border bg-card/95 px-3 py-2 backdrop-blur"
      >
        {TOOLS.map((tool, i) => (
          <div key={`${tool.type}-${tool.label}`} className="flex items-center">
            <Button
              variant="ghost"
              // Without this the button takes focus on mousedown, the caret leaves the
              // contenteditable, and `getCurrentBlockIndex()` answers -1 — so every tool
              // appended an empty block at the end instead of formatting the block the
              // user was actually in.
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => void applyTool(tool)}
              disabled={!ready}
              title={tool.label}
              aria-label={tool.label}
              className={`${plain} h-9 gap-1.5 px-2.5 text-[12.5px] font-medium text-foreground/70 hover:bg-secondary hover:text-foreground`}
            >
              <tool.icon className="size-4" aria-hidden />
              <span className="hidden sm:inline">{tool.label}</span>
            </Button>
            {GROUP_AFTER.has(i) && <span className="mx-1 h-5 w-px bg-border" aria-hidden />}
          </div>
        ))}
      </div>

      {!ready && (
        <p className="px-5 py-6 text-[13.5px] text-muted-foreground" aria-live="polite">
          Loading the editor…
        </p>
      )}
      {/* Owned by EditorJS from mount to unmount — never given React children, and never
          hidden: it has to have a real width when the editor measures it. */}
      <div
        id="recall-editor-body"
        ref={holderRef}
        className="recall-editor px-3 pb-2 text-[15px] leading-relaxed sm:text-[16px]"
      />
    </div>
  );
}
