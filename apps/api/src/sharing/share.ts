import { randomBytes } from "node:crypto";
import {
  SHARED_LINKS_MAX,
  type OwnSharedCollection,
  type OwnSharedCollectionsResponse,
  type SharedCollection,
  type SharedGroup,
  type SharedLink,
  type ShareScopeRequest,
  type ShareState,
} from "@linkables/shared/sharing";
import { and, asc, count, desc, eq, inArray, isNotNull, isNull, max, notInArray, or, sql } from "drizzle-orm";
import { DrizzleQueryError } from "drizzle-orm/errors";
import type { Db, Tx } from "../db/client";
import { collection, collectionGroup, collectionItem, resource, savedLink } from "../db/schema";
import { lockCollection } from "../groups/groups";
import { NotFoundError } from "../http/errors";

type Owned = { userId: string; id: string };

const TOKEN_BYTES = 24;

function newToken(): string {
  return randomBytes(TOKEN_BYTES).toString("base64url");
}

function ownedCollection({ userId, id }: Owned) {
  return and(eq(collection.id, id), eq(collection.userId, userId));
}

// The groups and the ungrouped switch ride along only for a collection that has groups.
export async function getShareState(db: Db | Tx, owned: Owned): Promise<ShareState> {
  const [row] = await db
    .select({ token: collection.shareToken, ungrouped: collection.shareUngrouped })
    .from(collection)
    .where(ownedCollection(owned));
  if (row === undefined) throw new NotFoundError("Collection not found");
  const groups = await db
    .select({ id: collectionGroup.id, name: collectionGroup.name, shared: collectionGroup.shared })
    .from(collectionGroup)
    .where(eq(collectionGroup.collectionId, owned.id))
    .orderBy(asc(collectionGroup.position), asc(collectionGroup.id));
  return groups.length === 0 ? { token: row.token } : { token: row.token, ungrouped: row.ungrouped, groups };
}

// Keeps a link that is already on, so a repeated turn-on never kills one already sent.
export async function enableShare(db: Db, owned: Owned): Promise<ShareState> {
  await db
    .update(collection)
    .set({ shareToken: sql`coalesce(${collection.shareToken}, ${newToken()})` })
    .where(ownedCollection(owned));
  return getShareState(db, owned);
}

export async function disableShare(db: Db, owned: Owned): Promise<ShareState> {
  await db.update(collection).set({ shareToken: null }).where(ownedCollection(owned));
  return getShareState(db, owned);
}

// Works with the link off too, so the owner can choose before sharing. The listed
// groups become shared and every other group of this collection does not.
export function setShareScope(db: Db, owned: Owned, scope: ShareScopeRequest): Promise<ShareState> {
  return db.transaction(async (tx) => {
    await lockCollection(tx, { userId: owned.userId, collectionId: owned.id });
    const own = await tx.select({ id: collectionGroup.id }).from(collectionGroup).where(eq(collectionGroup.collectionId, owned.id));
    const known = new Set(own.map((group) => group.id));
    if (scope.groupIds.some((id) => !known.has(id))) throw new NotFoundError("Group not found");
    await tx.update(collection).set({ shareUngrouped: scope.ungrouped }).where(eq(collection.id, owned.id));
    const inCollection = eq(collectionGroup.collectionId, owned.id);
    if (scope.groupIds.length > 0) {
      await tx.update(collectionGroup).set({ shared: true }).where(and(inCollection, inArray(collectionGroup.id, scope.groupIds)));
      await tx.update(collectionGroup).set({ shared: false }).where(and(inCollection, notInArray(collectionGroup.id, scope.groupIds)));
    } else {
      await tx.update(collectionGroup).set({ shared: false }).where(inCollection);
    }
    return getShareState(tx, owned);
  });
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

// Joins the filing's group inside this one collection. Filtering here, on the
// join row, is why a link's groups in other collections never matter.
const filingGroup = and(eq(collectionGroup.collectionId, collectionItem.collectionId), eq(collectionGroup.id, collectionItem.groupId));

// What a viewer may see: ungrouped links when the owner shows them, and links in a group the owner shows.
const visibleToViewers = or(and(isNull(collectionItem.groupId), eq(collection.shareUngrouped, true)), eq(collectionGroup.shared, true));

async function visibleLinks(db: Db, collectionId: string) {
  return db
    .select({
      groupId: collectionItem.groupId,
      groupName: collectionGroup.name,
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
    .leftJoin(collectionGroup, filingGroup)
    .where(and(eq(collectionItem.collectionId, collectionId), visibleToViewers))
    .orderBy(sql`${collectionGroup.position} asc nulls first`, asc(collectionGroup.id), desc(collectionItem.createdAt), desc(savedLink.id))
    .limit(SHARED_LINKS_MAX);
}

// Per group (null for the ungrouped links), so each count is only what the viewer can see.
async function visibleCounts(db: Db, collectionId: string) {
  return db
    .select({ groupId: collectionItem.groupId, total: count(), newest: max(collectionItem.createdAt) })
    .from(collectionItem)
    .innerJoin(collection, eq(collection.id, collectionItem.collectionId))
    .innerJoin(savedLink, ownersFiling)
    .leftJoin(collectionGroup, filingGroup)
    .where(and(eq(collectionItem.collectionId, collectionId), visibleToViewers))
    .groupBy(collectionItem.groupId);
}

type Counts = Awaited<ReturnType<typeof visibleCounts>>;

function statsOf(counts: Counts): { linkCount: number; updatedAt: string | null } {
  const newest = counts.reduce<Date | null>((latest, row) => (row.newest !== null && (latest === null || row.newest > latest) ? row.newest : latest), null);
  return { linkCount: counts.reduce((sum, row) => sum + row.total, 0), updatedAt: newest ? utcDay(newest) : null };
}

// Viewers only see the day, so the exact filing time never leaves the server.
function utcDay(date: Date): string {
  return `${date.toISOString().slice(0, 10)}T00:00:00.000Z`;
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

type Row = Awaited<ReturnType<typeof visibleLinks>>[number];

function displayLink({ url, title, description, thumbnailUrl, faviconUrl, kind }: Row): SharedLink {
  return { url: withoutCredentials(url), title, description, thumbnailUrl, faviconUrl, kind };
}

// Rows arrive ungrouped first, then by group position, so a group's rows are contiguous.
function groupsOf(rows: Row[], counts: Counts): SharedGroup[] {
  const totals = new Map(counts.map((row) => [row.groupId, row.total]));
  const groups = new Map<string, SharedGroup>();
  for (const row of rows) {
    if (row.groupId === null || row.groupName === null) continue;
    const group = groups.get(row.groupId) ?? { name: row.groupName, linkCount: totals.get(row.groupId) ?? 0, links: [] };
    group.links.push(displayLink(row));
    groups.set(row.groupId, group);
  }
  return [...groups.values()];
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
  const [rows, counts] = await Promise.all([visibleLinks(db, found.id), visibleCounts(db, found.id)]);
  const groups = groupsOf(rows, counts);
  return {
    name: found.name,
    ...statsOf(counts),
    links: rows.filter((row) => row.groupId === null).map(displayLink),
    ...(groups.length > 0 ? { groups } : {}),
  };
}
