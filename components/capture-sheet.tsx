"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { Link2, Loader2, Mic, StickyNote, Upload, X } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { toast } from "@/lib/toast";
import { useConnectionSuggest } from "@/components/connection-suggest";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { ApiError } from "@/lib/api";
import { fileFromClipboard, rejectionFor } from "@/lib/uploads";
import {
  useDeleteVaultItem,
  useSaveNote,
  useSaveUrl,
  useSaveVoiceNote,
  useUploadDocument,
  useUploadLimits,
} from "@/hooks/use-vault";
import { VoiceRecorder } from "@/components/voice-recorder";
import { FilePicker } from "@/components/file-picker";
import type { VoiceClip } from "@/hooks/use-voice-recorder";
import { useIsMobile } from "@/hooks/use-mobile";
import { motionVariants, stagger, fadeUp, transition } from "@/lib/motion";

type CaptureKind = "link" | "note" | "pdf" | "voice";

const kinds: { id: CaptureKind; label: string; hint: string; icon: typeof Link2 }[] = [
  { id: "link", label: "Paste link", hint: "Auto-detect & summarize", icon: Link2 },
  { id: "note", label: "Quick note", hint: "Title comes later", icon: StickyNote },
  { id: "pdf", label: "Upload file", hint: "PDF, image, doc", icon: Upload },
  { id: "voice", label: "Voice note", hint: "Hold to speak", icon: Mic },
];

/**
 * Where the recorder stops itself. Advisory only — the server enforces a size cap, since
 * duration is not knowable until the audio is decoded. Mirrors MAX_VOICE_NOTE_SECONDS.
 */
const MAX_VOICE_SECONDS = 300;

/** `title` is capped at 512 server-side; trim here so a long paste is not rejected. */
const TITLE_MAX = 512;

const CaptureContext = createContext<{ open: (kind?: CaptureKind) => void } | null>(null);

export function useCapture() {
  const ctx = useContext(CaptureContext);
  if (!ctx) throw new Error("useCapture must be used inside <CaptureProvider>");
  return ctx;
}

export function CaptureProvider({ children }: { children: ReactNode }) {
  const [openKind, setOpenKind] = useState<CaptureKind | null>(null);
  const open = useCallback((kind: CaptureKind = "note") => setOpenKind(kind), []);
  const value = useMemo(() => ({ open }), [open]);
  const isMobile = useIsMobile();

  const onOpenChange = (next: boolean) => {
    if (!next) setOpenKind(null);
  };

  return (
    <CaptureContext.Provider value={value}>
      {children}
      {isMobile ? (
        <Sheet open={openKind !== null} onOpenChange={onOpenChange}>
          <SheetContent
            side="bottom"
            showCloseButton={false}
            className="max-h-[92dvh] gap-0 overflow-y-auto overscroll-contain rounded-t-[28px] border-border bg-card p-5 pb-[calc(env(safe-area-inset-bottom)+1.25rem)] text-card-foreground"
          >
            <div aria-hidden className="mx-auto mb-4 h-1 w-10 rounded-full bg-border" />
            <CaptureForm
              kind={openKind ?? "note"}
              onDone={() => setOpenKind(null)}
              CloseButton={SheetClose}
              TitleSlot={SheetTitle}
              DescriptionSlot={SheetDescription}
            />
          </SheetContent>
        </Sheet>
      ) : (
        <Dialog open={openKind !== null} onOpenChange={onOpenChange}>
          <DialogContent
            showCloseButton={false}
            className="max-w-lg gap-0 rounded-3xl border-border bg-card p-5 text-card-foreground ring-0 sm:max-w-lg"
          >
            <CaptureForm
              kind={openKind ?? "note"}
              onDone={() => setOpenKind(null)}
              CloseButton={DialogClose}
              TitleSlot={DialogTitle}
              DescriptionSlot={DialogDescription}
            />
          </DialogContent>
        </Dialog>
      )}
    </CaptureContext.Provider>
  );
}

