import type { SavedLink } from "@linkables/shared/links";

const GROUP_LABELS = ["Pinned", "Today", "Yesterday", "This week", "Earlier"] as const;

export type GroupLabel = (typeof GROUP_LABELS)[number];
export type LinkGroup = { label: GroupLabel; links: SavedLink[] };

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

function startOfDay(time: number, daysBack = 0): number {
  const day = new Date(time);
  day.setHours(0, 0, 0, 0);
  day.setDate(day.getDate() - daysBack);
  return day.getTime();
}

function dayLabel(savedAt: string, now: number): GroupLabel {
  const at = Date.parse(savedAt);
  if (at >= startOfDay(now)) return "Today";
  if (at >= startOfDay(now, 1)) return "Yesterday";
  if (now - at < WEEK_MS) return "This week";
  return "Earlier";
}

// Keeps the API's order inside each group, so pinned links stay first even
// before the API sorts them there.
export function groupLinks(links: SavedLink[], now: number, { pinnedGroup }: { pinnedGroup: boolean }): LinkGroup[] {
  const byLabel = new Map<GroupLabel, SavedLink[]>();
  for (const link of links) {
    const label = pinnedGroup && link.pinned ? "Pinned" : dayLabel(link.savedAt, now);
    byLabel.set(label, [...(byLabel.get(label) ?? []), link]);
  }
  return GROUP_LABELS.flatMap((label) => {
    const grouped = byLabel.get(label);
    return grouped ? [{ label, links: grouped }] : [];
  });
}
