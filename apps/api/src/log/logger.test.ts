import { describe, expect, it } from "vitest";
import { createLogger, redactUrls, type LogLevel } from "./logger";

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

  it.each([
    ["a query value up to the next space", "GET https://a.test/p?q=SECRET x"],
    ["a quoted query value", 'GET https://a.test/p?token="SECRET" x'],
    ["an angle-bracketed query value", "GET https://a.test/p?x=<SECRET> x"],
    ["an encoded ? separator", "GET https://a.test/p%3Ftoken=SECRET x"],
    ["an encoded # separator", "GET https://a.test/p%23SECRET x"],
    ["a lowercase encoded separator", "GET /p%3ftoken=SECRET x"],
    ["a query after a bare host", "GET a.test?token=SECRET x"],
    ["a query after a host and port", "GET a.test:8080?token=SECRET x"],
    ["a bare leading query", "?token=SECRET x"],
    ["a query after a dotless host and port", "GET localhost:3000?SECRET x"],
    ["a query on an opaque URN", "GET urn:x?SECRET x"],
    ["an opaque mailto URL with a dotted host", "mailto:me@a.test?body=SECRET x"],
  ])("strips %s", (_label, text) => {
    const redacted = redactUrls(text);

    expect(redacted).not.toContain("SECRET");
    expect(redacted).toMatch(/ x$/);
  });

  it("keeps a non-URL leading #", () => {
    expect(redactUrls("see issue #12 now")).toBe("see issue #12 now");
  });

  it.each([
    ["a.", "a.".repeat(8192)],
    ["a-", "a-".repeat(8192)],
    ["/", "/".repeat(16384)],
  ])("redacts a 16 KB run of %s in well under 20 ms", (_label, text) => {
    const started = performance.now();
    redactUrls(text);

    expect(performance.now() - started).toBeLessThan(20);
  });

  it("caps a long string before redacting", () => {
    const redacted = redactUrls("x".repeat(10_000));

    expect(redacted.length).toBeLessThan(4200);
    expect(redacted.endsWith("\u2026")).toBe(true);
  });

  it("masks the password in a URL's userinfo", () => {
    expect(redactUrls("connect postgresql://user:SECRET@db.test:5432/app failed")).toBe(
      "connect postgresql://user:***@db.test:5432/app failed",
    );
  });

  it("masks userinfo without a password", () => {
    expect(redactUrls("https://SECRET@a.test/p")).toBe("https://***@a.test/p");
  });

  it("redacts field keys", () => {
    const { logger, lines } = capture();

    logger.info("seen", { "/x?token=SECRET": 1 });

    expect(lines[0]).not.toContain("SECRET");
  });

  it("does not let fields overwrite level or msg", () => {
    const { logger, lines } = capture();

    logger.error("real", { level: "debug", msg: "fake" });

    expect(JSON.parse(lines[0] ?? "")).toMatchObject({ level: "error", msg: "real" });
  });

  it("logs an error whose cause is itself", () => {
    const { logger, lines } = capture();
    const err = new Error("loop at /x?token=SECRET");
    err.cause = err;

    logger.error("unexpected error", { err });

    const line = lines[0] ?? "";
    expect(line).not.toContain("SECRET");
    expect(JSON.parse(line)).toMatchObject({ err: { message: "loop at /x", cause: "[Circular]" } });
  });

  it("logs a circular object", () => {
    const { logger, lines } = capture();
    const node: Record<string, unknown> = { name: "node" };
    node.self = node;

    logger.info("cycle", { node });

    expect(JSON.parse(lines[0] ?? "")).toMatchObject({ node: { name: "node", self: "[Circular]" } });
  });

  it("logs a BigInt field as a string", () => {
    const { logger, lines } = capture();

    logger.info("big", { count: 10n });

    expect(JSON.parse(lines[0] ?? "")).toMatchObject({ count: "10" });
  });

  it("writes a fallback line when a field cannot be serialized", () => {
    const { logger, lines } = capture();
    const hostile = {
      get boom(): never {
        throw new Error("getter failed");
      },
    };

    logger.error("unexpected error at /x?token=SECRET", { hostile });

    expect(JSON.parse(lines[0] ?? "")).toMatchObject({
      level: "error",
      msg: "unexpected error at /x",
      error: "serialization failed",
    });
  });
});
