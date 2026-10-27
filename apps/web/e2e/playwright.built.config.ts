import { fileURLToPath } from "node:url";
import { defineConfig, devices } from "@playwright/test";
import { BUILT_CONTAINER, BUILT_URL } from "./built-env";


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
      "corepack pnpm build",
      `docker rm -f ${BUILT_CONTAINER}`,
      `docker run --rm --name ${BUILT_CONTAINER} -p 127.0.0.1:${new URL(BUILT_URL).port}:8080 -v "${web}dist:/srv:ro" -v "${web}Caddyfile:/etc/caddy/Caddyfile:ro" caddy:2.10-alpine`,
    ].join(" && "),
    cwd: web,
    url: BUILT_URL,
    timeout: 180_000,
    env: {


      VITE_API_URL: BUILT_URL,

    },
  },
});
