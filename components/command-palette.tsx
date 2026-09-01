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
import {
  CalendarClock,
  Layers,
  Library,
  type LucideIcon,
  MessageCircle,
  Network,
  Home,
  Pencil,
  Smartphone,
  Sparkles,
} from "lucide-react";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
} from "@/components/ui/command";
import { useStore } from "@/lib/store";
import { useSpaces } from "@/hooks/use-spaces";
import { kindMeta } from "@/lib/mock-data";

type Command = {
  id: string;
  label: string;
  hint: string;
  /** Extra text matched by search but not displayed (tags, space, summary). */
  keywords?: string;
  icon: LucideIcon;
  href: string;
};

const pageCommands: Command[] = [
  { id: "p-home", label: "Home", hint: "Dashboard", icon: Home, href: "/" },
  { id: "p-vault", label: "All memories", hint: "Vault", icon: Library, href: "/vault" },
  { id: "p-connections", label: "Connections", hint: "Memory network", icon: Network, href: "/connections" },
  { id: "p-spaces", label: "Spaces", hint: "Collections", icon: Layers, href: "/spaces" },
  { id: "p-chat", label: "Ask Recall", hint: "Chat", icon: MessageCircle, href: "/chat" },
  { id: "p-timeline", label: "Timeline", hint: "By month", icon: CalendarClock, href: "/timeline" },
  { id: "p-capture", label: "Telegram capture", hint: "Bot", icon: Sparkles, href: "/capture" },
  { id: "p-editor", label: "Smart editor", hint: "Write", icon: Pencil, href: "/editor" },
  { id: "p-mobile", label: "Mobile preview", hint: "Screens", icon: Smartphone, href: "/mobile" },
];

const CommandPaletteContext = createContext<{ open: () => void } | null>(null);

export function useCommandPalette() {
  const ctx = useContext(CommandPaletteContext);
  if (!ctx) throw new Error("useCommandPalette must be used inside <CommandPaletteProvider>");
  return ctx;
}

export function CommandPaletteProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();
  const { memories } = useStore();
  // Spaces are real. Memories in this palette are still the local store -- searching the
  // vault for real needs the search endpoint, which is its own piece of work.
  const { data: spaces } = useSpaces();
  const open = useCallback(() => setIsOpen(true), []);
  const value = useMemo(() => ({ open }), [open]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsOpen((current) => !current);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const groups = useMemo(() => {
    const spaceCommands: Command[] = (spaces ?? []).map((s) => ({
      id: `s-${s.id}`,
      label: s.name,
      hint: `${s.memory_count} ${s.memory_count === 1 ? "memory" : "memories"}`,
      keywords: s.ai_overview ?? s.description ?? "",
      icon: Layers,
      href: `/spaces/${s.id}`,
    }));
    const memoryCommands: Command[] = memories.map((m) => ({
      id: `m-${m.id}`,
      label: m.title,
      hint: `${kindMeta[m.kind].label} · ${m.savedAt}`,
      keywords: `${m.tags.join(" ")} ${m.space ?? ""} ${m.source} ${m.summary}`,
      icon: Sparkles,
      href: `/memory/${m.id}`,
    }));
    return [
      { heading: "Go to", items: pageCommands },
      // An empty group renders as a bare heading, which reads as "you have no spaces"
      // even while they are still loading.
      ...(spaceCommands.length ? [{ heading: "Spaces", items: spaceCommands }] : []),
      { heading: "Memories", items: memoryCommands },
    ];
  }, [memories, spaces]);

  const go = useCallback(
    (href: string) => {
      setIsOpen(false);
      router.push(href);
    },
    [router],
  );

  return (
    <CommandPaletteContext.Provider value={value}>
      {children}
      <CommandDialog
        open={isOpen}
        onOpenChange={setIsOpen}
        title="Search"
        description="Search memories, spaces and pages"
        className="rounded-3xl border-border ring-0"
      >
        {/* This style's CommandDialog does not wrap children in <Command>, and cmdk
            needs that provider for its store. */}
        <Command className="rounded-3xl bg-card">
        <CommandInput placeholder="Search memories, spaces, ideas…" />
        <CommandList className="max-h-[min(24rem,50vh)]">
          <CommandEmpty className="px-3 py-10">
            <span className="block text-[14px] font-semibold">No matches</span>
            <span className="mt-1 block text-[12.5px] text-muted-foreground">
              Try a different word, or capture it as a new memory from Home.
            </span>
          </CommandEmpty>
          {groups.map((group) => (
            <CommandGroup
              key={group.heading}
              heading={group.heading}
              className="**:[[cmdk-group-heading]]:text-[10.5px] **:[[cmdk-group-heading]]:tracking-wider"
            >
              {group.items.map((c) => (
                <CommandItem
                  key={c.id}
                  value={`${c.label} ${c.hint} ${c.keywords ?? ""}`}
                  onSelect={() => go(c.href)}
                  className="gap-3 rounded-xl px-3 py-2.5 data-selected:bg-primary-soft data-selected:text-accent-foreground"
                >
                  <c.icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="min-w-0 flex-1 truncate text-[13.5px] font-medium">{c.label}</span>
                  <CommandShortcut className="hidden text-[11.5px] tracking-normal normal-case sm:block">
                    {c.hint}
                  </CommandShortcut>
                </CommandItem>
              ))}
            </CommandGroup>
          ))}
        </CommandList>
        </Command>
      </CommandDialog>
    </CommandPaletteContext.Provider>
  );
}
