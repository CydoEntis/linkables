import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { afterEach, beforeEach, expect, test } from "vitest";
import { backupDatabase, restoreDatabase } from "./backup";

let directory: string;
beforeEach(() => { directory = mkdtempSync(join(tmpdir(), "linkables-backup-test-")); });
afterEach(() => { rmSync(directory, { recursive: true, force: true }); });

function liveDatabase() {
  const path = join(directory, "live.db");
  const db = new DatabaseSync(path);
  db.exec("PRAGMA journal_mode=WAL; CREATE TABLE resource(id TEXT PRIMARY KEY); CREATE TABLE saved_link(id TEXT); CREATE TABLE collection(id TEXT); CREATE TABLE user(id TEXT); CREATE TABLE session(id TEXT); CREATE TABLE account(id TEXT)");
  return { path, db };
}

test("backs up committed data still in the live WAL and restores it independently", async () => {
  const { path, db } = liveDatabase();
  try {
    db.exec("INSERT INTO resource VALUES ('saved-before-backup')");
    const snapshot = join(directory, "backup.db");
    await backupDatabase(path, snapshot);
    db.exec("INSERT INTO resource VALUES ('saved-after-backup')");
    const restored = join(directory, "restored.db");
    await restoreDatabase(snapshot, restored);
    const copy = new DatabaseSync(restored);
    try {
      expect(copy.prepare("SELECT id FROM resource").all()).toEqual([{ id: "saved-before-backup" }]);
      copy.exec("INSERT INTO resource VALUES ('restored-write')");
      expect(db.prepare("SELECT count(*) AS n FROM resource").get()?.n).toBe(2);
    } finally { copy.close(); }
  } finally { db.close(); }
});

test("refuses to replace an existing backup", async () => {
  const { path, db } = liveDatabase();
  db.close();
  const output = join(directory, "existing.db");
  writeFileSync(output, "keep this backup");
  await expect(backupDatabase(path, output)).rejects.toThrow("Destination already exists");
  expect(readFileSync(output, "utf8")).toBe("keep this backup");
});

test("refuses a corrupt input without publishing a restore", async () => {
  const input = join(directory, "corrupt.db");
  const output = join(directory, "restored.db");
  writeFileSync(input, "not a SQLite database");
  await expect(restoreDatabase(input, output)).rejects.toThrow();
  expect(existsSync(output)).toBe(false);
});

test("refuses a snapshot with broken foreign keys", async () => {
  const { path, db } = liveDatabase();
  db.exec("CREATE TABLE broken(resource_id TEXT REFERENCES resource(id)); INSERT INTO broken VALUES('missing')");
  db.close();
  const output = join(directory, "backup.db");
  await expect(backupDatabase(path, output)).rejects.toThrow("invalid references");
  expect(existsSync(output)).toBe(false);
});
