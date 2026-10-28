import { existsSync } from "node:fs";
import { createDb } from "./client";
import { migrateDb } from "./migrate";

if (existsSync(".env")) process.loadEnvFile(".env");
const connection = createDb(process.env.DATABASE_URL ?? "file:./data/linkables.db");
try {
  await connection.ready;
  await migrateDb(connection.db);
} finally {
  await connection.close();
}
