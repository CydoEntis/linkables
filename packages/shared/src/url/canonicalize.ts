export const YOUTUBE_HOSTS: ReadonlySet<string> = new Set([
  "youtube.com",
  "www.youtube.com",
  "m.youtube.com",
  "youtu.be",
]);

export type CanonicalizeResult =
  | { ok: true; url: string }
  | { ok: false; reason: "invalid_url" | "unsupported_protocol" };

const TRACKING_PARAMS = new Set(["fbclid", "gclid"]);
const VIDEO_ID = /^[A-Za-z0-9_-]+$/;

export function canonicalize(input: string): CanonicalizeResult {
  if (!URL.canParse(input)) return { ok: false, reason: "invalid_url" };
  const url = new URL(input);
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return { ok: false, reason: "unsupported_protocol" };
  }
  url.hash = "";
  url.username = "";
  url.password = "";
  url.hostname = url.hostname.replace(/\.$/, "");
  url.search = stripTracking(url.search);
  if (YOUTUBE_HOSTS.has(url.hostname)) normalizeYouTube(url);
  return { ok: true, url: url.href };
}

// Filters the raw query string instead of rewriting url.searchParams, which
// would re-encode every kept param and turn a bare `flag` into `flag=`.
function stripTracking(search: string): string {
  const kept = search
    .slice(1)
    .split("&")
    .filter((pair) => pair !== "" && !isTracking(pair.split("=", 1)[0] ?? ""));
  return kept.length > 0 ? `?${kept.join("&")}` : "";
}

function isTracking(rawKey: string): boolean {
  const key = decodeKey(rawKey).toLowerCase();
  return key.startsWith("utm_") || TRACKING_PARAMS.has(key);
}

function decodeKey(rawKey: string): string {
  try {
    return decodeURIComponent(rawKey);
  } catch (error) {
    if (error instanceof URIError) return rawKey;
    throw error;
  }
}

function normalizeYouTube(url: URL): void {
  const videoId = youTubeVideoId(url);
  if (videoId !== null) {
    url.pathname = "/watch";
    url.search = `?v=${videoId}`;
  }
  if (url.hostname !== "youtu.be" || videoId !== null) url.hostname = "www.youtube.com";
}

function youTubeVideoId(url: URL): string | null {
  const candidate = rawVideoId(url) ?? "";
  return VIDEO_ID.test(candidate) ? candidate : null;
}

function rawVideoId(url: URL): string | null | undefined {
  if (url.hostname === "youtu.be") return url.pathname.split("/")[1];
  if (url.pathname === "/watch") return url.searchParams.get("v");
  return /^\/shorts\/([^/]+)/.exec(url.pathname)?.[1];
}
