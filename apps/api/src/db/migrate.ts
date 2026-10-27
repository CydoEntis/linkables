import { fileURLToPath } from "node:url";
import { migrate } from "drizzle-orm/libsql/migrator";
import type { Db } from "./client";

export const migrationsFolder = fileURLToPath(new URL("../../sqlite", import.meta.url));
export function migrateDb(db: Db): Promise<void> {
  return migrate(db, { migrationsFolder });
}
