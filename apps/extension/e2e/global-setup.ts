import { fileURLToPath } from "node:url";
import { build, createServer } from "vite";
import { migrateTestDb, testDatabaseUrl } from "../../api/test/db-setup";
import { API_URL, APP_URL, EXTENSION_DIR, SUPABASE_URL } from "./env";

// The extension and the web app share the fake Supabase origin.
const SUPABASE_ENV = { VITE_SUPABASE_URL: SUPABASE_URL, VITE_SUPABASE_ANON_KEY: "e2e-anon-key" };

// Builds the extension for the e2e app origin, so its host permissions, content
// script and API origin are the test ones.
async function buildExtension() {
  await build({
    root: fileURLToPath(new URL("..", import.meta.url)),
    mode: "e2e",
    logLevel: "warn",
    build: { outDir: EXTENSION_DIR, emptyOutDir: true },
  });
}

// The web app's dev server on the app origin, passing /api to the e2e API.
async function serveApp() {
  const web = fileURLToPath(new URL("../../web", import.meta.url));
  const server = await createServer({
    root: web,
    configFile: `${web}/vite.config.ts`,
    logLevel: "warn",
    server: { host: "127.0.0.1", port: Number(new URL(APP_URL).port), strictPort: true, proxy: { "/api": API_URL } },
  });
  await server.listen();
  return server;
}

export default async function globalSetup() {
  // Process env wins over either app's .env, so a developer's real Supabase project is never used.
  Object.assign(process.env, SUPABASE_ENV, {
    VITE_APP_URL: APP_URL,
    VITE_API_URL: APP_URL,
    VITE_AUTH_REDIRECT_URL: `${APP_URL}/`,
  });
  const [, , app] = await Promise.all([migrateTestDb(testDatabaseUrl()), buildExtension(), serveApp()]);
  return () => app.close();
}
