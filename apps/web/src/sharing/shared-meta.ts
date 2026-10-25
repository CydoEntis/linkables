import type { SharedCollection } from "@linkables/shared/sharing";
import { linkCountLabel } from "../collections/link-count";

// The API sends a UTC day; formatting it in local time would show the day before west of UTC.
function dayLabel(iso: string, now: number): string {
  const date = new Date(iso);
  const sameYear = date.getUTCFullYear() === new Date(now).getUTCFullYear();
  return date.toLocaleDateString("en-US", { timeZone: "UTC", month: "short", day: "numeric", ...(sameYear ? {} : { year: "numeric" }) });
}

// "5 links · updated Oct 24" under the shared page's title.
export function sharedMeta(collection: SharedCollection, now: number): string {
  const parts = [linkCountLabel(collection.linkCount)];
  if (collection.updatedAt) parts.push(`updated ${dayLabel(collection.updatedAt, now)}`);
  if (collection.links.length < collection.linkCount) parts.push(`showing the newest ${String(collection.links.length)}`);
  return parts.join(" · ");
}
