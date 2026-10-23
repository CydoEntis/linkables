import type { SavedLink } from "@linkables/shared/links";
import { displayName } from "../collections/display-name";

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

export function domainOf(url: string): string {
  if (!URL.canParse(url)) return url;
  return new URL(url).hostname.replace(/^www\./, "");
}

// The API only saves http(s) URLs; this keeps a javascript: or data: URL from ever becoming a link.
export function safeHref(url: string): string | undefined {
  if (!URL.canParse(url)) return undefined;
  const { protocol } = new URL(url);
  return protocol === "http:" || protocol === "https:" ? url : undefined;
}

export function urlWithoutScheme(url: string): string {
  return url.replace(/^https?:\/\//i, "");
}

// The user's title, else the fetched one, else the URL (brief 5.5).
export function displayTitle(link: SavedLink): { text: string; isUrl: boolean } {
  const title = link.titleOverride ?? link.resource.title;
  return title ? { text: title, isUrl: false } : { text: urlWithoutScheme(link.originalUrl), isUrl: true };
}

export function relativeTime(savedAt: string, now: number): string {
  const at = Date.parse(savedAt);
  const elapsed = now - at;
  if (elapsed < MINUTE) return "now";
  if (elapsed < HOUR) return `${String(Math.floor(elapsed / MINUTE))}m`;
  if (elapsed < DAY) return `${String(Math.floor(elapsed / HOUR))}h`;
  const sameYear = new Date(at).getFullYear() === new Date(now).getFullYear();
  return new Date(at).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: sameYear ? undefined : "numeric",
  });
}

// The handoff's letter tile: hue = hash(domain) × 47 mod 360.
export function tileFor(domain: string): { hue: number; letter: string } {
  let hash = 0;
  for (let i = 0; i < domain.length; i++) hash = (hash * 31 + domain.charCodeAt(i)) >>> 0;
  return { hue: (hash * 47) % 360, letter: (domain[0] ?? "?").toUpperCase() };
}

// "in Rust", "in Rust +1", or "To sort" when the link is in no collection.
export function filedLabel(collections: SavedLink["collections"]): string {
  const [first, ...rest] = collections;
  if (first === undefined) return "To sort";
  return `in ${displayName(first.name)}${rest.length > 0 ? ` +${String(rest.length)}` : ""}`;
}

const SAVED_FROM_LABELS: Partial<Record<NonNullable<SavedLink["savedFrom"]>, string>> = {
  iphone: "from iPhone",
  ipad: "from iPad",
  android: "from Android",
};

// Only a save from a phone or tablet is worth a mention; the desktop is the default place.
export function savedFromLabel(source: SavedLink["savedFrom"]): string | null {
  return source === null ? null : (SAVED_FROM_LABELS[source] ?? null);
}
