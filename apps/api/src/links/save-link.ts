import type { SaveLinkResponse } from "@linkaroo/shared/links";
import { and, eq } from "drizzle-orm";
import type { Db } from "../db/client";
import { job, resource, savedLink } from "../db/schema";
import { InternalError } from "../http/errors";

type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];
type ResourceRow = typeof resource.$inferSelect;
type SavedLinkRow = typeof savedLink.$inferSelect;

export type SaveLinkInput = { userId: string; originalUrl: string; canonicalUrl: string };

function found<T>(row: T | undefined, what: string): T {
  if (row === undefined) throw new InternalError(`${what} vanished during save`);
  return row;
}

// ON CONFLICT DO NOTHING waits for a concurrent insert of the same key to settle,
// so exactly one transaction gets the row back: that one created the resource
// and is the only one that queues its fetch. The follow-up select runs in a
// fresh snapshot and sees the winner's committed row.
async function upsertResource(tx: Tx, canonicalUrl: string): Promise<ResourceRow> {
  const [created] = await tx.insert(resource).values({ canonicalUrl }).onConflictDoNothing().returning();
  if (created) {
    await tx.insert(job).values({ resourceId: created.id });
    return created;
  }
  const [existing] = await tx.select().from(resource).where(eq(resource.canonicalUrl, canonicalUrl));
  return found(existing, "resource");
}

async function insertSavedLink(tx: Tx, input: SaveLinkInput, resourceId: string) {
  const [created] = await tx
    .insert(savedLink)
    .values({ userId: input.userId, resourceId, originalUrl: input.originalUrl })
    .onConflictDoNothing()
    .returning();
  if (created) return { link: created, duplicate: false };
  const [existing] = await tx
    .select()
    .from(savedLink)
    .where(and(eq(savedLink.userId, input.userId), eq(savedLink.resourceId, resourceId)));
  return { link: found(existing, "saved link"), duplicate: true };
}

function toResponse(link: SavedLinkRow, res: ResourceRow, duplicate: boolean): SaveLinkResponse {
  return {
    id: link.id,
    originalUrl: link.originalUrl,
    titleOverride: link.titleOverride,
    note: link.note,
    pinned: link.pinned,
    savedAt: link.savedAt.toISOString(),
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
    duplicate,
  };
}

export function saveLink(db: Db, input: SaveLinkInput): Promise<SaveLinkResponse> {
  return db.transaction(async (tx) => {
    const res = await upsertResource(tx, input.canonicalUrl);
    const { link, duplicate } = await insertSavedLink(tx, input, res.id);
    return toResponse(link, res, duplicate);
  });
}
