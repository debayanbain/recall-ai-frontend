"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Bold, Code, Italic, List, Loader2, Mic, Paperclip, Quote, Save, Sparkles } from "lucide-react";
import { toast } from "@/lib/toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { useSaveNote } from "@/hooks/use-vault";
import { ApiError } from "@/lib/api";

/** `title` is capped at 512 server-side; trim here so a long line is not rejected. */
const TITLE_MAX = 512;

const initialBody = `For years I tried to organize my notes into perfect hierarchies. PARA, johnny.decimal, elaborate tagging systems. None of them survived contact with how I actually think.

Categories assume the world stays put. Connections assume the opposite — that an idea picks up new meaning when you find an unexpected neighbor. That is what a second brain should be made of.

> "We are not what we know — we are what we can re-find at the moment we need it."

RecallAI is built around this. Capture is fast. Categorization is optional. Connections do the work.`;

const toolbar = [
  { icon: Bold, label: "Bold", wrap: ["**", "**"] },
  { icon: Italic, label: "Italic", wrap: ["_", "_"] },
  { icon: List, label: "Bulleted list", wrap: ["\n- ", ""] },
  { icon: Quote, label: "Blockquote", wrap: ["\n> ", ""] },
  { icon: Code, label: "Code", wrap: ["`", "`"] },
] as const;

const suggestions = [
  "Add a connection to How to Take Smart Notes",
  "Tag: #philosophy, #PKM",
  "Move to space: Building RecallAI",
  "Summary: A short manifesto against deep hierarchies in PKM.",
];

const plain = "rounded-xl tracking-normal normal-case";
const softCard = "card-soft gap-0 rounded-[calc(var(--radius)+4px)] py-0 shadow-none ring-0";

