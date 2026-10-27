import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { afterEach, beforeEach, expect, test } from "vitest";
import { importPostgres } from "./import-postgres";
import { COLLECTION_ID, GROUP_ID, LINK_ID, OWNER_ID, postgresFixture } from "./fixtures";

let directory: string;
beforeEach(() => { directory = mkdtempSync(join(tmpdir(), "linkables-import-test-")); });
afterEach(() => { rmSync(directory, { recursive: true, force: true }); });
const destination = () => join(directory, "library.db");

test("preserves a complete library and its original microsecond timestamps", async () => {
  const input = postgresFixture();
  const original = structuredClone(input);
  expect(await importPostgres(input, destination())).toEqual({ users: 1, links: 1, collections: 1, groups: 1, readers: 1 });
  const db = new DatabaseSync(destination(), { readOnly: true });
  try {
    expect(db.prepare("SELECT id,user_id,note,pinned,saved_from,saved_at FROM saved_link").get()).toEqual({ id: LINK_ID, user_id: OWNER_ID, note: "Keep this example", pinned: 1, saved_from: "extension", saved_at: "2026-10-24T12:34:56.123456Z" });
    expect(db.prepare("SELECT share_token,share_private,share_ungrouped FROM collection").get()).toEqual({ share_token: "existing-share-token", share_private: 1, share_ungrouped: 0 });
    expect(db.prepare("SELECT collection_id,group_id FROM collection_item").get()).toEqual({ collection_id: COLLECTION_ID, group_id: GROUP_ID });
    expect(db.prepare("SELECT article FROM resource_reader").get()?.article).toBe(JSON.stringify(input.tables.resource_reader[0]?.article));
  } finally { db.close(); }
  expect(input).toEqual(original);
});

test("imports identities without old credentials, sessions, codes or worker leases", async () => {
  await importPostgres(postgresFixture(), destination());
  const db = new DatabaseSync(destination(), { readOnly: true });
  try {
    expect(db.prepare('SELECT id FROM "user"').get()?.id).toBe(OWNER_ID);
    for (const table of ["account", "session", "share_code", "share_viewer_session"]) expect(db.prepare(`SELECT count(*) AS n FROM "${table}"`).get()?.n).toBe(0);
    expect(db.prepare("SELECT id,attempts,locked_until,lease_token FROM job").get()).toEqual({ id: 7, attempts: 2, locked_until: null, lease_token: null });
  } finally { db.close(); }
});

test("refuses an existing destination without changing it", async () => {
  writeFileSync(destination(), "existing personal data");
  await expect(importPostgres(postgresFixture(), destination())).rejects.toThrow("Destination already exists");
  expect(readFileSync(destination(), "utf8")).toBe("existing personal data");
});

test("publishes no database when a reference fails during import", async () => {
  const input = postgresFixture();
  input.tables.collection_item[0]!.group_id = "66666666-6666-4666-8666-666666666666";
  await expect(importPostgres(input, destination())).rejects.toThrow();
  expect(existsSync(destination())).toBe(false);
  expect(readdirSync(directory)).toEqual([]);
});

test("rejects cross-user collection memberships before creating a database", async () => {
  const input = postgresFixture();
  const other = "77777777-7777-4777-8777-777777777777";
  input.users.push({ id: other, email: "other@example.test", name: "Other", created_at: input.exportedAt });
  input.tables.collection[0]!.user_id = other;
  await expect(importPostgres(input, destination())).rejects.toThrow("cross-user");
  expect(existsSync(destination())).toBe(false);
});

test("rejects malformed input without creating a destination", async () => {
  await expect(importPostgres({ format: "other" }, destination())).rejects.toThrow("Invalid PostgreSQL snapshot");
  expect(existsSync(destination())).toBe(false);
});
