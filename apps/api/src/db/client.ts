import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "./schema";

export function createDb(databaseUrl: string) {
  if (!databaseUrl.startsWith("file:")) throw new Error("DATABASE_URL must be a local SQLite file: URL");
  if (databaseUrl !== "file::memory:") {
    const path = databaseUrl.startsWith("file://") ? fileURLToPath(databaseUrl) : databaseUrl.slice(5);
    mkdirSync(dirname(path), { recursive: true });
  }
  const client = createClient({ url: databaseUrl });
  const ready = client.executeMultiple("PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000; PRAGMA journal_mode = WAL;");
  return { db: drizzle(client, { schema }), ready, close: () => { client.close(); return Promise.resolve(); } };
}

export type Db = ReturnType<typeof createDb>["db"];
export type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];
