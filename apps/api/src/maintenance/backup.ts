import { chmodSync, existsSync, linkSync, mkdirSync, unlinkSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { dirname, resolve } from "node:path";
import { backup, DatabaseSync } from "node:sqlite";
import { MaintenanceError } from "./errors";

export function validateDatabase(path: string): void {
  const db = new DatabaseSync(path, { readOnly: true, timeout: 5000 });
  try {
    const integrity = db.prepare("PRAGMA integrity_check").all();
    if (integrity.length !== 1 || integrity[0]?.integrity_check !== "ok") throw new MaintenanceError("Database failed integrity validation");
    if (db.prepare("PRAGMA foreign_key_check").all().length > 0) throw new MaintenanceError("Database has invalid references");
    for (const name of ["resource", "saved_link", "collection", "user", "session", "account"]) {
      if (!db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=?").get(name)) throw new MaintenanceError("File is not a complete Linkables database");
    }
  } finally { db.close(); }
}

// SQLite's online backup includes committed WAL pages. Copying only the live
// .sqlite file can silently omit recent saves.
export async function backupDatabase(source: string, destination: string): Promise<void> {
  const sourcePath = resolve(source);
  const destinationPath = resolve(destination);
  if (existsSync(destinationPath) || existsSync(destinationPath + "-wal") || existsSync(destinationPath + "-shm")) throw new MaintenanceError("Destination already exists; choose a new backup path");
  validateDatabase(sourcePath);
  mkdirSync(dirname(destinationPath), { recursive: true });
  const temporary = destinationPath + ".partial-" + randomUUID();
  const db = new DatabaseSync(sourcePath, { readOnly: true, timeout: 5000 });
  try {
    await backup(db, temporary);
    chmodSync(temporary, 0o600);
    validateDatabase(temporary);
    // A hard link publishes the verified snapshot atomically without replacing
    // another operator's file if two backup commands choose the same name.
    linkSync(temporary, destinationPath);
  } finally {
    db.close();
    if (existsSync(temporary)) unlinkSync(temporary);
  }
}

export const restoreDatabase = backupDatabase;
