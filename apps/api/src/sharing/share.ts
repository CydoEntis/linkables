import { randomBytes } from "node:crypto";
import { SHARED_LINKS_MAX, type OwnSharedCollection, type OwnSharedCollectionsResponse, type SharedCollection, type ShareState } from "@linkables/shared/sharing";
import { and, asc, count, desc, eq, isNotNull, sql } from "drizzle-orm";
import { DrizzleQueryError } from "drizzle-orm/errors";
import type { Db } from "../db/client";
import { collection, collectionItem, resource, savedLink } from "../db/schema";
import { NotFoundError } from "../http/errors";

type Owned = { userId: string; id: string };

const TOKEN_BYTES = 24;

function newToken(): string {
  return randomBytes(TOKEN_BYTES).toString("base64url");
}

function ownedCollection({ userId, id }: Owned) {
  return and(eq(collection.id, id), eq(collection.userId, userId));
}

function stateOf(row: { token: string | null } | undefined): ShareState {
  if (row === undefined) throw new NotFoundError("Collection not found");
  return { token: row.token };
}

export async function getShareState(db: Db, owned: Owned): Promise<ShareState> {
  const [row] = await db.select({ token: collection.shareToken }).from(collection).where(ownedCollection(owned));
  return stateOf(row);
}

// Keeps a link that is already on, so a repeated turn-on never kills one already sent.
export async function enableShare(db: Db, owned: Owned): Promise<ShareState> {
  const [row] = await db
    .update(collection)
    .set({ shareToken: sql`coalesce(${collection.shareToken}, ${newToken()})` })
    .where(ownedCollection(owned))
    .returning({ token: collection.shareToken });
  return stateOf(row);
}

export async function disableShare(db: Db, owned: Owned): Promise<ShareState> {
  const [row] = await db
    .update(collection)
    .set({ shareToken: null })
    .where(ownedCollection(owned))
    .returning({ token: collection.shareToken });
  return stateOf(row);
}

export async function listOwnShared(db: Db, userId: string): Promise<OwnSharedCollectionsResponse> {
  const rows = await db
    .select({ id: collection.id, name: collection.name, token: collection.shareToken })
    .from(collection)
    .where(and(eq(collection.userId, userId), isNotNull(collection.shareToken)))
    .orderBy(asc(sql`lower(${collection.name})`), asc(collection.id));
  return { items: rows.filter((row): row is OwnSharedCollection => row.token !== null) };
}

// A filing counts only when the link belongs to the collection's owner.
const ownersFiling = and(eq(savedLink.id, collectionItem.savedLinkId), eq(savedLink.userId, collection.userId));

async function sharedLinks(db: Db, collectionId: string) {
  return db
    .select({
      url: savedLink.originalUrl,
      title: sql<string | null>`coalesce(${savedLink.titleOverride}, ${resource.title})`,
      description: resource.description,
      thumbnailUrl: resource.thumbnailUrl,
      faviconUrl: resource.faviconUrl,
      kind: resource.kind,
    })
    .from(collectionItem)
    .innerJoin(collection, eq(collection.id, collectionItem.collectionId))
    .innerJoin(savedLink, ownersFiling)
    .innerJoin(resource, eq(resource.id, savedLink.resourceId))
    .where(eq(collectionItem.collectionId, collectionId))
    .orderBy(desc(collectionItem.createdAt), desc(savedLink.id))
    .limit(SHARED_LINKS_MAX);
}

async function sharedLinkCount(db: Db, collectionId: string): Promise<number> {
  const [row] = await db
    .select({ total: count() })
    .from(collectionItem)
    .innerJoin(collection, eq(collection.id, collectionItem.collectionId))
    .innerJoin(savedLink, ownersFiling)
    .where(eq(collectionItem.collectionId, collectionId));
  return row?.total ?? 0;
}

// The URL as the owner saved it, which may carry a login; that never goes public.
function withoutCredentials(saved: string): string {
  if (!URL.canParse(saved)) return saved;
  const url = new URL(saved);
  if (url.username === "" && url.password === "") return saved;
  url.username = "";
  url.password = "";
  return url.href;
}

// Drizzle puts a failed query's params in its error, which the error handler
// logs; a token must never reach the logs, so only the driver's cause goes on.
async function withoutParams<T>(query: Promise<T>): Promise<T> {
  try {
    return await query;
  } catch (error) {
    // eslint-disable-next-line preserve-caught-error -- the caught error itself carries the token.
    if (error instanceof DrizzleQueryError) throw new Error("Shared collection lookup failed", { cause: error.cause });
    throw error;
  }
}

// An unknown token and a turned-off one are the same NOT_FOUND.
export async function sharedCollection(db: Db, token: string): Promise<SharedCollection> {
  const [found] = await withoutParams(
    db.select({ id: collection.id, name: collection.name }).from(collection).where(eq(collection.shareToken, token)),
  );
  if (found === undefined) throw new NotFoundError("Shared collection not found");
  const [links, linkCount] = await Promise.all([sharedLinks(db, found.id), sharedLinkCount(db, found.id)]);
  return { name: found.name, linkCount, links: links.map((link) => ({ ...link, url: withoutCredentials(link.url) })) };
}
