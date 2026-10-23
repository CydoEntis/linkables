// Free of vitest imports so the web e2e suite can share it.
import { getTableName, is, sql } from "drizzle-orm";
import { PgTable } from "drizzle-orm/pg-core";
import type { Db } from "../src/db/client";
import * as schema from "../src/db/schema";

const tableList = Object.values(schema)
  .filter((value) => is(value, PgTable))
  .map((table) => `"${getTableName(table)}"`)
  .join(", ");

const DEADLOCK = "40P01";
const ATTEMPTS = 3;

function isDeadlock(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const code = (error as { code?: unknown }).code;
  return code === DEADLOCK || isDeadlock(error.cause);
}

// The e2e API runs the metadata worker, whose transactions can hold locks on
// these tables while truncate takes them one by one, so Postgres can pick the
// truncate as a deadlock victim. Trying again is safe.
export async function truncateAll(db: Db) {
  for (let attempt = 1; ; attempt += 1) {
    try {
      await db.execute(sql.raw(`truncate ${tableList} restart identity cascade`));
      return;
    } catch (error) {
      if (attempt >= ATTEMPTS || !isDeadlock(error)) throw error;
    }
  }
}
