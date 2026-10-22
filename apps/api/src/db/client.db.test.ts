import { sql } from "drizzle-orm";
import { afterAll, expect, it, vi } from "vitest";
import { connectTestDb } from "../../test/db";

const { db, close } = connectTestDb();

afterAll(close);

it("does not print server notices, which bypass the redacting logger", async () => {
  const log = vi.spyOn(console, "log").mockImplementation(() => {});

  await db.execute(sql`select websearch_to_tsquery('english', 'the')`);

  expect(log).not.toHaveBeenCalled();
  log.mockRestore();
});
