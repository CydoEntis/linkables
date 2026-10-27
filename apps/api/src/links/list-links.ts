import { isDateOnly, type LinkSort, type LinkView, type ListLinksResponse, type ResourceKind } from "@linkables/shared/links";
import { UNGROUPED } from "@linkables/shared/groups";
import { and, eq, exists, isNull, notExists, sql } from "drizzle-orm";
import { requireCollection } from "../collections/collections";
import type { Db } from "../db/client";
import { collection, collectionItem, resource, savedLink, timestampText } from "../db/schema";
import { encodeCursor, type Cursor } from "./cursor";
import { matchesSearch } from "./search";
import { after, cursorAt, orderBy, sortKeys } from "./sort";
import { collectionsOf, toSavedLink } from "./to-saved-link";

export type ListLinksInput = {
  userId: string;
  view: LinkView;
  sort: LinkSort;
  limit: number;
  cursor: Cursor | undefined;
  collectionId?: string | undefined;
  groupId?: string | undefined;
  q?: string | undefined;
  kind?: ResourceKind | undefined;
  pinned?: boolean | undefined;
  from?: string | undefined;
  to?: string | undefined;
};

function inInbox(db: Db, userId: string) {
  return notExists(
    db
      .select({ one: sql`1` })
      .from(collectionItem)
      .innerJoin(collection, eq(collection.id, collectionItem.collectionId))
      .where(and(eq(collectionItem.savedLinkId, savedLink.id), eq(collection.userId, userId))),
  );
}

function inGroup(groupId: string | undefined) {
  if (groupId === undefined) return undefined;
  return groupId === UNGROUPED ? isNull(collectionItem.groupId) : eq(collectionItem.groupId, groupId);
}

function inCollection(db: Db, collectionId: string, groupId: string | undefined) {
  return exists(
    db
      .select({ one: sql`1` })
      .from(collectionItem)
      .where(
        and(
          eq(collectionItem.savedLinkId, savedLink.id),
          eq(collectionItem.collectionId, collectionId),
          inGroup(groupId),
        ),
      ),
  );
}

// The link's group in the one collection being listed.
function groupIn(collectionId: string | undefined) {
  if (collectionId === undefined) return sql<null>`null`;
  return sql<string | null>`(
    select ${collectionItem.groupId} from ${collectionItem}
    where ${collectionItem.savedLinkId} = ${savedLink.id} and ${collectionItem.collectionId} = ${collectionId}
  )`;
}

function savedFrom(from: string) {
  const bound = isDateOnly(from) ? `${from}T00:00:00.000000Z` : timestampText(from);
  return sql`${savedLink.savedAt} >= ${bound}`;
}

function savedThrough(to: string) {
  const bound = isDateOnly(to) ? `${to}T23:59:59.999999Z` : timestampText(to);
  return sql`${savedLink.savedAt} <= ${bound}`;
}

function matchesFilters(db: Db, input: ListLinksInput) {
  const { userId, view, collectionId, groupId, q, kind, pinned, from, to } = input;
  return and(
    eq(savedLink.userId, userId),
    view === "inbox" ? inInbox(db, userId) : undefined,
    collectionId === undefined ? undefined : inCollection(db, collectionId, groupId),
    q === undefined ? undefined : matchesSearch(q),
    kind === undefined ? undefined : eq(resource.kind, kind),
    pinned === undefined ? undefined : eq(savedLink.pinned, pinned),
    from === undefined ? undefined : savedFrom(from),
    to === undefined ? undefined : savedThrough(to),
  );
}

export async function listLinks(db: Db, input: ListLinksInput): Promise<ListLinksResponse> {
  const { userId, sort, limit, cursor, collectionId, groupId } = input;
  if (collectionId !== undefined) await requireCollection(db, { userId, id: collectionId });
  const rows = await db
    .select({ link: savedLink, resource, collections: collectionsOf(userId), groupId: groupIn(collectionId), ...sortKeys })
    .from(savedLink)
    .innerJoin(resource, eq(resource.id, savedLink.resourceId))
    .where(and(matchesFilters(db, input), cursor ? await after(db, userId, cursor) : undefined))
    .orderBy(...orderBy(sort))
    .limit(limit + 1);

  const page = rows.slice(0, limit);
  const last = page.at(-1);
  return {
    items: page.map((row) => {
      const link = toSavedLink(row.link, row.resource, row.collections);
      return groupId === undefined ? link : { ...link, groupId: row.groupId };
    }),
    cursor:
      rows.length > limit && last
        ? encodeCursor(cursorAt(sort, { ...last, id: last.link.id, pinned: last.link.pinned }))
        : null,
  };
}