export function EditorView() {
  const [title, setTitle] = useState("Why connections matter more than categories");
  const [body, setBody] = useState(initialBody);
  const [dirty, setDirty] = useState(false);
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const router = useRouter();
  const saveNote = useSaveNote();

  const applyWrap = (before: string, after: string) => {
    const el = bodyRef.current;
    if (!el) return;
    const { selectionStart: start, selectionEnd: end } = el;
    const selected = body.slice(start, end) || "text";
    const next = `${body.slice(0, start)}${before}${selected}${after}${body.slice(end)}`;
    setBody(next);
    setDirty(true);
    // Restore a sensible caret position after React re-renders the value.
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(start + before.length, start + before.length + selected.length);
    });
  };

  const enhance = () => {
    setBody(
      (current) =>
        `${current}\n\n**Recall's take:** the argument holds because retrieval — not filing — is what a second brain is judged on. Consider linking this to your PARA and Zettelkasten notes.`,
    );
    setDirty(true);
    toast.success("AI enhanced", { description: "Added a closing takeaway you can edit or delete." });
  };

  /**
   * Save to the vault, not to the local store.
   *
   * `summary` and `tags` are deliberately not sent: the worker writes both from the body
   * moments later, and seeding them here with the first line and two guessed labels put
   * text on the card that nobody wrote and the pipeline then overwrote.
   *
   * `dirty` is cleared only after the API answers. Clearing it optimistically tells
   * someone their draft is safe while the request is still in flight, which is the one
   * moment it is not.
   */
  const save = () => {
    const value = title.trim();
    if (!value) {
      toast.info("Give the note a title first");
      return;
    }
    saveNote.mutate(
      // `content` is required server-side, and a note with a title and an empty body is
      // a real thing someone writes, so the title stands in rather than the save failing.
      { title: value.slice(0, TITLE_MAX), content: body.trim() || value },
      {
        onSuccess: (item) => {
          setDirty(false);
          toast.success("Note saved", { description: "Opening it in your vault." });
          router.push(`/memory/${item.id}`);
        },
        onError: (err) => {
          const actionable = err instanceof ApiError && err.status < 500;
          toast.error("Couldn't save that", {
            description: actionable
              ? (err as ApiError).message
              : "Your draft is still here — try again in a moment.",
          });
        },
      },
    );
  };

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2 text-[12px] text-muted-foreground">
        <span>Building RecallAI · draft</span>
        <span aria-live="polite" className={dirty ? "text-primary" : undefined}>
          {dirty ? "Unsaved changes" : "Draft saved"}
        </span>
      </div>

      <Label htmlFor="note-title" className="sr-only">
        Memory title
      </Label>
      <Input
        id="note-title"
        value={title}
        onChange={(e) => {
          setTitle(e.target.value);
          setDirty(true);
        }}
        className="h-auto min-h-11 border-transparent bg-transparent py-1 font-display text-[30px] leading-[1.1] tracking-tight text-foreground focus-visible:border-transparent sm:text-[44px] md:text-[56px]"
        placeholder="Untitled memory"
      />

      <div className="-mx-4 mt-4 flex items-center gap-1 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:rounded-2xl sm:border sm:border-border sm:bg-card sm:p-1.5">
        {toolbar.map((t) => (
          <Button
            key={t.label}
            variant="ghost"
            size="icon"
            aria-label={t.label}
            onClick={() => applyWrap(t.wrap[0], t.wrap[1])}
            className={`${plain} size-10 shrink-0 rounded-lg text-muted-foreground hover:bg-secondary sm:size-8`}
          >
            <t.icon className="size-3.5" />
          </Button>
        ))}
        <Separator orientation="vertical" className="mx-1 hidden h-5 sm:block" />
        <Button
          variant="ghost"
          size="icon"
          aria-label="Attach a file"
          onClick={() => toast.info("Attachments coming soon")}
          className={`${plain} size-10 shrink-0 rounded-lg text-muted-foreground hover:bg-secondary sm:size-8`}
        >
          <Paperclip className="size-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Attach a voice note"
          onClick={() => toast.info("Hold to record")}
          className={`${plain} size-10 shrink-0 rounded-lg text-muted-foreground hover:bg-secondary sm:size-8`}
        >
          <Mic className="size-3.5" />
        </Button>
        <Button
          onClick={enhance}
          className={`${plain} ml-auto h-10 shrink-0 gap-1.5 rounded-lg bg-primary-soft px-3 text-[12px] font-semibold text-accent-foreground hover:bg-primary-soft/80 sm:h-8 sm:px-2.5`}
        >
          <Sparkles className="size-3.5 text-primary" /> AI enhance
        </Button>
        <Button
          onClick={save}
          disabled={saveNote.isPending}
          className={`${plain} h-10 shrink-0 gap-1.5 rounded-lg gradient-primary px-3 text-[12px] font-semibold text-white hover:bg-transparent disabled:opacity-60 sm:h-8`}
        >
          {saveNote.isPending ? (
            <>
              <Loader2 className="size-3.5 animate-spin" aria-hidden /> Saving
            </>
          ) : (
            <>
              <Save className="size-3.5" aria-hidden /> Save note
            </>
          )}
        </Button>
      </div>

      <Label htmlFor="note-body" className="sr-only">
        Note body
      </Label>
      <Textarea
        id="note-body"
        ref={bodyRef}
        value={body}
        onChange={(e) => {
          setBody(e.target.value);
          setDirty(true);
        }}
        rows={16}
        className="mt-6 min-h-[26rem] resize-y rounded-2xl border-transparent bg-transparent text-[15px] leading-[1.75] text-foreground/85 focus-visible:border-border focus-visible:bg-card focus-visible:p-4 sm:text-[16px]"
      />

      <Card className={`${softCard} mt-6`}>
        <CardContent className="p-5">
          <div className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-wider text-primary">
            <Sparkles className="h-3.5 w-3.5 shrink-0" /> AI suggestions
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {suggestions.map((s) => (
              <Button
                key={s}
                variant="outline"
                onClick={() => toast.success("Applied", { description: s })}
                className={`${plain} h-auto min-h-11 justify-start border-border bg-secondary/40 p-3 text-left text-[12.5px] font-normal text-foreground/80 hover:border-primary/30 hover:bg-primary-soft`}
              >
                <span className="whitespace-normal">{s}</span>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
