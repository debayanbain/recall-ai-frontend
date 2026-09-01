/**
 * The icons a Space can be marked with.
 *
 * A **closed, curated registry**, not the whole of Lucide. Two reasons, and the second is
 * the one that matters:
 *
 * * `lucide-react` ships ~1500 icons. Importing the package's index to look one up by
 *   name pulls every one of them into the bundle — the tree-shake only works when each
 *   icon is a named import, which is exactly what this file is.
 * * A picker showing 1500 icons is not a picker. Twelve hundred of them are transit
 *   symbols and currency glyphs nobody names a collection after, and scrolling past them
 *   is the whole interaction. These are grouped the way someone thinks about what they
 *   are collecting.
 *
 * The stored value is the **name** (`"book-open"`), never the component, and the database
 * column is a plain string: an icon set is a frontend dependency, and a row holding an SVG
 * from it is a row coupled to that package's version. A name this registry does not know —
 * an older client, or an icon retired from the list — renders as the neutral fallback
 * rather than as nothing, which is why `iconComponent` returns `null` instead of throwing.
 */

import {
  Activity,
  Anchor,
  Archive,
  AtSign,
  Atom,
  Bell,
  Bike,
  Bookmark,
  BookOpen,
  Brain,
  Briefcase,
  Brush,
  Bug,
  Building2,
  Calendar,
  Camera,
  Car,
  ClipboardList,
  Clock,
  Cloud,
  Code,
  Coffee,
  Compass,
  Cpu,
  Database,
  Diamond,
  DollarSign,
  Dumbbell,
  Feather,
  Film,
  FlaskConical,
  Flame,
  Flag,
  Folder,
  Gift,
  GitBranch,
  Globe,
  GraduationCap,
  Guitar,
  Handshake,
  Hash,
  Headphones,
  Heart,
  Highlighter,
  Image as ImageIcon,
  Key,
  Languages,
  Laptop,
  Leaf,
  Library,
  Lightbulb,
  Lock,
  Mail,
  Map as MapIcon,
  MapPin,
  Mic,
  Microscope,
  Moon,
  Music,
  Palette,
  PenTool,
  Phone,
  Plane,
  Presentation,
  Puzzle,
  Receipt,
  Rocket,
  Scissors,
  Server,
  ShoppingBag,
  Smartphone,
  Sparkles,
  Star,
  Sun,
  Tag,
  Target,
  Telescope,
  Tent,
  Terminal,
  TrendingUp,
  Users,
  Utensils,
  Video,
  Wallet,
  Wifi,
  Zap,
  type LucideIcon,
} from "lucide-react";

export type SpaceIconGroup = {
  label: string;
  icons: { name: string; label: string; Icon: LucideIcon; keywords?: string }[];
};

