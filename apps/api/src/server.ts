import { serve } from "@hono/node-server";
import { createApp } from "./app";
import { parseEnv } from "./config/env";

const env = parseEnv(process.env);
if (!env.ok) {
  process.stderr.write(`${env.message}\n`);
  process.exit(1);
}

serve({ fetch: createApp().fetch, port: env.config.port }, (info) => {
  console.log(`api listening on http://localhost:${String(info.port)}`);
});
