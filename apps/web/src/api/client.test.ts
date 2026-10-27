import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { readAccessToken } from "../auth/access-token";
import { signOut } from "../auth/session";
import { storeSession, stubAuthServer } from "../test/session";
import { ApiError, NETWORK_ERROR } from "@linkables/shared/api-client";
import { createApiClient } from "./client";

const API_URL = "http://api.test";
const meSchema = z.object({ id: z.string() });

function meta() {
  return { requestId: crypto.randomUUID(), ms: 1, version: "v1" };
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function setup(fetchImpl: typeof fetch, accessToken = "token-1") {
  storeSession(accessToken);
  const onUnauthenticated = vi.fn(() => Promise.resolve());
  const fetchSpy = vi.fn(fetchImpl);
  const api = createApiClient({
    baseUrl: API_URL,
    getAccessToken: () => readAccessToken(),
    onUnauthenticated,
    fetch: fetchSpy,
  });
  const sentAuthorization = (call: number) =>
    new Headers(fetchSpy.mock.calls[call]?.[1]?.headers).get("Authorization");
  return { api, fetchSpy, onUnauthenticated, sentAuthorization };
}

const okMe = () => Promise.resolve(jsonResponse({ ok: true, data: { id: "user-1" }, meta: meta() }));

beforeEach(stubAuthServer);
afterEach(() => {
  vi.unstubAllGlobals();
  localStorage.clear();
});

describe("api client", () => {
  it("rejects a response from a session that changed while the request was pending", async () => {
    let finish: (response: Response) => void = () => undefined;
    const pending = new Promise<Response>((resolve) => { finish = resolve; });
    let token = "old-token";
    const fetchSpy = vi.fn(() => pending);
    const onUnauthenticated = vi.fn(() => Promise.resolve());
    const client = createApiClient({
      baseUrl: API_URL,
      getAccessToken: () => Promise.resolve(token),
      isCurrentSession: (sent) => sent === token,
      onUnauthenticated,
      fetch: fetchSpy,
    });
    const reading = client.request("/me", meSchema);
    await vi.waitFor(() => { expect(fetchSpy).toHaveBeenCalledOnce(); });
    token = "new-token";
    finish(jsonResponse({ ok: true, data: { id: "old-user" }, meta: meta() }));
    await expect(reading).rejects.toMatchObject({ code: "CONFLICT" });
    expect(onUnauthenticated).not.toHaveBeenCalled();
  });

  it("calls VITE_API_URL under /api/v1", async () => {
    const { api, fetchSpy } = setup(okMe);
    await api.request("/me", meSchema);
    expect(fetchSpy.mock.calls[0]?.[0]).toBe("http://api.test/api/v1/me");
  });

  it("sends the bearer token from the current session", async () => {
    const { api, sentAuthorization } = setup(okMe, "token-abc");
    await api.request("/me", meSchema);
    expect(sentAuthorization(0)).toBe("Bearer token-abc");
  });

  it("sends no token after sign-out", async () => {
    const { api, sentAuthorization } = setup(okMe);
    await api.request("/me", meSchema);
    await signOut();
    await api.request("/me", meSchema);
    expect(sentAuthorization(1)).toBeNull();
  });

  it("returns the data of a success envelope", async () => {
    const { api } = setup(okMe);
    await expect(api.request("/me", meSchema)).resolves.toEqual({ id: "user-1" });
  });

  it("throws an ApiError carrying the code of a failure envelope", async () => {
    const failure = { ok: false, error: { code: "NOT_FOUND", message: "Not found" }, meta: meta() };
    const { api } = setup(() => Promise.resolve(jsonResponse(failure, 404)));
    const error = await api.request("/me", meSchema).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ code: "NOT_FOUND", requestId: failure.meta.requestId });
  });

  it("signs out when the API answers UNAUTHENTICATED", async () => {
    const failure = { ok: false, error: { code: "UNAUTHENTICATED", message: "No" }, meta: meta() };
    const { api, onUnauthenticated } = setup(() => Promise.resolve(jsonResponse(failure, 401)));
    await expect(api.request("/me", meSchema)).rejects.toMatchObject({ code: "UNAUTHENTICATED" });
    expect(onUnauthenticated).toHaveBeenCalledOnce();
  });

  it("throws NETWORK_ERROR when the request never reaches the server", async () => {
    const { api } = setup(() => Promise.reject(new TypeError("Failed to fetch")));
    await expect(api.request("/me", meSchema)).rejects.toMatchObject({ code: NETWORK_ERROR });
  });

  it("keeps an error code this client does not know yet", async () => {
    const failure = { ok: false, error: { code: "TEAPOT", message: "New code" }, meta: meta() };
    const { api } = setup(() => Promise.resolve(jsonResponse(failure, 418)));
    await expect(api.request("/me", meSchema)).rejects.toMatchObject({ code: "TEAPOT" });
  });

  it("accepts fields the server added after this client shipped", async () => {
    const body = { ok: true, data: { id: "user-1", plan: "free" }, meta: { ...meta(), region: "eu" }, links: {} };
    const { api } = setup(() => Promise.resolve(jsonResponse(body)));
    await expect(api.request("/me", meSchema)).resolves.toEqual({ id: "user-1" });
  });

  it("throws when the response does not match the envelope schema", async () => {
    const { api } = setup(() => Promise.resolve(jsonResponse({ id: "user-1" })));
    await expect(api.request("/me", meSchema)).rejects.toMatchObject({ code: "INTERNAL" });
  });

  it("throws when the response is not JSON", async () => {
    const { api } = setup(() => Promise.resolve(new Response("<html>Bad gateway</html>", { status: 502 })));
    await expect(api.request("/me", meSchema)).rejects.toMatchObject({ code: "INTERNAL" });
  });
});

describe("keepalive requests", () => {
  it("start the fetch before any await when a token is held, so a closing page still sends them", () => {
    const fetchSpy = vi.fn<typeof fetch>(okMe);
    const api = createApiClient({
      baseUrl: API_URL,
      getAccessToken: () => Promise.resolve("slow-token"),
      peekAccessToken: () => "held-token",
      onUnauthenticated: () => Promise.resolve(),
      fetch: fetchSpy,
    });
    void api.request("/me", meSchema, { method: "PATCH", keepalive: true });
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(new Headers(fetchSpy.mock.calls[0]?.[1]?.headers).get("Authorization")).toBe("Bearer held-token");
  });

  it("wait for the token as usual when none is held", async () => {
    const fetchSpy = vi.fn<typeof fetch>(okMe);
    const api = createApiClient({
      baseUrl: API_URL,
      getAccessToken: () => Promise.resolve("fresh-token"),
      peekAccessToken: () => null,
      onUnauthenticated: () => Promise.resolve(),
      fetch: fetchSpy,
    });
    await api.request("/me", meSchema, { keepalive: true });
    expect(new Headers(fetchSpy.mock.calls[0]?.[1]?.headers).get("Authorization")).toBe("Bearer fresh-token");
  });
});

