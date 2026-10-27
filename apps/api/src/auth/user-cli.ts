import { existsSync } from "node:fs";
import { parseArgs } from "node:util";
import { parseEnv } from "../config/env";
import { createDb } from "../db/client";
import { migrateDb } from "../db/migrate";
import { provisionUser, resetPassword } from "./provision";

async function main() {
  if (existsSync(".env")) process.loadEnvFile(".env");
  const env = parseEnv(process.env);
  if (!env.ok) throw new Error(env.message);
  const { values } = parseArgs({ options: { email: { type: "string" }, name: { type: "string" }, id: { type: "string" }, reset: { type: "boolean" } } });
  // Read secrets from stdin, never process arguments or shell history.
  if (process.stdin.isTTY) process.stderr.write("Enter password, then end input (Ctrl-D on Unix; Ctrl-Z then Enter on Windows):\n");
  const input: Buffer[] = [];
  for await (const chunk of process.stdin) input.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk)));
  const password = Buffer.concat(input).toString("utf8").replace(/\r?\n$/, "");
  const { db, close, ready } = createDb(env.config.databaseUrl);
  try {
    await ready;
    await migrateDb(db);
    if (values.reset) {
      await resetPassword(db.$client, env.config.auth, { email: values.email, password });
      process.stdout.write("Password reset; all account sessions revoked.\n");
    } else {
      const owner = await provisionUser(db.$client, env.config.auth, { email: values.email, name: values.name ?? values.email, id: values.id, password });
      process.stdout.write(`Local account created: ${owner.id}\n`);
    }
  } finally {
    await close();
  }
}

main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.message : "Account command failed"}\n`);
  process.exitCode = 1;
});
