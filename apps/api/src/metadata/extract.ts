import { YOUTUBE_HOSTS } from "@linkaroo/shared/url";
import { type Token, Tokenizer, TokenizerMode } from "parse5";
import { z } from "zod";

type Attribute = Token.Attribute;

// Resources are shared between users and these strings come from untrusted
// pages, so every stored value is bounded. Caps count code points.
export const TITLE_MAX = 300;
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
    YOUTUBE_HOSTS.has(parsed.hostname) &&
    parsed.pathname === "/watch" &&
    (parsed.searchParams.get("v") ?? "") !== ""
  );
}

export function youTubeOEmbedUrl(url: string): string {
  return `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`;
}

const oEmbedSchema = z.object({
  title: z.string(),
  author_name: z.string().nullish(),
  thumbnail_url: z.string().nullish(),
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

interface HeadScan {
  tags: { tagName: string; attrs: Attribute[] }[];
  titles: string[];
}

const TEXT_MODES = new Map<string, Tokenizer["state"]>([
  ["title", TokenizerMode.RCDATA],
  ["textarea", TokenizerMode.RCDATA],
  ["style", TokenizerMode.RAWTEXT],
  ["xmp", TokenizerMode.RAWTEXT],
  ["iframe", TokenizerMode.RAWTEXT],
  ["noembed", TokenizerMode.RAWTEXT],
  ["noframes", TokenizerMode.RAWTEXT],
  ["script", TokenizerMode.SCRIPT_DATA],
  ["plaintext", TokenizerMode.PLAINTEXT],
]);
const FOREIGN_ROOTS = new Set(["svg", "math"]);

// Tokenizes instead of calling parse5's parse(): the tree builder is quadratic
// on deeply nested elements, and a 512 KB page of <div>s blocks for ~30 s.
// Switching the tokenizer into text modes is the part of tree building that
// matters here, so a <meta> inside a <script> string is not read as a tag.
// Elements inside <svg>/<math> are skipped, so an inline SVG <title> is not
// taken for the page title.
function scanHead(html: string): HeadScan {
  const scan: HeadScan = { tags: [], titles: [] };
  let foreignDepth = 0;
  let title: string | null = null;
  const appendTitle = (token: Token.CharacterToken) => {
    if (title !== null) title += token.chars;
  };
  const closeTitle = () => {
    if (title !== null) scan.titles.push(title);
    title = null;
  };
  const tokenizer: Tokenizer = new Tokenizer(
    {},
    {
      onStartTag(token) {
        if (FOREIGN_ROOTS.has(token.tagName) && !token.selfClosing) foreignDepth++;
        tokenizer.inForeignNode = foreignDepth > 0;
        if (foreignDepth > 0) return;
        if (token.tagName === "meta" || token.tagName === "link") scan.tags.push(token);
        if (token.tagName === "title") title = "";
        const mode = TEXT_MODES.get(token.tagName);
        if (mode !== undefined) tokenizer.state = mode;
      },
      onEndTag(token) {
        if (FOREIGN_ROOTS.has(token.tagName) && foreignDepth > 0) foreignDepth--;
        tokenizer.inForeignNode = foreignDepth > 0;
        if (token.tagName === "title") closeTitle();
      },
      onCharacter: appendTitle,
      onWhitespaceCharacter: appendTitle,
      onNullCharacter: ignore,
      onComment: ignore,
      onDoctype: ignore,
      onEof: closeTitle,
    },
  );
  tokenizer.write(html, true);
  return scan;
}

function ignore(): void {
  return;
}

function attr(tag: { attrs: Attribute[] }, name: string): string | undefined {
  return tag.attrs.find((a) => a.name === name)?.value;
}

function metaContents(tags: HeadScan["tags"], key: string): string[] {
  return tags
    .filter((tag) => tag.tagName === "meta")
    .filter((tag) => [attr(tag, "property"), attr(tag, "name")].some((k) => k?.trim().toLowerCase() === key))
    .map((tag) => attr(tag, "content") ?? "");
}

function linkHrefs(tags: HeadScan["tags"], rel: string): string[] {
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

function cleanText(value: string, max: number): string | null {
  const text = value.replace(/\s+/g, " ").trim();
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
