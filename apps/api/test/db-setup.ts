import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { inspect, parseEnv } from "node:util";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import type { TestProject } from "vitest/node";

declare module "vitest" {
  export interface ProvidedContext {
    testDatabaseUrl: string;
  }
}

const envFile = fileURLToPath(new URL("../.env", import.meta.url));
const migrationsFolder = fileURLToPath(new URL("../drizzle", import.meta.url));

// These tests truncate every table, so refuse anything that could hold real
// data: the database name must say it is a test database, and Supabase is never
// a test host.
export function checkTestDatabaseUrl(url: string): string {
  if (!URL.canParse(url)) throw new Error("TEST_DATABASE_URL is not a valid URL.");
  const { hostname, pathname } = new URL(url);
  if (!pathname.slice(1).endsWith("_test")) {
    throw new Error("TEST_DATABASE_URL's database name must end in _test.");
  }
  if (hostname.endsWith("supabase.com") || hostname.endsWith("supabase.co")) {
    throw new Error("TEST_DATABASE_URL must not point at a Supabase host.");
  }
  return url;
}

export function testDatabaseUrl(): string {
  const fromFile = existsSync(envFile) ? parseEnv(readFileSync(envFile, "utf8")).TEST_DATABASE_URL : undefined;
  const url = process.env.TEST_DATABASE_URL ?? fromFile;
  if (!url) {
    throw new Error(
      "TEST_DATABASE_URL is not set. Start Postgres with `docker compose up -d` and set " +
        "TEST_DATABASE_URL=postgres://postgres:postgres@localhost:5432/linkaroo_test (env or apps/api/.env).",
    );
  }
  return checkTestDatabaseUrl(url);
}

export async function migrateTestDb(url: string) {
  // The migrator's "already exists, skipping" notices are expected on every run.
  const sql = postgres(url, { onnotice: () => undefined });
  try {
    await migrate(drizzle(sql), { migrationsFolder });
  } finally {
    await sql.end();
  }
}

// workaround: vitest 5.0.5 crashes while source-mapping a stack thrown from
// globalSetup and prints its own TypeError instead. A pre-rendered stack skips
// that lookup, so the real reason reaches the terminal.
function printable(error: unknown): Error {
  const wrapped = new Error(`test database setup failed: ${inspect(error)}`);
  wrapped.stack = wrapped.message;
  return wrapped;
}

export default async function setup(project: TestProject) {
  try {
    const url = testDatabaseUrl();
    await migrateTestDb(url);
    project.provide("testDatabaseUrl", url);
  } catch (error) {
    throw printable(error);
  }
}
