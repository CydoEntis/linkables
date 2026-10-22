import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

// prepare: false because Supabase's transaction pooler cannot hold prepared
// statements across the transactions it multiplexes onto one connection.
// onnotice: the default console.log bypasses the redacting logger, and notices
// (e.g. a stop-word-only search) are informational.
export function createDb(databaseUrl: string) {
  const sql = postgres(databaseUrl, { prepare: false, onnotice: () => {} });
  return { db: drizzle(sql, { schema }), close: () => sql.end() };
}

export type Db = ReturnType<typeof createDb>["db"];

export type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];
