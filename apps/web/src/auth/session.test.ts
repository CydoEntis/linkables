import { afterEach, expect, it, vi } from "vitest";
import { AUTH_CHANGED_KEY, currentSession, forgetSession, loadSession, rememberSession, signIn, signOut, startSessionSync } from "./session";
import { session } from "../test/session";

function response(data: unknown, status = 200) {
  return new Response(JSON.stringify({ ok: true, data, meta: { requestId: crypto.randomUUID(), ms: 1, version: "v1" } }), { status });
}
afterEach(() => { rememberSession(null); localStorage.clear(); vi.unstubAllGlobals(); });

it("signs in with a local password and keeps the token out of local storage", async () => {
  const fetchSpy = vi.fn<typeof fetch>(() => Promise.resolve(response(session())));
  vi.stubGlobal("fetch", fetchSpy);
  await signIn({ email: "user@example.com", password: "password1234" });
  expect(currentSession()?.user.email).toBe("user@example.com");
  expect(fetchSpy.mock.calls[0]?.[1]).toMatchObject({ credentials: "include", method: "POST" });
  expect(localStorage.getItem(AUTH_CHANGED_KEY)).not.toBeNull();
  expect(Object.keys(localStorage).map((key) => localStorage.getItem(key)).join("")).not.toContain("token-1");
});

it("loads a session from the server cookie", async () => {
  vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(response(session()))));
  expect((await loadSession())?.token).toBe("token-1");
});

it("keeps an existing session on a temporary network failure", async () => {
  rememberSession(session());
  vi.stubGlobal("fetch", vi.fn(() => Promise.reject(new TypeError("offline"))));
  await expect(loadSession()).rejects.toMatchObject({ code: "NETWORK_ERROR" });
  expect(currentSession()?.token).toBe("token-1");
});

it("revokes the server session before clearing the local token", async () => {
  rememberSession(session());
  const fetchSpy = vi.fn<typeof fetch>(() => Promise.resolve(response(null)));
  vi.stubGlobal("fetch", fetchSpy);
  await signOut();
  expect(currentSession()).toBeNull();
  expect(fetchSpy).toHaveBeenCalledWith(expect.stringContaining("/auth/sign-out"), expect.objectContaining({ method: "POST" }));
  expect(new Headers(fetchSpy.mock.calls[0]?.[1]?.headers).get("Authorization")).toBe("Bearer token-1");
  expect(fetchSpy.mock.calls[0]?.[1]?.credentials).toBe("omit");
});

it("does not clear a newer session when an old token is rejected", async () => {
  rememberSession(session("new-token"));
  await forgetSession("old-token");
  expect(currentSession()?.token).toBe("new-token");
});

it("clears private state immediately on a cross-tab change even while offline", async () => {
  rememberSession(session());
  vi.stubGlobal("fetch", vi.fn(() => Promise.reject(new TypeError("offline"))));
  const stop = startSessionSync();
  try {
    window.dispatchEvent(new StorageEvent("storage", { key: AUTH_CHANGED_KEY, newValue: "change" }));
    expect(currentSession()).toBeNull();
    await vi.waitFor(() => { expect(fetch).toHaveBeenCalledOnce(); });
  } finally { stop(); }
});

it("loads the shared cookie account when another tab signals a change", async () => {
  rememberSession(session());
  const next = { ...session("new-token"), user: { ...session().user, id: "7d9c1b2a-3e4f-4a5b-8c6d-7e8f9a0b1c22" } };
  vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(response(next))));
  const stop = startSessionSync();
  try {
    window.dispatchEvent(new StorageEvent("storage", { key: AUTH_CHANGED_KEY, newValue: "change" }));
    await vi.waitFor(() => { expect(currentSession()?.token).toBe("new-token"); });
  } finally { stop(); }
});
