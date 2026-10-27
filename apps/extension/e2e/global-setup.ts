import { fileURLToPath } from "node:url";
import { build, createServer } from "vite";

import { migrateE2eDatabase } from "../../web/e2e/database";
import { API_URL, APP_URL, EXTENSION_DIR } from "./env";

async function buildExtension() {
  await build({
    root: fileURLToPath(new URL("..", import.meta.url)),
    mode: "e2e",
    logLevel: "warn",
    build: { outDir: EXTENSION_DIR, emptyOutDir: true },
  });
}
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
  Object.assign(process.env, { VITE_API_URL: APP_URL });
  const [, , app] = await Promise.all([migrateE2eDatabase(), buildExtension(), serveApp()]);
  return () => app.close();
}
