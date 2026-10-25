import type { SharedCollection } from "@linkables/shared/sharing";
import { linkCountLabel } from "../collections/ShareDialog";

function dateLabel(iso: string, now: number): string {
  const date = new Date(iso);
  const sameYear = date.getFullYear() === new Date(now).getFullYear();
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", ...(sameYear ? {} : { year: "numeric" }) });
}

// "5 links · updated Oct 24" under the shared page's title.
export function sharedMeta(collection: SharedCollection, now: number): string {
  const parts = [linkCountLabel(collection.linkCount)];
  if (collection.updatedAt !== null) parts.push(`updated ${dateLabel(collection.updatedAt, now)}`);
  if (collection.links.length < collection.linkCount) parts.push(`showing the newest ${String(collection.links.length)}`);
  return parts.join(" · ");
}
