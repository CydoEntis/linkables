import { EXPORT_FORMAT_VERSION, type ExportResponse } from "@linkables/shared/export";
import { and, asc, eq } from "drizzle-orm";
import type { Db, Tx } from "../db/client";
import { collection, collectionItem, resource, savedLink } from "../db/schema";

async function exportedCollections(tx: Tx, userId: string) {
  const rows = await tx
    .select()
    .from(collection)
    .where(eq(collection.userId, userId))
    .orderBy(asc(collection.createdAt), asc(collection.id));
  return rows.map((row) => ({ id: row.id, name: row.name, createdAt: row.createdAt.toISOString() }));
}

// Ordered like exportedCollections, so each link lists its collections in file order.
async function collectionIdsByLink(tx: Tx, userId: string): Promise<Map<string, string[]>> {
  const rows = await tx
    .select({ linkId: collectionItem.savedLinkId, collectionId: collectionItem.collectionId })
    .from(collectionItem)
    .innerJoin(collection, eq(collection.id, collectionItem.collectionId))
    .innerJoin(savedLink, eq(savedLink.id, collectionItem.savedLinkId))
    .where(and(eq(collection.userId, userId), eq(savedLink.userId, userId)))
    .orderBy(asc(collection.createdAt), asc(collection.id));
  const byLink = new Map<string, string[]>();
  for (const { linkId, collectionId } of rows) {
    const ids = byLink.get(linkId);
    if (ids === undefined) byLink.set(linkId, [collectionId]);
    else ids.push(collectionId);
  }
  return byLink;
}

async function exportedLinks(tx: Tx, userId: string) {
  const rows = await tx
    .select({ link: savedLink, canonicalUrl: resource.canonicalUrl, title: resource.title })
    .from(savedLink)
    .innerJoin(resource, eq(resource.id, savedLink.resourceId))
    .where(eq(savedLink.userId, userId))
    .orderBy(asc(savedLink.savedAt), asc(savedLink.id));
  const memberships = await collectionIdsByLink(tx, userId);
  return rows.map(({ link, canonicalUrl, title }) => ({
    canonicalUrl,
    originalUrl: link.originalUrl,
    title,
    titleOverride: link.titleOverride,
    note: link.note,
    pinned: link.pinned,
    savedAt: link.savedAt.toISOString(),
    collectionIds: memberships.get(link.id) ?? [],
  }));
}

// One transaction snapshot, so a save or filing mid-export cannot leave a
// link pointing at a collection the file does not contain.
export function buildExport(db: Db, userId: string, exportedAt: Date): Promise<ExportResponse> {
  return db.transaction(
    async (tx) => ({
      version: EXPORT_FORMAT_VERSION,
      exportedAt: exportedAt.toISOString(),
      links: await exportedLinks(tx, userId),
      collections: await exportedCollections(tx, userId),
    }),
  );
}
