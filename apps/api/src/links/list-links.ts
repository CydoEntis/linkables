import { isDateOnly, type LinkSort, type LinkView, type ListLinksResponse, type ResourceKind } from "@linkables/shared/links";
import { and, eq, exists, notExists, sql } from "drizzle-orm";
import { requireCollection } from "../collections/collections";
import type { Db } from "../db/client";
import { collection, collectionItem, resource, savedLink } from "../db/schema";
import { encodeCursor, type Cursor } from "./cursor";
import { matchesSearch } from "./search";
import { after, cursorAt, orderBy, sortKeys } from "./sort";
import { toSavedLink } from "./to-saved-link";

export type ListLinksInput = {
  userId: string;
  view: LinkView;
  sort: LinkSort;
  limit: number;
  cursor: Cursor | undefined;
  collectionId?: string | undefined;
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

function inCollection(db: Db, collectionId: string) {
  return exists(
    db
      .select({ one: sql`1` })
      .from(collectionItem)
      .where(and(eq(collectionItem.savedLinkId, savedLink.id), eq(collectionItem.collectionId, collectionId))),
  );
}

// A date bound is a whole UTC day, computed in SQL so 9999-12-31 + 1 day still works.
function savedFrom(from: string) {
  return isDateOnly(from)
    ? sql`${savedLink.savedAt} >= ${from}::date::timestamp at time zone 'UTC'`
    : sql`${savedLink.savedAt} >= ${from}::timestamptz`;
}

function savedThrough(to: string) {
  return isDateOnly(to)
    ? sql`${savedLink.savedAt} < (${to}::date + 1)::timestamp at time zone 'UTC'`
    : sql`${savedLink.savedAt} <= ${to}::timestamptz`;
}

function matchesFilters(db: Db, input: ListLinksInput) {
  const { userId, view, collectionId, q, kind, pinned, from, to } = input;
  return and(
    eq(savedLink.userId, userId),
    view === "inbox" ? inInbox(db, userId) : undefined,
    collectionId === undefined ? undefined : inCollection(db, collectionId),
    q === undefined ? undefined : matchesSearch(q),
    kind === undefined ? undefined : eq(resource.kind, kind),
    pinned === undefined ? undefined : eq(savedLink.pinned, pinned),
    from === undefined ? undefined : savedFrom(from),
    to === undefined ? undefined : savedThrough(to),
  );
}

export async function listLinks(db: Db, input: ListLinksInput): Promise<ListLinksResponse> {
  const { userId, sort, limit, cursor, collectionId } = input;
  if (collectionId !== undefined) await requireCollection(db, { userId, id: collectionId });
  const rows = await db
    .select({ link: savedLink, resource, ...sortKeys })
    .from(savedLink)
    .innerJoin(resource, eq(resource.id, savedLink.resourceId))
    .where(and(matchesFilters(db, input), cursor ? await after(db, userId, cursor) : undefined))
    .orderBy(...orderBy(sort))
    .limit(limit + 1);

  const page = rows.slice(0, limit);
  const last = page.at(-1);
  return {
    items: page.map((row) => toSavedLink(row.link, row.resource)),
    cursor:
      rows.length > limit && last
        ? encodeCursor(cursorAt(sort, { ...last, id: last.link.id, pinned: last.link.pinned }))
        : null,
  };
}
