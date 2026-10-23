import { TITLE_MAX, UNSAFE_TEXT_CHARS } from "@linkables/shared/links";
import { YOUTUBE_HOSTS, YOUTUBE_VIDEO_ID } from "@linkables/shared/url";
import { z } from "zod";
import { type HeadTag, scanHead } from "./head-scanner";

// Resources are shared between users and these strings come from untrusted
// pages, so every stored value is bounded. Caps count code points.
export const DESCRIPTION_MAX = 1000;
export const AUTHOR_MAX = 200;
export const URL_MAX = 2048;

export interface HeadMetadata {
  title: string | null;
  description: string | null;
  favicon: string | null;
  thumbnail: string | null;
  relCanonical: string | null;
}

export interface OEmbedMetadata {
  title: string;
  author: string | null;
  thumbnail: string | null;
}

export type OEmbedResult = { ok: true; data: OEmbedMetadata } | { ok: false; reason: "malformed" };

export function extractHead(html: string, baseUrl: string): HeadMetadata {
  const { tags, titles } = scanHead(html);
  const meta = (key: string) => metaContents(tags, key);
  const links = (rel: string) => linkHrefs(tags, rel);
  return {
    title: firstText([...meta("og:title"), ...meta("twitter:title"), ...titles], TITLE_MAX),
    description: firstText(
      [...meta("og:description"), ...meta("twitter:description"), ...meta("description")],
      DESCRIPTION_MAX,
    ),
    favicon: firstUrl([...links("icon"), ...links("apple-touch-icon")], baseUrl),
    thumbnail: firstUrl([...meta("og:image"), ...meta("twitter:image")], baseUrl),
    relCanonical: firstUrl(links("canonical"), baseUrl),
  };
}

export function isYouTube(url: string): boolean {
  const parsed = URL.parse(url);
  return (
    parsed !== null &&
    isHttp(parsed) &&
    parsed.username === "" &&
    parsed.password === "" &&
    parsed.port === "" &&
    YOUTUBE_HOSTS.has(parsed.hostname) &&
    parsed.pathname === "/watch" &&
    YOUTUBE_VIDEO_ID.test(parsed.searchParams.get("v") ?? "")
  );
}

export function youTubeOEmbedUrl(url: string): string {
  return `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`;
}

const oEmbedSchema = z.object({
  title: z.string(),
  author_name: z.string().nullish().catch(null),
  thumbnail_url: z.string().nullish().catch(null),
});

export function parseOEmbed(json: unknown): OEmbedResult {
  const parsed = oEmbedSchema.safeParse(json);
  const title = parsed.success ? cleanText(parsed.data.title, TITLE_MAX) : null;
  if (!parsed.success || title === null) return { ok: false, reason: "malformed" };
  return {
    ok: true,
    data: {
      title,
      author: cleanText(parsed.data.author_name ?? "", AUTHOR_MAX),
      thumbnail: safeUrl(parsed.data.thumbnail_url ?? ""),
    },
  };
}

function attr(tag: HeadTag, name: string): string | undefined {
  return tag.attrs.find((a) => a.name === name)?.value;
}

function metaContents(tags: HeadTag[], key: string): string[] {
  return tags
    .filter((tag) => tag.tagName === "meta")
    .filter((tag) => [attr(tag, "property"), attr(tag, "name")].some((k) => k?.trim().toLowerCase() === key))
    .map((tag) => attr(tag, "content") ?? "");
}

function linkHrefs(tags: HeadTag[], rel: string): string[] {
  return tags
    .filter((tag) => tag.tagName === "link")
    .filter((tag) => (attr(tag, "rel") ?? "").toLowerCase().split(/\s+/).includes(rel))
    .map((tag) => attr(tag, "href") ?? "");
}

function firstText(candidates: string[], max: number): string | null {
  for (const candidate of candidates) {
    const text = cleanText(candidate, max);
    if (text !== null) return text;
  }
  return null;
}

function firstUrl(candidates: string[], baseUrl: string): string | null {
  for (const candidate of candidates) {
    const url = safeUrl(candidate, baseUrl);
    if (url !== null) return url;
  }
  return null;
}

const UNSAFE_CHARS = new RegExp(UNSAFE_TEXT_CHARS.source, "gu");

function cleanText(value: string, max: number): string | null {
  const text = value.replace(UNSAFE_CHARS, "").replace(/\s+/g, " ").trim();
  if (text === "") return null;
  if (text.length <= max) return text;
  return Array.from(text).slice(0, max).join("");
}

function safeUrl(value: string, baseUrl?: string): string | null {
  if (value.trim() === "") return null;
  const url = URL.parse(value, baseUrl);
  if (url === null || !isHttp(url) || url.href.length > URL_MAX) return null;
  return url.href;
}

function isHttp(url: URL): boolean {
  return url.protocol === "http:" || url.protocol === "https:";
}
