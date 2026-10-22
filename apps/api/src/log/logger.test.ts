import { describe, expect, it } from "vitest";
import { createLogger, type LogLevel } from "./logger";

function capture(level: LogLevel = "debug") {
  const lines: string[] = [];
  const logger = createLogger(level, (line) => lines.push(line));
  return { logger, lines };
}

describe("logger", () => {
  it("writes one JSON line with level, message and fields", () => {
    const { logger, lines } = capture();

    logger.info("saved", { linkId: "1" });

    expect(lines).toHaveLength(1);
    expect(JSON.parse(lines[0] ?? "")).toMatchObject({ level: "info", msg: "saved", linkId: "1" });
  });

  it("drops entries below the configured level", () => {
    const { logger, lines } = capture("warn");

    logger.info("quiet");
    logger.warn("loud");

    expect(lines.map((line) => (JSON.parse(line) as { msg: string }).msg)).toEqual(["loud"]);
  });

  it("strips query and fragment from relative and absolute URLs in messages and fields", () => {
    const { logger, lines } = capture();

    logger.info("fetch https://example.com/a?token=secret#frag failed", {
      path: "/x?token=secret#frag",
      nested: { urls: ["http://h.test/p#frag"] },
    });

    const line = lines[0] ?? "";
    expect(line).not.toContain("secret");
    expect(line).not.toContain("frag");
    expect(line).toContain("https://example.com/a failed");
    expect(line).toContain('"path":"/x"');
  });

  it("strips URLs inside an error's message, stack and cause", () => {
    const { logger, lines } = capture();
    const err = new Error("GET https://example.com/a?token=secret failed", {
      cause: new Error("redirect to /b#frag"),
    });

    logger.error("unexpected error", { err });

    const line = lines[0] ?? "";
    expect(line).not.toContain("secret");
    expect(line).not.toContain("frag");
    expect(JSON.parse(line)).toMatchObject({
      err: { name: "Error", message: "GET https://example.com/a failed", cause: { message: "redirect to /b" } },
    });
  });
});
