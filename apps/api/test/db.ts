import { getTableName, is, sql } from "drizzle-orm";
import { PgTable } from "drizzle-orm/pg-core";
import { inject } from "vitest";
import { createDb, type Db } from "../src/db/client";
import * as schema from "../src/db/schema";

const tableList = Object.values(schema)
  .filter((value) => is(value, PgTable))
  .map((table) => `"${getTableName(table)}"`)
  .join(", ");

export function connectTestDb() {
  return createDb(inject("testDatabaseUrl"));
}

export async function truncateAll(db: Db) {
  await db.execute(sql.raw(`truncate ${tableList} restart identity cascade`));
}
