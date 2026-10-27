import { fileURLToPath } from "node:url";
import { defineConfig } from "@playwright/test";

import { testDatabaseUrl } from "../../api/test/db-setup";
import { EXTENSION_ID } from "../manifest";
import { API_URL, APP_URL } from "./env";

const databaseUrl = testDatabaseUrl();
const ci = Boolean(process.env.CI);

export default defineConfig({
  testDir: ".",
  outputDir: "test-results",
  globalSetup: "./global-setup.ts",
  // Every test truncates the one e2e database, so tests must not overlap.
  workers: 1,
  forbidOnly: ci,
  reporter: ci ? [["list"], ["github"], ["html", { open: "never", outputFolder: "playwright-report" }]] : "list",
  use: { trace: "retain-on-failure" },
  webServer: {
    command: "corepack pnpm start",
    cwd: fileURLToPath(new URL("../../api", import.meta.url)),
    url: `${API_URL}/health`,
    timeout: 120_000,
    env: {
      NODE_ENV: "test",
      PORT: new URL(API_URL).port,
      DATABASE_URL: databaseUrl,
      MIGRATION_DATABASE_URL: databaseUrl,
      APP_ORIGIN: APP_URL,
      AUTH_SECRET: "e2e-only-local-auth-secret-at-least-32-characters",

      // The same entry production adds for the extension (deploy/.env.production.example).
      CORS_ORIGINS: `chrome-extension://${EXTENSION_ID},${APP_URL}`,
      WORKER_ENABLED: "false",
      LOG_LEVEL: "warn",
    },
  },
});

