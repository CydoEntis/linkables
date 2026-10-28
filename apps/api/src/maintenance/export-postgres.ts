import { linkSync, unlinkSync, writeFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { resolve } from "node:path";
import postgres from "postgres";
import { SNAPSHOT_TABLES, snapshotSchema } from "./snapshot";

async function main() {
  const [destination] = process.argv.slice(2);
  const url = process.env.MIGRATION_DATABASE_URL;
  if (!destination || !url) throw new Error("Set MIGRATION_DATABASE_URL and supply a new snapshot path");
  const db = postgres(url, { prepare: false, onnotice: () => undefined });
  try {
    const snapshot = await db.begin("isolation level repeatable read read only", async (tx) => {
      const tables: Record<string, unknown> = {};
      for (const name of SNAPSHOT_TABLES) {
        // JSON is produced in PostgreSQL so its timestamp precision survives.
        const rows = await tx<{ json: string }[]>`SELECT row_to_json(t)::text AS json FROM ${tx(name)} t`;
        tables[name] = rows.map((row) => JSON.parse(row.json) as unknown);
      }
      const rows = await tx<{ json: string }[]>`SELECT json_build_object('id',id,'email',email,'name',coalesce(raw_user_meta_data->>'full_name',split_part(email,'@',1)),'created_at',created_at)::text AS json FROM auth.users`;
      return snapshotSchema.parse({ format: "linkables-postgres-snapshot", version: 1, exportedAt: new Date().toISOString(), users: rows.map((row) => JSON.parse(row.json) as unknown), tables });
    });
    const path = resolve(destination);
    const temporary = path + ".partial-" + randomUUID();
    writeFileSync(temporary, JSON.stringify(snapshot), { mode: 0o600, flag: "wx" });
    try { linkSync(temporary, path); } finally { unlinkSync(temporary); }
    process.stdout.write("Read-only PostgreSQL snapshot created; no passwords or owner sessions exported.\n");
  } finally { await db.end(); }
}

main().catch(() => {
  process.stderr.write("PostgreSQL export failed; check connection, read permissions, schema version and destination.\n");
  process.exitCode = 1;
});