function CaptureForm({
  kind: initialKind,
  onDone,
  CloseButton,
  TitleSlot,
  DescriptionSlot,
}: {
  kind: CaptureKind;
  onDone: () => void;
  CloseButton: typeof SheetClose;
  TitleSlot: typeof SheetTitle;
  DescriptionSlot: typeof SheetDescription;
}) {
  const [kind, setKind] = useState<CaptureKind>(initialKind);
  const [primary, setPrimary] = useState("");
  const [details, setDetails] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [clip, setClip] = useState<VoiceClip | null>(null);
  const [file, setFile] = useState<File | null>(null);
  // null means "the user has not chosen", which is not the same as choosing auto-detect
  // (""). Kept as a separate state rather than seeded into `language` by an effect: the
  // server default arrives asynchronously, and an effect that writes it in would either
  // race a choice made while the request was in flight or cascade a render to fix it.
  const [chosenLanguage, setChosenLanguage] = useState<string | null>(null);
  // What was announced to a screen reader about the last paste. The picture of the file
  // arriving is the whole feedback for a sighted user; this is the same event in words.
  const [pasteNotice, setPasteNotice] = useState("");
  const router = useRouter();
  const suggest = useConnectionSuggest();
  const reduced = useReducedMotion();
  const groupVariants = motionVariants(reduced, stagger(0.045));
  const itemVariants = motionVariants(reduced, fadeUp);

  const saveUrl = useSaveUrl();
  const saveNote = useSaveNote();
  const saveVoice = useSaveVoiceNote();
  const upload = useUploadDocument();
  const remove = useDeleteVaultItem();
  const limits = useUploadLimits();

  const isLink = kind === "link";
  const isNote = kind === "note";
  const isUpload = kind === "pdf";
  const isVoice = kind === "voice";
  // Undefined while the limits are in flight — treated as available so the recorder is
  // not hidden and then flashed in on a deployment where it works.
  const voiceOff = limits.data?.voice.enabled === false;
  const voiceLanguages = limits.data?.voice.languages ?? [];
  const serverDefaultLanguage = limits.data?.voice.default_language ?? "";
  // A deployment-wide default the user has not overridden, else their choice.
  const language = chosenLanguage ?? serverDefaultLanguage;
  const saving =
    saveUrl.isPending || saveNote.isPending || saveVoice.isPending || upload.isPending;

  // A clip or a file arriving is the user's answer to "record something first", so it
  // clears the error an empty submit put there.
  const onClipChange = useCallback((next: VoiceClip | null) => {
    setClip(next);
    if (next) setError(null);
  }, []);
  const onFileChange = useCallback((next: File | null) => {
    setFile(next);
    if (next) setError(null);
  }, []);

  /**
   * A pasted image is a capture.
   *
   * The clipboard is how a screenshot exists at all — cropping one out of a page or
   * hitting Cmd+Shift+4 leaves bytes and nothing else — so without this the only route
   * into the vault is to save it to disk first and pick it back up. The listener is on
   * the window rather than on the drop zone because a paste is aimed at the sheet: the
   * zone is a `<button>` and therefore never holds the caret.
   *
   * Three rules keep it from eating pastes it has no business in: it only fires when the
   * clipboard actually carries a file, it yields to text whenever the caret is in a field
   * that takes text (a clipboard copied out of a document carries both, and this sheet is
   * mostly used for pasting links), and the file is validated by exactly the code the
   * picker uses, so pasted and picked files cannot disagree about what is allowed.
   */
  useEffect(() => {
    const onPaste = (event: ClipboardEvent) => {
      if (saving) return;
      const data = event.clipboardData;
      if (isEditable(event.target) && (data?.getData("text/plain") ?? "").trim()) return;

      const pasted = fileFromClipboard(data);
      if (!pasted) return;

      event.preventDefault();
      setKind("pdf");
      if (pasted.error !== undefined) {
        setFile(null);
        setError(pasted.error);
        setPasteNotice(pasted.error);
        return;
      }
      const reason = rejectionFor(pasted.file, limits.data);
      setFile(reason ? null : pasted.file);
      setError(reason);
      setPasteNotice(reason ?? `Pasted image attached: ${pasted.file.name}.`);
    };

    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [saving, limits.data]);

  /**
   * One landing for every kind: close, confirm, offer an undo.
   *
   * The undo is a real delete rather than a local rollback — the row is already in the
   * vault and, for an upload or a recording, so is the object in the bucket, which
   * `VaultService.delete` removes along with it.
   */
  const landed = (item: { id: string; title: string | null }, fallback: string) => {
    onDone();
    // Ask to be told when this memory's connections have been derived. Nothing exists
    // yet -- derivation is the last step of processing -- so this is a watch, not a read.
    suggest.watch(item.id);
    toast.success("Saved to your vault", {
      // Nothing is summarized yet: the worker does that out of band, so say so rather
      // than showing an empty card and letting the user wonder.
      description: `${item.title ?? fallback} · Recall is reading it now`,
      action: { label: "Undo", onClick: () => remove.mutate(item.id) },
    });
    router.refresh();
  };

  /**
   * The API's own message when it is one a person can act on, generic copy otherwise.
   *
   * 4xx is written for humans ("that file type isn't supported", "we couldn't hear
   * anything"), and so are our 502/503 — "speech-to-text is unavailable", "voice notes
   * aren't available on this server". A bare 500 is not, and neither is a proxy error.
   */
  const failed = (err: unknown, fallback: string) => {
    const actionable =
      err instanceof ApiError && (err.status < 500 || err.status === 502 || err.status === 503);
    setError(actionable ? (err as ApiError).message : fallback);
  };

  const submit = () => {
    if (saving) return;
    const value = primary.trim();

    if (isVoice) {
      if (!clip) {
        setError("Hold the mic button and say something first.");
        return;
      }
      saveVoice.mutate(
        {
          blob: clip.blob,
          title: value || undefined,
          peaks: clip.peaks,
          language: language || undefined,
          duration: clip.seconds,
        },
        {
          onSuccess: (item) => landed(item, "Voice note"),
          onError: (err) =>
            failed(err, "Couldn't save that recording. Your audio is still here — try again."),
        },
      );
      return;
    }

    if (isUpload) {
      if (!file) {
        setError("Choose a file to capture.");
        return;
      }
      upload.mutate(file, {
        onSuccess: (item) => landed(item, file.name),
        onError: (err) => failed(err, "Upload failed. Check your connection and try again."),
      });
      return;
    }

    if (isLink) {
      // Validated here as well as by the server's `HttpUrl`: a 422 round trip to learn
      // that "recall.ai" has no scheme is a slow way to be told to add one.
      if (!isWebUrl(value)) {
        setError(
          value ? "That doesn't look like a link. It needs to start with http:// or https://."
                : "Paste a link to save.",
        );
        return;
      }
      saveUrl.mutate(
        { url: value, title: details.trim() || undefined },
        {
          onSuccess: (item) => landed(item, value),
          onError: (err) =>
            failed(err, "Couldn't reach the vault. Your link is still here — try again."),
        },
      );
      return;
    }

    if (!value) {
      setError("Give it a few words so Recall can find it later.");
      return;
    }
    saveNote.mutate(
      // `content` is required server-side and a note with a title and no body is a real
      // thing someone writes, so the title stands in as the body rather than the save
      // being refused for a field the form calls optional.
      { title: value.slice(0, TITLE_MAX), content: details.trim() || value },
      {
        onSuccess: (item) => landed(item, value),
        onError: (err) =>
          failed(err, "Couldn't reach the vault. Your note is still here — try again."),
      },
    );
  };

  // Which fields a kind shows is decided by what the API can actually store for it.
  // An upload has no title to give and a recording's body is the transcript, so offering
  // those fields would be offering to write somewhere nothing is read from.
  const primaryLabel = isLink ? "Link" : "Title";
  const primaryOptional = isVoice;
  const showPrimary = !isUpload;
  const showSecondary = isLink || isNote;

  return (
    <>
      <div className="flex items-start justify-between gap-3">
        <div>
          <DescriptionSlot className="mt-0 text-[11px] font-semibold tracking-wider text-primary uppercase">
            Capture
          </DescriptionSlot>
          <TitleSlot className="font-display text-[22px] leading-tight tracking-tight text-foreground normal-case">
            What do you want to remember?
          </TitleSlot>
        </div>
        <CloseButton
          render={
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Close capture"
              className="size-9 shrink-0 rounded-full text-muted-foreground"
            />
          }
        >
          <X className="size-4" />
        </CloseButton>
      </div>

      <ToggleGroup
        value={[kind]}
        onValueChange={(next) => {
          if (!next[0]) return;
          setKind(next[0] as CaptureKind);
          setError(null);
        }}
        render={<motion.div variants={groupVariants} initial="hidden" animate="show" />}
        className="mt-4 grid w-full grid-cols-2 gap-2"
      >
        {kinds.map((k) => (
          <ToggleGroupItem
            key={k.id}
            value={k.id}
            aria-label={k.label}
            render={<motion.button variants={itemVariants} />}
            className="relative h-auto min-w-0 flex-col items-start gap-0 whitespace-normal rounded-2xl border border-border bg-card px-3 py-3 text-left tracking-normal normal-case hover:bg-secondary/60"
          >
            {kind === k.id && (
              <motion.span
                layoutId="capture-kind"
                aria-hidden
                className="absolute inset-0 rounded-2xl border border-primary/40 bg-primary-soft"
                transition={reduced ? { duration: 0 } : transition.spring}
              />
            )}
            <span
              className={`relative grid h-8 w-8 place-items-center rounded-lg transition-colors ${
                kind === k.id ? "gradient-primary text-white" : "bg-secondary text-primary"
              }`}
            >
              <k.icon className="size-4" />
            </span>
            <span className="relative mt-2 text-[12.5px] font-semibold text-foreground">{k.label}</span>
            <span className="relative text-[10.5px] font-normal leading-snug text-muted-foreground">
              {k.hint}
            </span>
          </ToggleGroupItem>
        ))}
      </ToggleGroup>

      {isVoice &&
        (voiceOff ? (
          <div className="mt-4 rounded-2xl border border-border bg-secondary/40 px-4 py-5 text-center">
            <p className="text-[13px] font-semibold text-foreground">
              Voice notes aren&rsquo;t switched on here
            </p>
            <p className="mx-auto mt-1 max-w-xs text-[12.5px] leading-relaxed text-muted-foreground">
              This server has no speech-to-text key configured. Write a quick note instead
              — it is filed exactly the same way.
            </p>
          </div>
        ) : (
          <VoiceRecorder
            onClipChange={onClipChange}
            maxSeconds={limits.data?.voice.max_seconds ?? MAX_VOICE_SECONDS}
            busy={saveVoice.isPending}
            language={language}
            onLanguageChange={setChosenLanguage}
            languages={voiceLanguages}
          />
        ))}

      {isUpload && (
        <FilePicker file={file} onFileChange={onFileChange} limits={limits.data} busy={saving} />
      )}

      <p role="status" aria-live="polite" className="sr-only">
        {pasteNotice}
      </p>

      {showPrimary && (
        <div className="mt-4">
          <Label
            htmlFor="capture-input"
            className="text-[12px] font-medium tracking-normal text-foreground/80 normal-case"
          >
            {primaryLabel}{" "}
            {primaryOptional && (
              <span className="font-normal text-muted-foreground">(optional)</span>
            )}
          </Label>
          <Input
            id="capture-input"
            // The mic button is the primary control for a voice note; stealing focus into
            // a text field on open puts the caret where the user is not looking.
            autoFocus={!isVoice}
            value={primary}
            onChange={(e) => {
              setPrimary(e.target.value);
              if (error) setError(null);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") submit();
            }}
            // `url` gets the right mobile keyboard and turns off the capitalisation and
            // autocorrect that mangle a pasted address.
            type={isLink ? "url" : "text"}
            inputMode={isLink ? "url" : undefined}
            autoCapitalize={isLink ? "none" : undefined}
            autoCorrect={isLink ? "off" : undefined}
            spellCheck={isLink ? false : undefined}
            aria-invalid={Boolean(error) && !isVoice}
            aria-describedby={error && !isVoice ? "capture-error" : "capture-hint"}
            placeholder={
              isLink
                ? "https://…"
                : isVoice
                  ? "Name it, or let Recall name it"
                  : "An idea, a quote, a plan…"
            }
            className="mt-1.5 h-11 rounded-xl border border-border bg-secondary/50 px-3 text-[15px] focus-visible:border-primary/40 focus-visible:bg-white focus-visible:ring-4 focus-visible:ring-primary/10"
          />
          {error && !isVoice && !isUpload ? (
            <p id="capture-error" role="alert" className="mt-1.5 text-[12px] text-destructive">
              {error}
            </p>
          ) : (
            <p id="capture-hint" className="mt-1.5 text-[12px] text-muted-foreground">
              {isVoice
                ? "Leave it blank and Recall titles it from what you said."
                : isLink
                  ? "Recall opens it, reads it and files it — no folder needed."
                  : "No folder needed — Recall tags and connects it for you."}
            </p>
          )}
        </div>
      )}

      {showSecondary && (
        <div className="mt-3">
          <Label
            htmlFor="capture-details"
            className="text-[12px] font-medium tracking-normal text-foreground/80 normal-case"
          >
            {isLink ? "Title" : "Details"}{" "}
            <span className="font-normal text-muted-foreground">(optional)</span>
          </Label>
          {isLink ? (
            // A link's body is whatever the extractor reads from the page, so the only
            // thing left worth typing is a name for it.
            <Input
              id="capture-details"
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") submit();
              }}
              placeholder="Leave blank to use the page's own title"
              className="mt-1.5 h-11 rounded-xl border border-border bg-secondary/50 px-3 text-[15px] focus-visible:border-primary/40 focus-visible:bg-white focus-visible:ring-4 focus-visible:ring-primary/10"
            />
          ) : (
            <Textarea
              id="capture-details"
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              rows={3}
              placeholder="Anything worth keeping alongside it…"
              className="mt-1.5 min-h-20 rounded-xl border border-border bg-secondary/50 px-3 py-2.5 text-[14px] focus-visible:border-primary/40 focus-visible:bg-white focus-visible:ring-4 focus-visible:ring-primary/10"
            />
          )}
        </div>
      )}

      {/* A voice or upload failure is about the recording or the file, not about a text
          field, so it sits beside the action it blocks rather than under an input the
          user may never have touched. */}
      {(isVoice || isUpload) && error && (
        <p role="alert" className="mt-3 text-[12px] text-destructive">
          {error}
        </p>
      )}

      <div className="mt-4 flex items-center gap-2">
        <Button
          onClick={submit}
          disabled={saving || (isVoice && voiceOff)}
          className="h-11 flex-1 gap-1.5 rounded-xl gradient-primary text-[14px] font-semibold tracking-normal text-white normal-case shadow-[0_8px_24px_-10px_oklch(0.55_0.19_285/0.7)] hover:bg-transparent disabled:opacity-60"
        >
          {saving ? (
            <>
              {/* Named for what is actually happening. The wait for a voice note is the
                  transcription, not the upload, and a generic "Saving" reads as stuck. */}
              {saveVoice.isPending ? "Transcribing" : upload.isPending ? "Uploading" : "Saving"}{" "}
              <Loader2 className="size-3.5 animate-spin" aria-hidden />
            </>
          ) : (
            "Remember it"
          )}
        </Button>
        <CloseButton
          render={
            <Button
              variant="outline"
              disabled={saving}
              className="h-11 rounded-xl border-border bg-card px-4 text-[14px] font-medium tracking-normal text-foreground/80 normal-case disabled:opacity-60"
            />
          }
        >
          Cancel
        </CloseButton>
      </div>
    </>
  );
}

/** Whether a paste landing here is a paste into text, which must be left alone. */
function isEditable(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  return target.tagName === "INPUT" || target.tagName === "TEXTAREA";
}

/** Only plain web addresses. The server re-validates with pydantic's `HttpUrl`. */
function isWebUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}
