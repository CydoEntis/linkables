import { fileURLToPath } from "node:url";
import { build } from "vite";
import { migrateTestDb, testDatabaseUrl } from "../../api/test/db-setup";
import { API_URL, EXTENSION_DIR, SUPABASE_URL } from "./env";

// Builds the extension against the e2e API, so its host permissions and API origin are the test ones.
async function buildExtension() {
  Object.assign(process.env, {
    VITE_SUPABASE_URL: SUPABASE_URL,
    VITE_SUPABASE_ANON_KEY: "e2e-anon-key",
    VITE_APP_URL: API_URL,
  });
  await build({
    root: fileURLToPath(new URL("..", import.meta.url)),
    mode: "e2e",
    logLevel: "warn",
    build: { outDir: EXTENSION_DIR, emptyOutDir: true },
  });
}

export default async function globalSetup() {
  await Promise.all([migrateTestDb(testDatabaseUrl()), buildExtension()]);
}
