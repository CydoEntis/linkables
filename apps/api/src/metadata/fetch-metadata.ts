import type { resource } from "../db/schema";
import { extractHead, isYouTube, parseOEmbed, youTubeOEmbedUrl } from "./extract";
import { FetchError, type createFetcher } from "./fetcher";

export type Fetchers = Pick<ReturnType<typeof createFetcher>, "fetchHtml" | "fetchJson">;

export type MetadataUpdate = Pick<
  typeof resource.$inferInsert,
  | "title"
  | "description"
  | "author"
  | "faviconUrl"
  | "thumbnailUrl"
  | "relCanonicalUrl"
  | "finalUrl"
  | "contentType"
  | "kind"
>;

// reason is shown to users, so it is a short code and never an error message:
// FetchError messages name the internal addresses a host resolved to.
export type MetadataOutcome = { ok: true; update: MetadataUpdate } | { ok: false; reason: string };

async function videoMetadata(url: string, fetchers: Fetchers): Promise<MetadataOutcome> {
  const parsed = parseOEmbed(await fetchers.fetchJson(youTubeOEmbedUrl(url)));
  if (!parsed.ok) return { ok: false, reason: "parse_failed" };
  const { title, author, thumbnail } = parsed.data;
  return {
    ok: true,
    update: {
      title,
      description: null,
      author,
      faviconUrl: null,
      thumbnailUrl: thumbnail,
      relCanonicalUrl: null,
      finalUrl: url,
      contentType: null,
      kind: "video",
    },
  };
}

async function pageMetadata(url: string, fetchers: Fetchers): Promise<MetadataOutcome> {
  const page = await fetchers.fetchHtml(url);
  const head = page.html === null ? null : extractHead(page.html, page.url);
  return {
    ok: true,
    update: {
      title: head?.title ?? null,
      description: head?.description ?? null,
      author: null,
      faviconUrl: head?.favicon ?? null,
      thumbnailUrl: head?.thumbnail ?? null,
      relCanonicalUrl: head?.relCanonical ?? null,
      finalUrl: page.url,
      contentType: page.contentType,
      kind: page.contentType === "text/html" ? "page" : "other",
    },
  };
}

export async function fetchMetadata(canonicalUrl: string, fetchers: Fetchers): Promise<MetadataOutcome> {
  try {
    return isYouTube(canonicalUrl)
      ? await videoMetadata(canonicalUrl, fetchers)
      : await pageMetadata(canonicalUrl, fetchers);
  } catch (error) {
    if (error instanceof FetchError) return { ok: false, reason: error.reason };
    throw error;
  }
}
