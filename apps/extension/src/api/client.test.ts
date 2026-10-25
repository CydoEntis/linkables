import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { ApiError, createApiClient, NETWORK_ERROR } from "./client";

const idSchema = z.object({ id: z.string() });
const REQUEST_ID = "6f1c8f4e-2b7a-4c1d-9e0f-3a5b7c9d1e2f";
const meta = () => ({ requestId: REQUEST_ID, ms: 1, version: "v1" });
const json = (body: unknown, status = 200) =>
  Promise.resolve(new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } }));

function setup(respond: () => Promise<Response>, token: string | null = "token-1") {
  const fetchSpy = vi.fn<typeof fetch>(respond);
  const onUnauthenticated = vi.fn(() => Promise.resolve());
  const api = createApiClient({
    baseUrl: "https://app.test/",
    getAccessToken: () => Promise.resolve(token),
    onUnauthenticated,
    fetch: fetchSpy,
  });
  const sent = () => {
    const [url, init] = fetchSpy.mock.calls[0] ?? [];
    return { url, headers: new Headers(init?.headers), init };
  };
  return { api, sent, onUnauthenticated };
}

const okId = () => json({ ok: true, data: { id: "link-1" }, meta: meta() });

describe("api client", () => {
  it("calls the app origin under /api/v1 with the bearer token", async () => {
    const { api, sent } = setup(okId);
    await api.request("/links", idSchema);
    expect(sent().url).toBe("https://app.test/api/v1/links");
    expect(sent().headers.get("Authorization")).toBe("Bearer token-1");
  });

  it("sends a JSON body", async () => {
    const { api, sent } = setup(okId);
    await api.request("/links", idSchema, { method: "POST", json: { url: "https://example.com/" } });
    expect(sent().init?.body).toBe('{"url":"https://example.com/"}');
    expect(sent().headers.get("Content-Type")).toBe("application/json");
  });

  it("sends no Authorization header without a session", async () => {
    const { api, sent } = setup(okId, null);
    await api.request("/links", idSchema);
    expect(sent().headers.get("Authorization")).toBeNull();
  });

  it("returns the data of a success envelope", async () => {
    const { api } = setup(okId);
    await expect(api.request("/links", idSchema)).resolves.toEqual({ id: "link-1" });
  });

  it("throws an ApiError with the code of a failure envelope", async () => {
    const { api } = setup(() => json({ ok: false, error: { code: "RATE_LIMIT", message: "Slow down" }, meta: meta() }, 429));
    const error = await api.request("/links", idSchema).catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ code: "RATE_LIMIT", requestId: REQUEST_ID });
  });

  it("signs out when the API answers UNAUTHENTICATED", async () => {
    const { api, onUnauthenticated } = setup(() => json({ ok: false, error: { code: "UNAUTHENTICATED", message: "No" }, meta: meta() }, 401));
    await expect(api.request("/links", idSchema)).rejects.toMatchObject({ code: "UNAUTHENTICATED" });
    expect(onUnauthenticated).toHaveBeenCalledOnce();
  });

  it("throws NETWORK_ERROR when no response arrives", async () => {
    const { api } = setup(() => Promise.reject(new TypeError("Failed to fetch")));
    await expect(api.request("/links", idSchema)).rejects.toMatchObject({ code: NETWORK_ERROR });
  });

  it("throws INTERNAL when the response is not an envelope", async () => {
    const { api } = setup(() => Promise.resolve(new Response("<html>Bad gateway</html>", { status: 502 })));
    await expect(api.request("/links", idSchema)).rejects.toMatchObject({ code: "INTERNAL" });
  });

  it("accepts fields the API added after this build", async () => {
    const { api } = setup(() => json({ ok: true, data: { id: "link-1", extra: 1 }, meta: { ...meta(), region: "eu" } }));
    await expect(api.request("/links", idSchema)).resolves.toEqual({ id: "link-1" });
  });
});
