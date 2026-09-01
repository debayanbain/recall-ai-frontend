import type { VaultItem } from "@/lib/types";

/**
 * Calendar maths for the timeline, kept out of the view so the grouping rules are one
 * readable thing rather than three inline ternaries.
 *
 * Everything here is *calendar* based, in the reader's own timezone: "this week" means
 * since Monday, not "the last seven days". The page says "This week" and a rolling
 * window quietly means something else — on a Tuesday it would reach back into last week.
 */

export type RangeId = "all" | "week" | "month";

export type TimelineGroup = {
  /** Stable across re-renders and unique per period, so React keys never collide. */
  key: string;
  label: string;
  /** "25 Aug – 31 Aug", only where the group spans more than one day. */
  dateline: string | null;
  items: VaultItem[];
};

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

/** Days are added through `setDate`, not by adding 86_400_000ms: a DST changeover makes
 *  a local day 23 or 25 hours long, and the arithmetic version lands an hour off. */
function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

/** Monday-first, matching the ISO week most of the product's users read dates in. */
function startOfWeek(d: Date): Date {
  const day = (d.getDay() + 6) % 7;
  return addDays(startOfDay(d), -day);
}

function startOfMonth(d: Date): Date {
  const x = startOfDay(d);
  x.setDate(1);
  return x;
}

/** Epoch ms the given range begins at. `all` reaches back forever. */
export function rangeStart(range: RangeId, now: Date): number {
  if (range === "week") return startOfWeek(now).getTime();
  if (range === "month") return startOfMonth(now).getTime();
  return Number.NEGATIVE_INFINITY;
}

const monthFormat = new Intl.DateTimeFormat(undefined, { month: "long" });
const dayFormat = new Intl.DateTimeFormat(undefined, { day: "numeric", month: "short" });

/**
 * Which period a memory belongs to.
 *
 * The rules are checked newest-first and each covers a contiguous stretch of time, so a
 * list already sorted `created_at` descending produces contiguous groups — no sorting,
 * no re-entering a group that was already closed.
 */
function bucketFor(date: Date, now: Date): { key: string; label: string } {
  const t = date.getTime();
  const today = startOfDay(now);
  const thisWeek = startOfWeek(now);

  if (t >= today.getTime()) return { key: "today", label: "Today" };
  if (t >= addDays(today, -1).getTime()) return { key: "yesterday", label: "Yesterday" };
  if (t >= thisWeek.getTime()) return { key: "this-week", label: "Earlier this week" };
  if (t >= addDays(thisWeek, -7).getTime()) return { key: "last-week", label: "Last week" };

  const year = date.getFullYear();
  const month = monthFormat.format(date);
  return {
    key: `${year}-${String(date.getMonth() + 1).padStart(2, "0")}`,
    // The year is only worth the space once it stops being the obvious one.
    label: year === now.getFullYear() ? month : `${month} ${year}`,
  };
}

/**
 * Group memories into the periods above, preserving the order they arrived in.
 *
 * An unparseable `created_at` is collected rather than dropped: the backend always sends
 * an ISO timestamp, so this cannot normally happen — but a memory silently missing from
 * the one page whose job is to show every memory is the worst possible way to find out.
 */
export function groupByPeriod(items: VaultItem[], now: Date): TimelineGroup[] {
  const groups: TimelineGroup[] = [];
  const byKey = new Map<string, TimelineGroup>();
  const undated: VaultItem[] = [];

  for (const item of items) {
    const date = new Date(item.created_at);
    if (Number.isNaN(date.getTime())) {
      undated.push(item);
      continue;
    }
    const { key, label } = bucketFor(date, now);
    let group = byKey.get(key);
    if (!group) {
      group = { key, label, dateline: null, items: [] };
      byKey.set(key, group);
      groups.push(group);
    }
    group.items.push(item);
  }

  for (const group of groups) {
    // Descending order means the last item is the oldest; a single-day group would only
    // repeat what the label already says.
    const newest = new Date(group.items[0].created_at);
    const oldest = new Date(group.items[group.items.length - 1].created_at);
    const sameDay = startOfDay(newest).getTime() === startOfDay(oldest).getTime();
    group.dateline = sameDay
      ? group.key === "today" || group.key === "yesterday"
        ? null
        : dayFormat.format(newest)
      : `${dayFormat.format(oldest)} – ${dayFormat.format(newest)}`;
  }

  if (undated.length) {
    groups.push({ key: "undated", label: "Undated", dateline: null, items: undated });
  }
  return groups;
}
