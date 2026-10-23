import { canonicalize } from "@linkables/shared/url";
import type { Db } from "../../api/src/db/client";
import { resource, savedLink } from "../../api/src/db/schema";

type NewResource = typeof resource.$inferInsert;
type NewSavedLink = typeof savedLink.$inferInsert;

export type SeedLink = {
  url: string;
  resource?: Omit<NewResource, "id" | "canonicalUrl">;
  link?: Omit<NewSavedLink, "id" | "userId" | "resourceId" | "originalUrl">;
};

export type SeededLink = typeof savedLink.$inferSelect;

function canonicalUrlFor(url: string): string {
  const result = canonicalize(url);
  if (!result.ok) throw new Error(`cannot seed ${url}: ${result.reason}`);
  return result.url;
}

// Two users may seed the same URL, so the shared resource row is reused.
async function upsertResource(db: Db, canonicalUrl: string, fields: SeedLink["resource"]) {
  const [row] = await db
    .insert(resource)
    .values({ ...fields, canonicalUrl })
    .onConflictDoUpdate({ target: resource.canonicalUrl, set: { canonicalUrl } })
    .returning({ id: resource.id });
  if (row === undefined) throw new Error(`resource upsert returned no row for ${canonicalUrl}`);
  return row.id;
}

async function seedLink(db: Db, userId: string, { url, resource: fields, link }: SeedLink): Promise<SeededLink> {
  const resourceId = await upsertResource(db, canonicalUrlFor(url), fields);
  const [row] = await db
    .insert(savedLink)
    .values({ ...link, userId, resourceId, originalUrl: url })
    .returning();
  if (row === undefined) throw new Error(`saved_link insert returned no row for ${url}`);
  return row;
}

// Sequential so savedAt defaults follow the given order.
export async function seedLinks(db: Db, userId: string, links: SeedLink[]): Promise<SeededLink[]> {
  const seeded: SeededLink[] = [];
  for (const link of links) seeded.push(await seedLink(db, userId, link));
  return seeded;
}

// Stands in for the metadata worker, which the e2e API runs without.
export async function markFetched(db: Db, url: string, title: string): Promise<void> {
  const rows = await db.$client`
    update resource set title = ${title}, fetch_status = 'fetched'
    where canonical_url = ${canonicalUrlFor(url)}
    returning id`;
  if (rows.length !== 1) throw new Error(`no resource to mark fetched for ${url}`);
}
