import { existsSync } from "node:fs";
import { defineConfig } from "drizzle-kit";

// Values already in the environment (CI, the shell) win over the file.
if (existsSync(".env")) process.loadEnvFile(".env");

const url = process.env.MIGRATION_DATABASE_URL;
if (!url) throw new Error("MIGRATION_DATABASE_URL is not set (env or apps/api/.env).");

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dbCredentials: { url },
});