/** Grouped for the picker; the order here is the order on screen. */
export const SPACE_ICON_GROUPS: SpaceIconGroup[] = [
  {
    label: "Work",
    icons: [
      {
        name: "briefcase",
        label: "Briefcase",
        Icon: Briefcase,
        keywords: "work job career",
      },
      {
        name: "target",
        label: "Target",
        Icon: Target,
        keywords: "goal aim okr",
      },
      {
        name: "rocket",
        label: "Rocket",
        Icon: Rocket,
        keywords: "launch startup ship",
      },
      {
        name: "trending-up",
        label: "Growth",
        Icon: TrendingUp,
        keywords: "growth metrics chart",
      },
      {
        name: "activity",
        label: "Activity",
        Icon: Activity,
        keywords: "pulse metrics stats",
      },
      {
        name: "clipboard-list",
        label: "Tasks",
        Icon: ClipboardList,
        keywords: "todo list plan",
      },
      {
        name: "presentation",
        label: "Presentation",
        Icon: Presentation,
        keywords: "deck pitch",
      },
      {
        name: "handshake",
        label: "Handshake",
        Icon: Handshake,
        keywords: "deal client partner",
      },
      {
        name: "building-2",
        label: "Company",
        Icon: Building2,
        keywords: "office business",
      },
      {
        name: "users",
        label: "People",
        Icon: Users,
        keywords: "team crm contacts",
      },
      {
        name: "calendar",
        label: "Calendar",
        Icon: Calendar,
        keywords: "date schedule plan",
      },
      {
        name: "mail",
        label: "Mail",
        Icon: Mail,
        keywords: "email inbox letter",
      },
      { name: "phone", label: "Phone", Icon: Phone, keywords: "call contact" },
      {
        name: "dollar-sign",
        label: "Money",
        Icon: DollarSign,
        keywords: "finance price budget",
      },
      {
        name: "receipt",
        label: "Receipt",
        Icon: Receipt,
        keywords: "invoice expense bill",
      },
      {
        name: "wallet",
        label: "Wallet",
        Icon: Wallet,
        keywords: "money budget savings",
      },
    ],
  },
  {
    label: "Learning",
    icons: [
      {
        name: "book-open",
        label: "Book",
        Icon: BookOpen,
        keywords: "read study reading",
      },
      {
        name: "graduation-cap",
        label: "Study",
        Icon: GraduationCap,
        keywords: "course school",
      },
      {
        name: "brain",
        label: "Brain",
        Icon: Brain,
        keywords: "think ideas memory ai",
      },
      {
        name: "lightbulb",
        label: "Idea",
        Icon: Lightbulb,
        keywords: "idea insight inspiration",
      },
      {
        name: "library",
        label: "Library",
        Icon: Library,
        keywords: "books archive reference",
      },
      {
        name: "microscope",
        label: "Research",
        Icon: Microscope,
        keywords: "science study",
      },
      {
        name: "flask-conical",
        label: "Experiment",
        Icon: FlaskConical,
        keywords: "lab test",
      },
      {
        name: "atom",
        label: "Science",
        Icon: Atom,
        keywords: "physics research",
      },
      {
        name: "telescope",
        label: "Telescope",
        Icon: Telescope,
        keywords: "explore discover",
      },
      {
        name: "puzzle",
        label: "Puzzle",
        Icon: Puzzle,
        keywords: "problem solve",
      },
      {
        name: "languages",
        label: "Languages",
        Icon: Languages,
        keywords: "translate words",
      },
      {
        name: "highlighter",
        label: "Highlights",
        Icon: Highlighter,
        keywords: "notes quotes",
      },
      {
        name: "pen-tool",
        label: "Writing",
        Icon: PenTool,
        keywords: "write draft essay",
      },
      {
        name: "feather",
        label: "Feather",
        Icon: Feather,
        keywords: "write poetry journal",
      },
    ],
  },
  {
    label: "Making",
    icons: [
      {
        name: "code",
        label: "Code",
        Icon: Code,
        keywords: "dev programming software",
      },
      {
        name: "terminal",
        label: "Terminal",
        Icon: Terminal,
        keywords: "shell cli console",
      },
      {
        name: "git-branch",
        label: "Branch",
        Icon: GitBranch,
        keywords: "git version repo",
      },
      { name: "bug", label: "Bugs", Icon: Bug, keywords: "issue debug fix" },
      { name: "cpu", label: "Hardware", Icon: Cpu, keywords: "chip processor" },
      {
        name: "database",
        label: "Database",
        Icon: Database,
        keywords: "sql data storage",
      },
      {
        name: "server",
        label: "Server",
        Icon: Server,
        keywords: "backend infra hosting",
      },
      {
        name: "cloud",
        label: "Cloud",
        Icon: Cloud,
        keywords: "aws hosting infra",
      },
      {
        name: "globe",
        label: "Web",
        Icon: Globe,
        keywords: "internet site world",
      },
      {
        name: "smartphone",
        label: "Mobile",
        Icon: Smartphone,
        keywords: "phone app ios",
      },
      {
        name: "laptop",
        label: "Laptop",
        Icon: Laptop,
        keywords: "computer desk setup",
      },
      {
        name: "wifi",
        label: "Network",
        Icon: Wifi,
        keywords: "internet signal",
      },
      {
        name: "lock",
        label: "Security",
        Icon: Lock,
        keywords: "privacy safe secure",
      },
      {
        name: "key",
        label: "Keys",
        Icon: Key,
        keywords: "password access secret",
      },
    ],
  },
  {
    label: "Creative",
    icons: [
      {
        name: "palette",
        label: "Design",
        Icon: Palette,
        keywords: "art colour paint",
      },
      {
        name: "brush",
        label: "Brush",
        Icon: Brush,
        keywords: "paint draw art",
      },
      {
        name: "image",
        label: "Pictures",
        Icon: ImageIcon,
        keywords: "photo gallery art",
      },
      {
        name: "camera",
        label: "Photography",
        Icon: Camera,
        keywords: "photo shoot",
      },
      {
        name: "video",
        label: "Video",
        Icon: Video,
        keywords: "film clip record",
      },
      {
        name: "film",
        label: "Film",
        Icon: Film,
        keywords: "movie cinema watch",
      },
      {
        name: "music",
        label: "Music",
        Icon: Music,
        keywords: "song audio playlist",
      },
      {
        name: "headphones",
        label: "Listening",
        Icon: Headphones,
        keywords: "podcast audio",
      },
      {
        name: "guitar",
        label: "Guitar",
        Icon: Guitar,
        keywords: "music band play",
      },
      {
        name: "mic",
        label: "Recording",
        Icon: Mic,
        keywords: "voice podcast audio",
      },
      {
        name: "scissors",
        label: "Editing",
        Icon: Scissors,
        keywords: "cut clip craft",
      },
      {
        name: "sparkles",
        label: "Sparkles",
        Icon: Sparkles,
        keywords: "magic ai new",
      },
    ],
  },
  {
    label: "Life",
    icons: [
      {
        name: "heart",
        label: "Heart",
        Icon: Heart,
        keywords: "love health favourite",
      },
      {
        name: "coffee",
        label: "Coffee",
        Icon: Coffee,
        keywords: "cafe morning break",
      },
      {
        name: "utensils",
        label: "Food",
        Icon: Utensils,
        keywords: "recipe cooking eat",
      },
      {
        name: "dumbbell",
        label: "Fitness",
        Icon: Dumbbell,
        keywords: "gym workout health",
      },
      {
        name: "bike",
        label: "Cycling",
        Icon: Bike,
        keywords: "ride sport exercise",
      },
      {
        name: "leaf",
        label: "Nature",
        Icon: Leaf,
        keywords: "plant green garden",
      },
      { name: "sun", label: "Sun", Icon: Sun, keywords: "day summer weather" },
      {
        name: "moon",
        label: "Night",
        Icon: Moon,
        keywords: "sleep evening dark",
      },
      {
        name: "plane",
        label: "Travel",
        Icon: Plane,
        keywords: "flight trip holiday",
      },
      {
        name: "car",
        label: "Driving",
        Icon: Car,
        keywords: "road trip vehicle",
      },
      {
        name: "tent",
        label: "Outdoors",
        Icon: Tent,
        keywords: "camping hike nature",
      },
      {
        name: "map",
        label: "Map",
        Icon: MapIcon,
        keywords: "travel route plan",
      },
      {
        name: "map-pin",
        label: "Place",
        Icon: MapPin,
        keywords: "location city",
      },
      { name: "gift", label: "Gift", Icon: Gift, keywords: "present birthday" },
      {
        name: "shopping-bag",
        label: "Shopping",
        Icon: ShoppingBag,
        keywords: "buy wishlist",
      },
      {
        name: "compass",
        label: "Compass",
        Icon: Compass,
        keywords: "explore direction",
      },
    ],
  },
  {
    label: "Marks",
    icons: [
      {
        name: "folder",
        label: "Folder",
        Icon: Folder,
        keywords: "files group",
      },
      {
        name: "archive",
        label: "Archive",
        Icon: Archive,
        keywords: "storage old keep",
      },
      {
        name: "bookmark",
        label: "Bookmark",
        Icon: Bookmark,
        keywords: "save read later",
      },
      { name: "tag", label: "Tag", Icon: Tag, keywords: "label category" },
      {
        name: "flag",
        label: "Flag",
        Icon: Flag,
        keywords: "important milestone",
      },
      {
        name: "star",
        label: "Star",
        Icon: Star,
        keywords: "favourite best top",
      },
      {
        name: "flame",
        label: "Flame",
        Icon: Flame,
        keywords: "hot streak urgent",
      },
      { name: "zap", label: "Zap", Icon: Zap, keywords: "fast energy quick" },
      { name: "bell", label: "Bell", Icon: Bell, keywords: "reminder alert" },
      {
        name: "clock",
        label: "Clock",
        Icon: Clock,
        keywords: "time later history",
      },
      {
        name: "anchor",
        label: "Anchor",
        Icon: Anchor,
        keywords: "steady base",
      },
      {
        name: "diamond",
        label: "Diamond",
        Icon: Diamond,
        keywords: "gem value",
      },
      {
        name: "hash",
        label: "Hash",
        Icon: Hash,
        keywords: "tag topic channel",
      },
      {
        name: "at-sign",
        label: "At",
        Icon: AtSign,
        keywords: "mention handle",
      },
    ],
  },
];

/** Flat lookup: stored name → component. */
const BY_NAME: Map<string, LucideIcon> = new Map(
  SPACE_ICON_GROUPS.flatMap((g) =>
    g.icons.map((i) => [i.name, i.Icon] as const),
  ),
);

/** Every icon, flattened, for search. */
export const SPACE_ICONS = SPACE_ICON_GROUPS.flatMap((g) => g.icons);

/**
 * The component for a stored name, or `null` for an unknown one.
 *
 * Null rather than a throw: the name came from a database row that an older or newer
 * client wrote, and a Space rendering its fallback mark is a far better outcome than a
 * page that does not render.
 */
export function iconComponent(
  name: string | null | undefined,
): LucideIcon | null {
  if (!name) return null;
  return BY_NAME.get(name) ?? null;
}

/** Case-insensitive match over the name, label and keywords. */
export function searchIcons(query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return null;
  return SPACE_ICONS.filter(
    (i) =>
      i.name.includes(q) ||
      i.label.toLowerCase().includes(q) ||
      (i.keywords?.includes(q) ?? false),
  );
}
