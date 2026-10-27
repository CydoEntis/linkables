import { sql } from "drizzle-orm";
import { afterAll, expect, it, vi } from "vitest";
import { connectTestDb } from "../../test/db";

const { db, close } = connectTestDb();

afterAll(close);

it("does not write database operations to console", async () => {
  const log = vi.spyOn(console, "log").mockImplementation(() => {});

  await db.all(sql`select sqlite_version()`);

  expect(log).not.toHaveBeenCalled();
  log.mockRestore();
});
