import { serve } from "@hono/node-server";
import { createApp } from "./app";
import { parseEnv } from "./config/env";
import { createDb } from "./db/client";
import { createLogger } from "./log/logger";
import { fetchHtml, fetchJson } from "./metadata/fetcher";
import { startWorker } from "./metadata/worker";

const env = parseEnv(process.env);
if (!env.ok) {
  process.stderr.write(`${env.message}\n`);
  process.exit(1);
}

const logger = createLogger(env.config.logLevel);

const { nodeEnv, corsOrigins, auth, port, databaseUrl, workerEnabled } = env.config;
const { db, close } = createDb(databaseUrl);
const app = createApp({ logger, corsOrigins, auth: { ...auth, nodeEnv }, db });

const server = serve({ fetch: app.fetch, port }, (info) => {
  logger.info("api listening", { port: info.port });
});

const worker = workerEnabled ? startWorker({ db, fetchers: { fetchHtml, fetchJson }, logger }) : null;
if (worker) logger.info("metadata worker started");

// In-flight fetches finish within the fetcher's 10 s timeout; a job cut off
// harder than that is retried once its lease expires.
async function shutdown(signal: NodeJS.Signals) {
  logger.info("shutting down", { signal });
  server.close();
  await worker?.stop();
  await close();
}

for (const signal of ["SIGTERM", "SIGINT"] as const) process.once(signal, (s) => void shutdown(s));
