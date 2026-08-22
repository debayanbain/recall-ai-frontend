import {
  CalendarClock,
  Home,
  Layers,
  Library,
  MessageCircle,
  Network,
  Pencil,
  Plus,
  Share2,
  Smartphone,
  Sparkles,
  type LucideIcon,
} from "lucide-react";

export type NavItem = { to: string; label: string; icon: LucideIcon };

/** Top-level destinations — the sidebar's primary group. */
export const nav: NavItem[] = [
  { to: "/", label: "Home", icon: Home },
  { to: "/vault", label: "All memories", icon: Library },
  { to: "/connections", label: "Connections", icon: Network },
  { to: "/spaces", label: "Spaces", icon: Layers },
  { to: "/chat", label: "Ask Recall", icon: MessageCircle },
  { to: "/timeline", label: "Timeline", icon: CalendarClock },
];

/** Secondary surfaces — kept out of the bottom nav so it stays top-level only. */
export const secondary: NavItem[] = [
  { to: "/capture", label: "Telegram capture", icon: Sparkles },
  { to: "/editor", label: "Smart editor", icon: Pencil },
  { to: "/share/building-recallai", label: "Public share page", icon: Share2 },
  { to: "/mobile", label: "Mobile preview", icon: Smartphone },
];

/** Mobile bottom bar — max five slots, centre one is the capture action. */
export const bottomNav: {
  to?: string;
  label: string;
  icon: LucideIcon;
  primary?: boolean;
}[] = [
  { to: "/", label: "Home", icon: Home },
  { to: "/vault", label: "Vault", icon: Library },
  { label: "Capture", icon: Plus, primary: true },
  { to: "/spaces", label: "Spaces", icon: Layers },
  { to: "/chat", label: "Ask", icon: MessageCircle },
];

export function isActive(pathname: string, to: string) {
  return pathname === to || (to !== "/" && pathname.startsWith(to));
}
