import { expect, it } from "vitest";
import { createDb } from "./client";
import { migrateDb } from "./migrate";
import { resource } from "./schema";

it("another request never observes a transaction that rolls back", async () => {
  const connection = createDb("file::memory:");
  const inserted = Promise.withResolvers<undefined>();
  const finish = Promise.withResolvers<undefined>();
  try {
    await connection.ready;
    await migrateDb(connection.db);
    const transaction = connection.db.transaction(async (tx) => {
      await tx.insert(resource).values({ canonicalUrl: "https://example.com/uncommitted" });
      inserted.resolve(undefined);
      await finish.promise;
      throw new Error("Roll back this request");
    });
    const rejected = expect(transaction).rejects.toThrow("Roll back this request");
    await inserted.promise;
    const otherRequest = connection.db.$count(resource);
    finish.resolve(undefined);
    await rejected;
    expect(await otherRequest).toBe(0);
  } finally {
    finish.resolve(undefined);
    await connection.close();
  }
});

it("a failed query does not block later requests", async () => {
  const connection = createDb("file::memory:");
  try {
    await connection.ready;
    await migrateDb(connection.db);
    await connection.db.insert(resource).values({ canonicalUrl: "https://example.com/one" });
    await expect(connection.db.insert(resource).values({ canonicalUrl: "https://example.com/one" })).rejects.toThrow();
    await connection.db.insert(resource).values({ canonicalUrl: "https://example.com/two" });
    expect(await connection.db.$count(resource)).toBe(2);
  } finally {
    await connection.close();
  }
});
