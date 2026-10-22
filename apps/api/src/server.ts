import { serve } from "@hono/node-server";
import { createApp } from "./app";
import { parseEnv } from "./config/env";
import { createLogger } from "./log/logger";

const env = parseEnv(process.env);
if (!env.ok) {
  process.stderr.write(`${env.message}\n`);
  process.exit(1);
}

const logger = createLogger(env.config.logLevel);

const { nodeEnv, corsOrigins, auth, port } = env.config;
const app = createApp({ logger, corsOrigins, auth: { ...auth, nodeEnv } });

serve({ fetch: app.fetch, port }, (info) => {
  logger.info("api listening", { port: info.port });
});
