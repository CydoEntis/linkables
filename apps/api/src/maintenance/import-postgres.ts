import { closeSync, existsSync, mkdirSync, openSync, readFileSync, unlinkSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { DatabaseSync, type SQLInputValue } from "node:sqlite";
import { readMigrationFiles } from "drizzle-orm/migrator";
import { snapshotSchema, type Snapshot } from "./snapshot";
import { backupDatabase } from "./backup";
import { MaintenanceError } from "./errors";

type Row = Record<string, SQLInputValue>;

function insertRows(db: DatabaseSync, table: string, rows: Row[]): void {
  for (const row of rows) {
    const columns = Object.keys(row);
    db.prepare(`INSERT INTO "${table}" (${columns.map((column) => `"${column}"`).join(",")}) VALUES (${columns.map(() => "?").join(",")})`).run(...Object.values(row));
  }
}

function rowsWithBooleans(rows: Record<string, string | number | boolean | null>[]): Row[] {
  return rows.map((row) => Object.fromEntries(Object.entries(row).map(([key, value]) => [key, typeof value === "boolean" ? Number(value) : value])));
}

function checkOwnership(snapshot: Snapshot): void {
  const users = new Set(snapshot.users.map((row) => row.id));
  const links = new Map(snapshot.tables.saved_link.map((row) => [row.id, row]));
  const collections = new Map(snapshot.tables.collection.map((row) => [row.id, row]));
  if (users.size !== snapshot.users.length) throw new MaintenanceError("Snapshot contains duplicate users");
  if (snapshot.tables.saved_link.some((row) => !users.has(row.user_id)) || snapshot.tables.collection.some((row) => !users.has(row.user_id))) {
    throw new MaintenanceError("Snapshot contains an unknown library owner");
  }
  for (const row of snapshot.tables.collection_item) {
    const link = links.get(row.saved_link_id);
    const collection = collections.get(row.collection_id);
    if (!link || !collection || link.user_id !== collection.user_id) throw new MaintenanceError("Snapshot contains a cross-user collection membership");
  }
}

function writeSnapshot(tx: DatabaseSync, snapshot: Snapshot): void {
  insertRows(tx, "user", snapshot.users.map((row) => ({
    id: row.id, email: row.email, name: row.name, email_verified: 0,
    created_at: Date.parse(row.created_at), updated_at: Date.parse(row.created_at), image: null,
  })));
  insertRows(tx, "resource", snapshot.tables.resource);
  insertRows(tx, "saved_link", rowsWithBooleans(snapshot.tables.saved_link));
  insertRows(tx, "collection", rowsWithBooleans(snapshot.tables.collection));
  insertRows(tx, "collection_group", rowsWithBooleans(snapshot.tables.collection_group));
  insertRows(tx, "collection_item", snapshot.tables.collection_item);
  insertRows(tx, "resource_reader", snapshot.tables.resource_reader.map((row) => ({ ...row, article: row.article === null ? null : JSON.stringify(row.article) })));
  // A lease belongs to the old process. Its job becomes eligible again here.
  insertRows(tx, "job", snapshot.tables.job.map((row) => ({ ...row, locked_until: null, lease_token: null })));
  insertRows(tx, "access_request", snapshot.tables.access_request);
  insertRows(tx, "share_allowed_email", snapshot.tables.share_allowed_email);
}

function initializeSchema(db: DatabaseSync): void {
  const migrationsFolder = fileURLToPath(new URL("../../sqlite", import.meta.url));
  db.exec('CREATE TABLE "__drizzle_migrations" (id SERIAL PRIMARY KEY, hash TEXT NOT NULL, created_at NUMERIC)');
  for (const migration of readMigrationFiles({ migrationsFolder })) {
    for (const statement of migration.sql) db.exec(statement);
    db.prepare('INSERT INTO "__drizzle_migrations" (hash,created_at) VALUES (?,?)').run(migration.hash, migration.folderMillis);
  }
}

export async function importPostgres(raw: unknown, destination: string) {
  const parsed = snapshotSchema.safeParse(raw);
  if (!parsed.success) throw new MaintenanceError("Invalid PostgreSQL snapshot; no database was imported");
  const snapshot = parsed.data;
  checkOwnership(snapshot);
  const path = resolve(destination);
  if (existsSync(path) || existsSync(path + "-wal") || existsSync(path + "-shm")) throw new MaintenanceError("Destination already exists; choose a new database path");
  mkdirSync(dirname(path), { recursive: true });
  const temporary = path + ".partial-" + randomUUID();
  closeSync(openSync(temporary, "wx", 0o600));
  const db = new DatabaseSync(temporary);
  let closed = false;
  try {
    db.exec("PRAGMA foreign_keys=ON; BEGIN IMMEDIATE");
    try {
      initializeSchema(db);
      writeSnapshot(db, snapshot);
      if (db.prepare("PRAGMA foreign_key_check").all().length > 0) throw new MaintenanceError("Imported database has invalid references");
      db.exec("COMMIT");
    } catch (error) {
      db.exec("ROLLBACK");
      throw error;
    }
    db.close();
    closed = true;
    await backupDatabase(temporary, path);
    return { users: snapshot.users.length, links: snapshot.tables.saved_link.length, collections: snapshot.tables.collection.length, groups: snapshot.tables.collection_group.length, readers: snapshot.tables.resource_reader.length };
  } finally {
    if (!closed) db.close();
    for (const file of [temporary + "-wal", temporary + "-shm", temporary]) if (existsSync(file)) unlinkSync(file);
  }
}

export async function importPostgresFile(source: string, destination: string) {
  let raw: unknown;
  try { raw = JSON.parse(readFileSync(source, "utf8")); }
  catch (error) {
    if (error instanceof SyntaxError) throw new MaintenanceError("Snapshot is not valid JSON");
    throw error;
  }
  return importPostgres(raw, destination);
}
