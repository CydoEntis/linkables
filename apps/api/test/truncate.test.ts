import { expect, it } from "vitest";
import { createDb } from "../src/db/client";
import { migrateDb } from "../src/db/migrate";
import { resource } from "../src/db/schema";
import { truncateAll } from "./truncate";

it("resets a test library without dropping its schema", async () => {
  const connection = createDb("file::memory:");
  try {
    await connection.ready;
    await migrateDb(connection.db);
    await connection.db.insert(resource).values({ canonicalUrl: "https://example.com" });
    await truncateAll(connection.db);
    expect(await connection.db.$count(resource)).toBe(0);
    await connection.db.insert(resource).values({ canonicalUrl: "https://example.com/again" });
    expect(await connection.db.$count(resource)).toBe(1);
  } finally { await connection.close(); }
});
