import { closeSync, existsSync, linkSync, mkdirSync, openSync, readFileSync, unlinkSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import type { InValue, Transaction } from "@libsql/client";
import { createDb } from "../db/client";
import { migrateDb } from "../db/migrate";
import { snapshotSchema, type Snapshot } from "./snapshot";
import { validateDatabase } from "./backup";
import { MaintenanceError } from "./errors";

type Row = Record<string, InValue>;

async function insertRows(tx: Transaction, table: string, rows: Row[]): Promise<void> {
  for (const row of rows) {
    const columns = Object.keys(row);
    await tx.execute({
      sql: `INSERT INTO "${table}" (${columns.map((column) => `"${column}"`).join(",")}) VALUES (${columns.map(() => "?").join(",")})`,
      args: Object.values(row),
    });
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

async function writeSnapshot(tx: Transaction, snapshot: Snapshot): Promise<void> {
  await insertRows(tx, "user", snapshot.users.map((row) => ({
    id: row.id, email: row.email, name: row.name, email_verified: 0,
    created_at: Date.parse(row.created_at), updated_at: Date.parse(row.created_at), image: null,
  })));
  await insertRows(tx, "resource", snapshot.tables.resource);
  await insertRows(tx, "saved_link", rowsWithBooleans(snapshot.tables.saved_link));
  await insertRows(tx, "collection", rowsWithBooleans(snapshot.tables.collection));
  await insertRows(tx, "collection_group", rowsWithBooleans(snapshot.tables.collection_group));
  await insertRows(tx, "collection_item", snapshot.tables.collection_item);
  await insertRows(tx, "resource_reader", snapshot.tables.resource_reader.map((row) => ({ ...row, article: row.article === null ? null : JSON.stringify(row.article) })));
  // A lease belongs to the old process. Its job becomes eligible again here.
  await insertRows(tx, "job", snapshot.tables.job.map((row) => ({ ...row, locked_until: null, lease_token: null })));
  await insertRows(tx, "access_request", snapshot.tables.access_request);
  await insertRows(tx, "share_allowed_email", snapshot.tables.share_allowed_email);
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
  const { db, ready, close } = createDb(pathToFileURL(temporary).href);
  let closed = false;
  try {
    await ready;
    await migrateDb(db);
    const tx = await db.$client.transaction("write");
    try {
      await writeSnapshot(tx, snapshot);
      const check = await tx.execute("PRAGMA foreign_key_check");
      if (check.rows.length > 0) throw new MaintenanceError("Imported database has invalid references");
      await tx.commit();
    } catch (error) {
      await tx.rollback();
      throw error;
    }
    const integrity = await db.$client.execute("PRAGMA integrity_check");
    if (integrity.rows.length !== 1 || integrity.rows[0]?.[0] !== "ok") throw new MaintenanceError("Imported database failed integrity validation");
    await db.$client.execute("PRAGMA wal_checkpoint(TRUNCATE)");
    await close();
    closed = true;
    validateDatabase(temporary);
    linkSync(temporary, path);
    return { users: snapshot.users.length, links: snapshot.tables.saved_link.length, collections: snapshot.tables.collection.length, groups: snapshot.tables.collection_group.length, readers: snapshot.tables.resource_reader.length };
  } finally {
    if (!closed) await close();
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
