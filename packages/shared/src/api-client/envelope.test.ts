import { describe, expect, it } from "vitest";
import { z } from "zod";
import { ApiError, isApiError, parseData, readEnvelope } from "./envelope";

const REQUEST_ID = "6f1c8f4e-2b7a-4c1d-9e0f-3a5b7c9d1e2f";
const meta = { requestId: REQUEST_ID, ms: 1, version: "v1" };
const json = (body: unknown) => new Response(JSON.stringify(body), { headers: { "Content-Type": "application/json" } });

describe("readEnvelope", () => {
  it("reads a success envelope", async () => {
    await expect(readEnvelope(json({ ok: true, data: { id: "a" }, meta }))).resolves.toMatchObject({ ok: true, data: { id: "a" } });
  });

  it("reads a failure envelope, keeping an error code this client does not know yet", async () => {
    const envelope = await readEnvelope(json({ ok: false, error: { code: "TEAPOT", message: "New" }, meta }));
    expect(envelope).toMatchObject({ ok: false, error: { code: "TEAPOT" }, meta: { requestId: REQUEST_ID } });
  });

  it("accepts fields the API added after this client shipped", async () => {
    await expect(readEnvelope(json({ ok: true, data: null, meta: { ...meta, region: "eu" }, links: {} }))).resolves.toMatchObject({ ok: true });
  });

  it("throws INTERNAL for a body that is not an envelope", async () => {
    await expect(readEnvelope(json({ id: "a" }))).rejects.toMatchObject({ code: "INTERNAL" });
  });

  it("throws INTERNAL for a body that is not JSON", async () => {
    await expect(readEnvelope(new Response("<html>Bad gateway</html>", { status: 502 }))).rejects.toMatchObject({ code: "INTERNAL" });
  });
});

describe("parseData", () => {
  it("returns data that matches the schema", () => {
    expect(parseData(z.object({ id: z.string() }), { id: "a", extra: 1 })).toEqual({ id: "a" });
  });

  it("throws INTERNAL for data that does not", () => {
    expect(() => parseData(z.object({ id: z.string() }), { id: 1 })).toThrow(ApiError);
  });
});

describe("isApiError", () => {
  it("matches an ApiError with that code only", () => {
    expect(isApiError(new ApiError("NOT_FOUND", "Gone"), "NOT_FOUND")).toBe(true);
    expect(isApiError(new ApiError("CONFLICT", "Taken"), "NOT_FOUND")).toBe(false);
    expect(isApiError(new Error("NOT_FOUND"), "NOT_FOUND")).toBe(false);
  });
});
