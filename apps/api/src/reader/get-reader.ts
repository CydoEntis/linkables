import { readerArticleSchema, type ReaderArticle, type ReaderView } from "@linkables/shared/reader";
import { and, eq } from "drizzle-orm";
import type { Db } from "../db/client";
import { resource, resourceReader, savedLink } from "../db/schema";
import { NotFoundError } from "../http/errors";
import type { Logger } from "../log/logger";
import { isYouTube } from "../metadata/extract";
import { FetchError, type HtmlPage } from "../metadata/fetcher";
import { extractArticle } from "./extract-article";

const DAY_MS = 24 * 60 * 60 * 1000;
const OK_FRESH_MS = 7 * DAY_MS;
// A page that had no article, or failed to load, may have been fixed since.
const UNAVAILABLE_FRESH_MS = DAY_MS / 4;

export type ReaderDeps = {
  db: Db;
  fetchPage: (url: string) => Promise<HtmlPage>;
  logger: Logger;
  now: () => number;
};

export type GetReaderInput = {
  userId: string;
  linkId: string;
  // Runs before a fetch, never for a cached copy; throws to refuse the fetch.
  beforeFetch: () => void;
};

type Copy = { status: "ok"; article: ReaderArticle } | { status: "unavailable"; reason: string };

export async function getReader(deps: ReaderDeps, { userId, linkId, beforeFetch }: GetReaderInput): Promise<ReaderView> {
  const target = await findTarget(deps.db, userId, linkId);
  if (target === undefined) throw new NotFoundError("Link not found");
  if (!mayHaveArticle(target)) return { status: "unavailable", url: target.url };
  const cached = freshCopy(target.cached, deps.now());
  if (cached !== null) return toView(target.url, cached);
  beforeFetch();
  const copy = await readPage(deps.fetchPage, target.canonicalUrl);
  await storeCopy(deps.db, target.resourceId, copy, deps.now());
  deps.logger.info("reader copy fetched", {
    resourceId: target.resourceId,
    status: copy.status,
    ...(copy.status === "unavailable" ? { reason: copy.reason } : {}),
  });
  return toView(target.url, copy);
}

async function findTarget(db: Db, userId: string, linkId: string) {
  const [row] = await db
    .select({
      url: savedLink.originalUrl,
      resourceId: resource.id,
      canonicalUrl: resource.canonicalUrl,
      kind: resource.kind,
      cached: resourceReader,
    })
    .from(savedLink)
    .innerJoin(resource, eq(resource.id, savedLink.resourceId))
    .leftJoin(resourceReader, eq(resourceReader.resourceId, resource.id))
    .where(and(eq(savedLink.id, linkId), eq(savedLink.userId, userId)));
  return row;
}

// Videos and files have no article to read, so they are never fetched for one.
function mayHaveArticle(target: { kind: string | null; canonicalUrl: string }): boolean {
  return target.kind !== "video" && target.kind !== "other" && !isYouTube(target.canonicalUrl);
}

// A stored article that no longer fits the contract is treated as missing and fetched again.
function freshCopy(row: typeof resourceReader.$inferSelect | null, now: number): Copy | null {
  if (row === null) return null;
  const age = now - row.fetchedAt.getTime();
  if (row.status === "unavailable") return age < UNAVAILABLE_FRESH_MS ? { status: "unavailable", reason: row.reason ?? "" } : null;
  const article = readerArticleSchema.safeParse(row.article);
  return article.success && age < OK_FRESH_MS ? { status: "ok", article: article.data } : null;
}

// The canonical URL is fetched, never the user's own: the copy is shared, and a
// saved URL can carry one user's tokens.
async function readPage(fetchPage: ReaderDeps["fetchPage"], canonicalUrl: string): Promise<Copy> {
  try {
    const page = await fetchPage(canonicalUrl);
    if (page.html === null) return { status: "unavailable", reason: "not_html" };
    const article = extractArticle(page.html, page.url);
    return article === null ? { status: "unavailable", reason: "no_article" } : { status: "ok", article };
  } catch (error) {
    if (error instanceof FetchError) return { status: "unavailable", reason: error.reason };
    throw error;
  }
}

async function storeCopy(db: Db, resourceId: string, copy: Copy, now: number): Promise<void> {
  const values = {
    status: copy.status,
    article: copy.status === "ok" ? copy.article : null,
    reason: copy.status === "unavailable" ? copy.reason : null,
    fetchedAt: new Date(now),
  };
  await db
    .insert(resourceReader)
    .values({ resourceId, ...values })
    .onConflictDoUpdate({ target: resourceReader.resourceId, set: values });
}

function toView(url: string, copy: Copy): ReaderView {
  return copy.status === "ok" ? { status: "ok", url, article: copy.article } : { status: "unavailable", url };
}
