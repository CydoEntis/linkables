import { createClient, type SupportedStorage } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { readAccessToken } from "../auth/access-token";
import { ApiError, createApiClient, NETWORK_ERROR } from "./client";

const API_URL = "http://api.test";
const STORAGE_KEY = "test-auth-token";
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

function signedInSupabase(accessToken: string) {
  const store = new Map<string, string>();
  const storage: SupportedStorage = {
    getItem: (key) => store.get(key) ?? null,
    setItem: (key, value) => void store.set(key, value),
    removeItem: (key) => void store.delete(key),
  };
  store.set(
    STORAGE_KEY,
    JSON.stringify({
      access_token: accessToken,
      refresh_token: "refresh",
      token_type: "bearer",
      expires_in: 3600,
      expires_at: Math.floor(Date.now() / 1000) + 3600,
      user: { id: "user-1", aud: "authenticated", app_metadata: {}, user_metadata: {}, created_at: "" },
    }),
  );
  const authServer = vi.fn(() => Promise.resolve(new Response(null, { status: 204 })));
  return createClient("http://supabase.test", "anon-key", {
    auth: { storage, storageKey: STORAGE_KEY, autoRefreshToken: false, detectSessionInUrl: false },
    global: { fetch: authServer },
  });
}

function setup(fetchImpl: typeof fetch, accessToken = "token-1") {
  const supabase = signedInSupabase(accessToken);
  const onUnauthenticated = vi.fn(() => Promise.resolve());
  const fetchSpy = vi.fn(fetchImpl);
  const api = createApiClient({
    baseUrl: API_URL,
    getAccessToken: () => readAccessToken(supabase),
    onUnauthenticated,
    fetch: fetchSpy,
  });
  const sentAuthorization = (call: number) =>
    new Headers(fetchSpy.mock.calls[call]?.[1]?.headers).get("Authorization");
  return { api, supabase, fetchSpy, onUnauthenticated, sentAuthorization };
}

const okMe = () => Promise.resolve(jsonResponse({ ok: true, data: { id: "user-1" }, meta: meta() }));

describe("api client", () => {
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
    const { api, supabase, sentAuthorization } = setup(okMe);
    await api.request("/me", meSchema);
    await supabase.auth.signOut({ scope: "local" });
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

  it("throws when the response does not match the envelope schema", async () => {
    const { api } = setup(() => Promise.resolve(jsonResponse({ id: "user-1" })));
    await expect(api.request("/me", meSchema)).rejects.toMatchObject({ code: "INTERNAL" });
  });

  it("throws when the response is not JSON", async () => {
    const { api } = setup(() => Promise.resolve(new Response("<html>Bad gateway</html>", { status: 502 })));
    await expect(api.request("/me", meSchema)).rejects.toMatchObject({ code: "INTERNAL" });
  });
});
