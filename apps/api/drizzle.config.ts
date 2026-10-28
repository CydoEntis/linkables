import { existsSync } from "node:fs";
import { defineConfig } from "drizzle-kit";

// Values already in the environment (CI, the shell) win over the file.
if (existsSync(".env")) process.loadEnvFile(".env");

const url = process.env.DATABASE_URL ?? "file:./data/linkables.db";
if (!url) throw new Error("MIGRATION_DATABASE_URL is not set (env or apps/api/.env).");

export default defineConfig({
  dialect: "sqlite",
  schema: "./src/db/schema.ts",
  out: "./sqlite",
  dbCredentials: { url },
});
