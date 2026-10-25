import { fileURLToPath } from "node:url";
import { defineConfig, devices } from "@playwright/test";
import { BUILT_CONTAINER, BUILT_URL } from "./built-env";
import { SUPABASE_URL } from "./env";

// Runs the production build behind the real Caddyfile, so the prerendered
// pages and the landing page's app boot are tested as they ship.
const web = fileURLToPath(new URL("..", import.meta.url));
const ci = Boolean(process.env.CI);

export default defineConfig({
  testDir: ".",
  testMatch: "*.built.ts",
  outputDir: "test-results/built",
  globalTeardown: "./built-teardown.ts",
  workers: 1,
  forbidOnly: ci,
  reporter: ci ? [["list"], ["github"]] : "list",
  use: { baseURL: BUILT_URL },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: [
      "pnpm build",
      `docker rm -f ${BUILT_CONTAINER}`,
      `docker run --rm --name ${BUILT_CONTAINER} -p 127.0.0.1:${new URL(BUILT_URL).port}:8080 -v "${web}dist:/srv:ro" -v "${web}Caddyfile:/etc/caddy/Caddyfile:ro" caddy:2.10-alpine`,
    ].join(" && "),
    cwd: web,
    url: BUILT_URL,
    timeout: 180_000,
    env: {
      VITE_SUPABASE_URL: SUPABASE_URL,
      VITE_SUPABASE_ANON_KEY: "e2e-anon-key",
      VITE_API_URL: BUILT_URL,
      VITE_AUTH_REDIRECT_URL: `${BUILT_URL}/`,
    },
  },
});
