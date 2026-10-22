import { fileURLToPath } from "node:url";
import { defineConfig, devices } from "@playwright/test";
import { testJwks } from "../../api/test/auth/tokens";
import { testDatabaseUrl } from "../../api/test/db-setup";
import { API_URL, SUPABASE_URL, WEB_URL } from "./env";

const databaseUrl = testDatabaseUrl();
const ci = Boolean(process.env.CI);

export default defineConfig({
  testDir: ".",
  outputDir: "test-results",
  globalSetup: "./global-setup.ts",
  // Every test truncates the one e2e database, so tests must not overlap.
  workers: 1,
  forbidOnly: ci,
  reporter: ci
    ? [["list"], ["github"], ["html", { open: "never", outputFolder: "playwright-report" }]]
    : "list",
  use: { baseURL: WEB_URL, trace: "retain-on-failure" },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: [
    {
      command: "pnpm start",
      cwd: fileURLToPath(new URL("../../api", import.meta.url)),
      url: `${API_URL}/health`,
      timeout: 120_000,
      env: {
        NODE_ENV: "test",
        PORT: new URL(API_URL).port,
        DATABASE_URL: databaseUrl,
        MIGRATION_DATABASE_URL: databaseUrl,
        SUPABASE_URL,
        AUTH_TEST_JWKS: JSON.stringify(testJwks),
        CORS_ORIGINS: WEB_URL,
        WORKER_ENABLED: "false",
        LOG_LEVEL: "warn",
      },
    },
    {
      command: `pnpm exec vite --host 127.0.0.1 --port ${new URL(WEB_URL).port} --strictPort`,
      cwd: fileURLToPath(new URL("..", import.meta.url)),
      url: WEB_URL,
      timeout: 120_000,
      // Process env wins over apps/web/.env, so a developer's real Supabase project is never used.
      env: {
        VITE_SUPABASE_URL: SUPABASE_URL,
        VITE_SUPABASE_ANON_KEY: "e2e-anon-key",
        VITE_API_URL: API_URL,
        VITE_AUTH_REDIRECT_URL: `${WEB_URL}/`,
      },
    },
  ],
});
