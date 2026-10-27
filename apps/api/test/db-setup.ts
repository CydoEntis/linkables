import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import type { TestProject } from "vitest/node";

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
  // libsql's Windows native file handle lives until process exit, even after
  // close(). Isolate migration so teardown can remove the temporary database.
  await promisify(execFile)(process.execPath, ["--import", "tsx", new URL("../src/db/migrate-cli.ts", import.meta.url).pathname.replace(/^\/(\w:)/, "$1")], {
    env: { ...process.env, DATABASE_URL: url },
  });
}

export default async function setup(project: TestProject) {
  const folder = await mkdtemp(join(tmpdir(), "linkables-tests-"));
  const url = checkTestDatabaseUrl(pathToFileURL(join(folder, "library_test.db")).href);
  try {
    await migrateTestDb(url);
    project.provide("testDatabaseUrl", url);
    return async () => { await rm(folder, { recursive: true, force: true, maxRetries: 20, retryDelay: 100 }); };
  } catch (error) {
    await rm(folder, { recursive: true, force: true, maxRetries: 20, retryDelay: 100 });
    throw error;
  }
}
