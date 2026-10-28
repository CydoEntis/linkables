import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";

const STARTUP_TIMEOUT_MS = 15_000;

describe("server startup", () => {
  // Cold module loading competes with the other workspace test processes.
  it("exits non-zero naming the missing variable", () => {
    const env = {
      PATH: process.env.PATH,
      SystemRoot: process.env.SystemRoot,
      NODE_ENV: "test",
      DATABASE_URL: "file::memory:",
      CORS_ORIGINS: "http://localhost:5173",
      WORKER_ENABLED: "false",
    };

    const result = spawnSync(process.execPath, ["--import", "tsx", "src/server.ts"], {
      cwd: new URL("..", import.meta.url),
      env,
      encoding: "utf8",
      timeout: STARTUP_TIMEOUT_MS,
    });

    expect(result.error).toBeUndefined();
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("AUTH_SECRET");
  }, STARTUP_TIMEOUT_MS + 5_000);
});
