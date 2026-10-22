import { describe, expect, it } from "vitest";
import { createApp } from "../app";

const VALID_ID = "3f2b8c1e-4d5a-4e6f-9a7b-1c2d3e4f5a6b";

async function requestHealth(requestId?: string, path = "/health") {
  const headers: Record<string, string> = requestId === undefined ? {} : { "X-Request-Id": requestId };
  const res = await createApp().request(path, { headers });
  const body = (await res.json()) as { meta: { requestId: string } };
  return { header: res.headers.get("X-Request-Id"), metaId: body.meta.requestId };
}

describe("request id", () => {
  it("echoes a valid incoming UUID", async () => {
    const { header, metaId } = await requestHealth(VALID_ID);

    expect(header).toBe(VALID_ID);
    expect(metaId).toBe(VALID_ID);
  });

  it.each([
    ["abc", "abc"],
    ["a 300-character string", "a".repeat(300)],
  ])("replaces an invalid id (%s) with a generated UUID v4", async (_label, incoming) => {
    const { header, metaId } = await requestHealth(incoming);

    expect(header).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    expect(metaId).toBe(header);
  });

  it("generates an id when none is sent", async () => {
    const { header, metaId } = await requestHealth();

    expect(header).not.toBeNull();
    expect(metaId).toBe(header);
  });

  it("keeps the id on error responses", async () => {
    const { header, metaId } = await requestHealth(VALID_ID, "/api/v1/missing");

    expect(header).toBe(VALID_ID);
    expect(metaId).toBe(VALID_ID);
  });
});
