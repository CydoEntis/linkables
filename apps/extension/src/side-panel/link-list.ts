import type { ListedCollection } from "@linkables/shared/collections";
import type { SavedLink } from "@linkables/shared/links";
import { displayName } from "../collections/picker";

export type LinkTab = "recent" | "pinned";

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

// A search covers every link in the tab, as it does in the web app.
export function linksPath(tab: LinkTab, query: string): string {
  const params = new URLSearchParams();
  if (tab === "pinned") params.set("pinned", "true");
  const q = query.trim();
  if (q !== "") params.set("q", q);
  const search = params.toString();
  return search ? `/links?${search}` : "/links";
}

// The handoff orders the panel's lists pinned first, then newest; the API already sends newest first.
export function pinnedFirst(links: readonly SavedLink[]): SavedLink[] {
  return [...links.filter((link) => link.pinned), ...links.filter((link) => !link.pinned)];
}

export function linkTitle(link: SavedLink): string {
  return link.titleOverride ?? link.resource.title ?? link.originalUrl.replace(/^https?:\/\//i, "");
}

export function domainOf(url: string): string {
  return URL.canParse(url) ? new URL(url).hostname.replace(/^www\./, "") : url;
}

function savedWhen(savedAt: string, now: number): string {
  const elapsed = now - Date.parse(savedAt);
  if (elapsed < MINUTE) return "now";
  if (elapsed < HOUR) return `${String(Math.floor(elapsed / MINUTE))}m`;
  if (elapsed < DAY) return `${String(Math.floor(elapsed / HOUR))}h`;
  return new Date(savedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function linkMeta(link: SavedLink, now: number): string {
  const [first] = link.collections;
  const parts = [domainOf(link.originalUrl), first ? `in ${displayName(first.name)}` : null, savedWhen(link.savedAt, now)];
  return parts.filter((part) => part !== null).join(" · ");
}

export function linkCount(count: number): string {
  return count === 1 ? "1 link" : `${String(count)} links`;
}

const byRecentUse = (a: ListedCollection, b: ListedCollection) => b.lastUsedAt.localeCompare(a.lastUsedAt);

export function collectionRows(collections: readonly ListedCollection[], query: string): ListedCollection[] {
  const needle = query.trim().toLowerCase();
  const matching = collections.filter((item) => item.name.toLowerCase().includes(needle)).sort(byRecentUse);
  return [...matching.filter((item) => item.pinned), ...matching.filter((item) => !item.pinned)];
}
