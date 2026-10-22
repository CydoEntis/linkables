import type { LinkView, ListLinksResponse } from "@linkaroo/shared/links";
import { and, desc, eq, exists, notExists, sql } from "drizzle-orm";
import { requireCollection } from "../collections/collections";
import type { Db } from "../db/client";
import { collection, collectionItem, resource, savedLink } from "../db/schema";
import { encodeCursor, type Cursor } from "./cursor";
import { matchesSearch } from "./search";
import { toSavedLink } from "./to-saved-link";

export type ListLinksInput = {
  userId: string;
  view: LinkView;
  limit: number;
  cursor: Cursor | undefined;
  collectionId: string | undefined;
  q?: string | undefined;
};

const cursorSavedAt = sql<string>`to_char(${savedLink.savedAt} at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"')`;

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

function after(cursor: Cursor) {
  return sql`(${savedLink.savedAt}, ${savedLink.id}) < (${cursor.savedAt}::timestamptz, ${cursor.id}::uuid)`;
}

export async function listLinks(
  db: Db,
  { userId, view, limit, cursor, collectionId, q }: ListLinksInput,
): Promise<ListLinksResponse> {
  if (collectionId !== undefined) await requireCollection(db, { userId, id: collectionId });
  const rows = await db
    .select({ link: savedLink, resource, cursorSavedAt })
    .from(savedLink)
    .innerJoin(resource, eq(resource.id, savedLink.resourceId))
    .where(
      and(
        eq(savedLink.userId, userId),
        view === "inbox" ? inInbox(db, userId) : undefined,
        collectionId === undefined ? undefined : inCollection(db, collectionId),
        q === undefined ? undefined : matchesSearch(q),
        cursor ? after(cursor) : undefined,
      ),
    )
    .orderBy(desc(savedLink.savedAt), desc(savedLink.id))
    .limit(limit + 1);

  const page = rows.slice(0, limit);
  const last = page.at(-1);
  return {
    items: page.map((row) => toSavedLink(row.link, row.resource)),
    cursor: rows.length > limit && last ? encodeCursor({ savedAt: last.cursorSavedAt, id: last.link.id }) : null,
  };
}
