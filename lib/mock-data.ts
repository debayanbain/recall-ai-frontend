export type MemoryKind =
  | "article"
  | "video"
  | "note"
  | "pdf"
  | "voice"
  | "image"
  | "tweet"
  | "github"
  | "link";

export interface Memory {
  id: string;
  kind: MemoryKind;
  title: string;
  summary: string;
  source: string;
  tags: string[];
  savedAt: string;
  /** Age in days — used for sorting; savedAt is the human-readable label. */
  savedDays: number;
  /** The AI's distinctive name for this memory; absent until the worker has enriched it. */
  label?: string;
  cover?: string;
  accent?: string; // tailwind bg class for accent block
  height?: "sm" | "md" | "lg" | "xl";
  space?: string;
}

export const memories: Memory[] = [
  {
    id: "second-brain",
    kind: "article",
    title: "Building a Second Brain with Tiago Forte",
    summary:
      "A method for organizing your digital life and unlocking your creative potential through capture, organize, distill, express.",
    source: "fortelabs.com",
    tags: ["productivity", "PKM", "method"],
    savedAt: "2 days ago",
    savedDays: 2,
    accent: "from-violet-100 to-indigo-50",
    height: "lg",
    space: "Learning AI",
  },
  {
    id: "validate-saas",
    kind: "video",
    title: "How to Validate Your SaaS Idea in 7 Days",
    summary:
      "A founder-friendly 7-day validation sprint covering landing pages, manual outreach, and pre-orders.",
    source: "YouTube · Indie Hackers",
    tags: ["startup", "validation"],
    savedAt: "Yesterday",
    savedDays: 1,
    accent: "from-rose-100 to-orange-50",
    height: "md",
    space: "Startup Ideas",
  },
  {
    id: "lean-startup",
    kind: "article",
    title: "The Lean Startup",
    summary:
      "Build · Measure · Learn. Notes on validated learning, MVPs and pivots from Eric Ries.",
    source: "Book notes",
    tags: ["startup", "lean", "book"],
    savedAt: "3 days ago",
    savedDays: 3,
    accent: "from-emerald-100 to-teal-50",
    height: "sm",
    space: "Startup Ideas",
  },
  {
    id: "family-recipes",
    kind: "note",
    title: "Idea: Shared collections for families to save recipes",
    summary:
      "What if Spaces had a 'family mode' — multiple collaborators, weekly digest, voice capture from the kitchen.",
    source: "Quick note",
    tags: ["idea", "spaces", "recipes"],
    savedAt: "Today",
    savedDays: 0,
    accent: "from-amber-100 to-yellow-50",
    height: "sm",
    space: "Building RecallAI",
  },
  {
    id: "alex-meeting",
    kind: "voice",
    title: "Meeting with Alex — partnership roadmap",
    summary:
      "Discussed Q3 partnership roadmap, revenue share model, and a joint launch in October.",
    source: "Voice note · 4:21",
    tags: ["meeting", "partnerships"],
    savedAt: "Today",
    savedDays: 0,
    accent: "from-sky-100 to-cyan-50",
    height: "md",
    space: "Building RecallAI",
  },
  {
    id: "nomad-routine",
    kind: "article",
    title: "Digital nomad morning routine",
    summary:
      "A grounded routine for working across timezones: light, water, deep work block, then async.",
    source: "Read it later",
    tags: ["routine", "health"],
    savedAt: "5 days ago",
    savedDays: 5,
    accent: "from-lime-100 to-emerald-50",
    height: "sm",
    space: "Health Journey",
  },
  {
    id: "business-plan",
    kind: "note",
    title: "Business Plan Ideas",
    summary:
      "Three threads: vertical second-brains, knowledge sharing as a service, AI-native research assistant.",
    source: "Quick note",
    tags: ["ideas", "planning"],
    savedAt: "1 week ago",
    savedDays: 7,
    accent: "from-fuchsia-100 to-pink-50",
    height: "md",
    space: "Startup Ideas",
  },
  {
    id: "user-journey-pdf",
    kind: "pdf",
    title: "User Journey Flow.pdf",
    summary:
      "Annotated user journey from first capture through first share. 12 pages with sketches.",
    source: "PDF · 12 pages",
    tags: ["design", "UX"],
    savedAt: "4 days ago",
    savedDays: 4,
    accent: "from-slate-100 to-zinc-50",
    height: "sm",
    space: "Building RecallAI",
  },
  {
    id: "smart-notes",
    kind: "article",
    title: "How to Take Smart Notes",
    summary:
      "Sönke Ahrens on the Zettelkasten method — atomic notes, links over folders, slow accumulation.",
    source: "takesmartnotes.com",
    tags: ["zettelkasten", "writing"],
    savedAt: "2 weeks ago",
    savedDays: 14,
    accent: "from-indigo-100 to-blue-50",
    height: "lg",
    space: "Learning AI",
  },
  {
    id: "para",
    kind: "article",
    title: "PARA Method Explained",
    summary: "Projects, Areas, Resources, Archives — a universal system for organizing.",
    source: "fortelabs.com",
    tags: ["PKM", "method"],
    savedAt: "2 weeks ago",
    savedDays: 14,
    accent: "from-violet-100 to-purple-50",
    height: "md",
    space: "Learning AI",
  },
  {
    id: "kyoto-itinerary",
    kind: "link",
    title: "Kyoto 5-day slow itinerary",
    summary: "Northern Higashiyama, Arashiyama bamboo at dawn, evening in Pontocho.",
    source: "tokyocheapo.com",
    tags: ["travel", "japan"],
    savedAt: "1 month ago",
    savedDays: 30,
    accent: "from-rose-100 to-pink-50",
    height: "sm",
    space: "Japan Trip",
  },
  {
    id: "fastapi-deep",
    kind: "github",
    title: "FastAPI dependency injection deep dive",
    summary:
      "Notes on async dependencies, sub-dependencies and overriding for tests.",
    source: "github.com/tiangolo/fastapi",
    tags: ["python", "fastapi"],
    savedAt: "3 weeks ago",
    savedDays: 21,
    accent: "from-teal-100 to-emerald-50",
    height: "md",
    space: "Learning AI",
  },
];

