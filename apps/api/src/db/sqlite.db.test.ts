import { randomUUID } from "node:crypto";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { eq, sql } from "drizzle-orm";
import { expect, it } from "vitest";
import { createDb } from "./client";
import { migrateDb } from "./migrate";
import { resource, savedLink } from "./schema";

it("keeps saved links after closing and reopening a local database", async () => {
  const folder = await mkdtemp(join(tmpdir(), "linkables-persistence-"));
  const url = pathToFileURL(join(folder, "library.db")).href;
  const first = createDb(url);
  try {
    await migrateDb(first.db);
    const [page] = await first.db.insert(resource).values({ canonicalUrl: "https://example.com/saved" }).returning();
    if (!page) throw new Error("Missing resource");
    await first.db.insert(savedLink).values({ userId: randomUUID(), resourceId: page.id, originalUrl: page.canonicalUrl });
    await first.close();
    const second = createDb(url);
    try {
      await migrateDb(second.db);
      expect(await second.db.$count(savedLink)).toBe(1);
      expect(await second.db.select().from(resource).where(eq(resource.id, page.id))).toHaveLength(1);
      expect(await second.db.all(sql`pragma foreign_key_check`)).toEqual([]);
    } finally {
      await second.close();
    }
  } finally {
    await first.close();
    await rm(folder, { recursive: true, force: true });
  }
});
