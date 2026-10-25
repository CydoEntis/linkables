import { describe, expect, it } from "vitest";
import { captureLogger, createTestApp } from "../../test/app";

const VALID_ID = "3f2b8c1e-4d5a-4e6f-9a7b-1c2d3e4f5a6b";

describe("request logging", () => {
  it("logs method, path, status, ms and request id", async () => {
    const { logger, lines } = captureLogger();

    await createTestApp({ logger }).request("/health", { headers: { "X-Request-Id": VALID_ID } });

    expect(lines).toHaveLength(1);
    expect(JSON.parse(lines[0] ?? "")).toMatchObject({
      level: "info",
      msg: "request",
      method: "GET",
      path: "/health",
      status: 200,
      ms: expect.any(Number) as number,
      requestId: VALID_ID,
    });
  });

  it("never puts the query string or fragment in the output", async () => {
    const { logger, lines } = captureLogger();

    await createTestApp({ logger }).request("/x?token=secret#frag");

    const output = lines.join("\n");
    expect(output).toContain('"path":"/x"');
    expect(output).not.toContain("secret");
    expect(output).not.toContain("frag");
  });

  // The test app has no database, so the lookup fails and its error is logged too.
  it("never puts a shared collection's token in any log line, even when the lookup fails", async () => {
    const { logger, lines } = captureLogger();
    const token = "Secret_Share_Token-0123456789abc";

    await createTestApp({ logger }).request(`/api/v1/shared/${token}`);
    await createTestApp({ logger }).request(`/api/v1/shared/${token}/extra`);

    const output = lines.join("\n");
    expect(output).toContain('"path":"/api/v1/shared/:token"');
    expect(output).not.toContain(token);
  });
});