export interface SpaceData {
  id: string;
  title: string;
  emoji: string;
  summary: string;
  memoryCount: number;
  connectionCount: number;
  gradient: string;
  pinned?: boolean;
}

export const spaces: SpaceData[] = [
  {
    id: "building-recallai",
    title: "Building RecallAI",
    emoji: "✦",
    summary:
      "Everything I'm learning while shipping RecallAI — product decisions, user research, design notes.",
    memoryCount: 84,
    connectionCount: 142,
    gradient: "from-violet-200 via-indigo-100 to-purple-50",
    pinned: true,
  },
  {
    id: "startup-ideas",
    title: "Startup Ideas",
    emoji: "◉",
    summary: "A garden of half-formed ideas, validations, market notes and competitor teardowns.",
    memoryCount: 56,
    connectionCount: 91,
    gradient: "from-rose-200 via-orange-100 to-amber-50",
    pinned: true,
  },
  {
    id: "japan-trip",
    title: "Japan Trip",
    emoji: "⛩",
    summary: "Two weeks in autumn — itineraries, tea houses, ryokans, and a slow Kyoto plan.",
    memoryCount: 38,
    connectionCount: 22,
    gradient: "from-pink-200 via-rose-100 to-red-50",
    pinned: true,
  },
  {
    id: "learning-ai",
    title: "Learning AI",
    emoji: "◐",
    summary: "Papers, talks, repos and quick experiments. From transformers to agents.",
    memoryCount: 127,
    connectionCount: 248,
    gradient: "from-indigo-200 via-blue-100 to-sky-50",
    pinned: true,
  },
  {
    id: "health-journey",
    title: "Health Journey",
    emoji: "❋",
    summary: "Training plans, recovery notes, recipes and what's actually working this season.",
    memoryCount: 41,
    connectionCount: 33,
    gradient: "from-emerald-200 via-teal-100 to-green-50",
  },
  {
    id: "recipes",
    title: "Recipes",
    emoji: "✿",
    summary: "Weeknight wins, slow Sunday cooks and the ramen rabbit hole.",
    memoryCount: 64,
    connectionCount: 19,
    gradient: "from-amber-200 via-yellow-100 to-orange-50",
  },
];

export const kindMeta: Record<MemoryKind, { label: string; dot: string }> = {
  article: { label: "Article", dot: "bg-indigo-500" },
  video: { label: "Video", dot: "bg-rose-500" },
  note: { label: "Note", dot: "bg-amber-500" },
  pdf: { label: "PDF", dot: "bg-slate-500" },
  voice: { label: "Voice", dot: "bg-sky-500" },
  image: { label: "Image", dot: "bg-fuchsia-500" },
  tweet: { label: "Tweet", dot: "bg-cyan-500" },
  github: { label: "Code", dot: "bg-emerald-500" },
  link: { label: "Link", dot: "bg-violet-500" },
};
