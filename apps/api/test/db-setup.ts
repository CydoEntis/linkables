import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import type { TestProject } from "vitest/node";
import { createDb } from "../src/db/client";
import { migrateDb } from "../src/db/migrate";

declare module "vitest" {
  export interface ProvidedContext { testDatabaseUrl: string }
}

export function checkTestDatabaseUrl(url: string): string {
  if (!url.startsWith("file:") || !url.endsWith("_test.db")) {
    throw new Error("TEST_DATABASE_URL must be a local file: URL ending in _test.db.");
  }
  return url;
}

export async function migrateTestDb(url: string) {
  const connection = createDb(url);
  try {
    await connection.ready;
    await migrateDb(connection.db);
  } finally { await connection.close(); }
}

export default async function setup(project: TestProject) {
  const folder = await mkdtemp(join(tmpdir(), "linkables-tests-"));
  const url = checkTestDatabaseUrl(pathToFileURL(join(folder, "library_test.db")).href);
  try {
    await migrateTestDb(url);
    project.provide("testDatabaseUrl", url);
    return async () => { await rm(folder, { recursive: true, force: true }); };
  } catch (error) {
    await rm(folder, { recursive: true, force: true });
    throw error;
  }
}
