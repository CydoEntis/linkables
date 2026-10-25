import { Hono } from "hono";
import { describe, expect, it } from "vitest";
import { captureLogger } from "../../test/app";
import { onError } from "./error-handler";
import type { AppEnv } from "./env";
import { rateLimit } from "./rate-limit";
import { requestId } from "./request-id";

const HOUR = 60 * 60 * 1000;

function limitedApp(now: () => number) {
  const { logger, lines } = captureLogger();
  const app = new Hono<AppEnv>()
    .use(requestId)
    .use(
      rateLimit<AppEnv>({
        limit: 5,
        windowMs: HOUR,
        maxKeys: 2,
        now,
        key: (c) => c.req.header("X-Key") ?? "",
        message: "Too many requests",
        whenFull: { message: "Paused", logger, name: "test" },
      }),
    )
    .get("/", (c) => c.text("ok"));
  app.onError(onError(logger));
  const get = async (key: string) => {
    const res = await app.request("/", { headers: { "X-Key": key } });
    return res.ok ? "ok" : ((await res.json()) as { error: { message: string } }).error.message;
  };
  const warnings = () => lines.filter((line) => line.includes("rate limiter full"));
  return { get, warnings };
}

describe("rateLimit when full", () => {
  it("refuses a new caller with the neutral message", async () => {
    const { get } = limitedApp(() => 0);
    await get("a");
    await get("b");

    expect(await get("c")).toBe("Paused");
  });

  it("warns once per window, naming no caller", async () => {
    let now = 0;
    const { get, warnings } = limitedApp(() => now);
    await get("a");
    await get("b");
    await get("c");
    await get("d");
    now = HOUR - 1;
    await get("e");

    expect(warnings()).toHaveLength(1);
    expect(warnings()[0]).not.toMatch(/"[c-e]"/);
  });

  it("warns again in a later window", async () => {
    let now = 0;
    const { get, warnings } = limitedApp(() => now);
    await get("a");
    await get("b");
    await get("c");
    now = HOUR;
    await get("x");
    await get("y");
    await get("z");

    expect(warnings()).toHaveLength(2);
  });
});
