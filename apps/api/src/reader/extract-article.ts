import { Readability, isProbablyReaderable } from "@mozilla/readability";
import { TITLE_MAX } from "@linkables/shared/links";
import type { ReaderArticle, ReaderBlock } from "@linkables/shared/reader";
import { parseHTML } from "linkedom";
import { AUTHOR_MAX, cleanText } from "../metadata/extract";
import { blockRuns, toBlocks, type PageNode } from "./to-blocks";

// Readability walks every element several times; past this a page is not an
// article worth the CPU, and the API answers every user from one process.
const ELEMENTS_MAX = 30_000;
const WORDS_PER_MINUTE = 230;

// null means the page has no readable article.
export function extractArticle(html: string, pageUrl: string): ReaderArticle | null {
  const { document } = parseHTML(html);
  if (document.getElementsByTagName("*").length > ELEMENTS_MAX) return null;
  if (!isProbablyReaderable(document)) return null;
  // The serializer hands back the content element itself, so it is never
  // serialised to HTML and parsed again.
  const parsed = new Readability<PageNode>(document, { serializer: (node) => node }).parse();
  if (!parsed?.content) return null;
  const { blocks, truncated } = toBlocks(parsed.content, pageUrl);
  if (blocks.length === 0) return null;
  return {
    title: cleanText(parsed.title ?? "", TITLE_MAX),
    byline: cleanText(parsed.byline ?? "", AUTHOR_MAX),
    siteName: cleanText(parsed.siteName ?? "", AUTHOR_MAX),
    minutes: readingMinutes(blocks),
    truncated,
    blocks,
  };
}

function readingMinutes(blocks: ReaderBlock[]): number {
  const words = blocks.reduce((sum, block) => sum + wordsIn(block), 0);
  return Math.max(1, Math.round(words / WORDS_PER_MINUTE));
}

function wordsIn(block: ReaderBlock): number {
  const text = blockRuns(block).map((runs) => runs.map((run) => run.text).join("")).join(" ");
  return text.split(/\s+/).filter(Boolean).length;
}
