// Free of vitest imports so the web e2e suite can share it.
import { getTableName, is, sql } from "drizzle-orm";
import { PgTable } from "drizzle-orm/pg-core";
import type { Db } from "../src/db/client";
import * as schema from "../src/db/schema";

const tableList = Object.values(schema)
  .filter((value) => is(value, PgTable))
  .map((table) => `"${getTableName(table)}"`)
  .join(", ");

export async function truncateAll(db: Db) {
  await db.execute(sql.raw(`truncate ${tableList} restart identity cascade`));
}
