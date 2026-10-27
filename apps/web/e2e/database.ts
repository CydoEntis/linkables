import { createHash } from "node:crypto";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { checkTestDatabaseUrl } from "../../api/test/db-setup";
import { createDb } from "../../api/src/db/client";
import { migrateDb } from "../../api/src/db/migrate";

// Stable across Playwright's config/server/worker processes, isolated per checkout.
export function testDatabaseUrl(): string {
  const checkout = createHash("sha256").update(import.meta.url).digest("hex").slice(0, 12);
  return checkTestDatabaseUrl(process.env.TEST_DATABASE_URL ?? pathToFileURL(join(tmpdir(), `linkables-e2e-${checkout}_test.db`)).href);
}

export async function migrateE2eDatabase(): Promise<void> {
  const connection = createDb(testDatabaseUrl());
  await connection.ready;
  try { await migrateDb(connection.db); }
  finally { await connection.close(); }
}
