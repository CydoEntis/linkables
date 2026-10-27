import type { SharedCollection, SharedLink } from "@linkables/shared/sharing";
import { linkCountLabel } from "../collections/link-count";

// The API sends a UTC day; formatting it in local time would show the day before west of UTC.
function dayLabel(iso: string, now: number): string {
  const date = new Date(iso);
  const sameYear = date.getUTCFullYear() === new Date(now).getUTCFullYear();
  return date.toLocaleDateString("en-US", { timeZone: "UTC", month: "short", day: "numeric", ...(sameYear ? {} : { year: "numeric" }) });
}

// Every link the viewer is shown, ungrouped first then each group's, as the page lists them.
export function shownLinks(collection: SharedCollection): SharedLink[] {
  return [...collection.links, ...(collection.groups ?? []).flatMap((group) => group.links)];
}

// "5 links · updated Oct 24" under the shared page's title.
export function sharedMeta(collection: SharedCollection, now: number): string {
  const parts = [linkCountLabel(collection.linkCount)];
  if (collection.updatedAt) parts.push(`updated ${dayLabel(collection.updatedAt, now)}`);
  const shown = shownLinks(collection).length;
  if (shown < collection.linkCount) parts.push(`showing the newest ${String(shown)}`);
  return parts.join(" · ");
}
