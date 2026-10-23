import type { SavedLink } from "@linkables/shared/links";
import { and, eq, sql } from "drizzle-orm";
import type { Db, Tx } from "../db/client";
import { collection, collectionItem, resource, savedLink } from "../db/schema";
import { InternalError } from "../http/errors";

type LinkCollection = SavedLink["collections"][number];

// A correlated subquery in the select list, so a page needs no extra round trip.
// The collection is scoped to the caller, so a filing of the caller's link into
// another user's collection never shows that collection's name.
export function collectionsOf(userId: string) {
  return sql<LinkCollection[]>`coalesce((
    select json_agg(json_build_object('id', ${collection.id}, 'name', ${collection.name})
      order by lower(${collection.name}), ${collection.id})
    from ${collectionItem}
    inner join ${collection} on ${collection.id} = ${collectionItem.collectionId}
    where ${collectionItem.savedLinkId} = ${savedLink.id} and ${collection.userId} = ${userId}
  ), '[]'::json)`;
}

export function toSavedLink(
  link: typeof savedLink.$inferSelect,
  res: typeof resource.$inferSelect,
  collections: LinkCollection[],
): SavedLink {
  return {
    id: link.id,
    originalUrl: link.originalUrl,
    titleOverride: link.titleOverride,
    note: link.note,
    pinned: link.pinned,
    savedAt: link.savedAt.toISOString(),
    savedFrom: link.savedFrom,
    collections,
    resource: {
      id: res.id,
      canonicalUrl: res.canonicalUrl,
      title: res.title,
      description: res.description,
      author: res.author,
      faviconUrl: res.faviconUrl,
      thumbnailUrl: res.thumbnailUrl,
      kind: res.kind,
      fetchStatus: res.fetchStatus,
    },
  };
}

export async function findSavedLink(db: Db | Tx, userId: string, linkId: string): Promise<SavedLink | undefined> {
  const [row] = await db
    .select({ link: savedLink, resource, collections: collectionsOf(userId) })
    .from(savedLink)
    .innerJoin(resource, eq(resource.id, savedLink.resourceId))
    .where(and(eq(savedLink.id, linkId), eq(savedLink.userId, userId)));
  return row && toSavedLink(row.link, row.resource, row.collections);
}

// For a link the caller has just written, so a missing row is a bug, not a 404.
export async function loadSavedLink(db: Db | Tx, userId: string, linkId: string): Promise<SavedLink> {
  const link = await findSavedLink(db, userId, linkId);
  if (link === undefined) throw new InternalError("saved link vanished after write");
  return link;
}
