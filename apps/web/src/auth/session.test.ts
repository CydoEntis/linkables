import { afterEach, expect, it, vi } from "vitest";
import { currentSession, loadSession, rememberSession, signIn, signOut } from "./session";
import { session } from "../test/session";

function response(data: unknown, status = 200) {
  return new Response(JSON.stringify({ ok: true, data, meta: { requestId: crypto.randomUUID(), ms: 1, version: "v1" } }), { status });
}
afterEach(() => { rememberSession(null); vi.unstubAllGlobals(); });

it("signs in with a local password and keeps the token out of local storage", async () => {
  const fetchSpy = vi.fn<typeof fetch>(() => Promise.resolve(response(session())));
  vi.stubGlobal("fetch", fetchSpy);
  await signIn({ email: "user@example.com", password: "password1234" });
  expect(currentSession()?.user.email).toBe("user@example.com");
  expect(fetchSpy.mock.calls[0]?.[1]).toMatchObject({ credentials: "include", method: "POST" });
  expect(localStorage.length).toBe(0);
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
  const fetchSpy = vi.fn(() => Promise.resolve(response(null)));
  vi.stubGlobal("fetch", fetchSpy);
  await signOut();
  expect(currentSession()).toBeNull();
  expect(fetchSpy).toHaveBeenCalledWith(expect.stringContaining("/auth/sign-out"), expect.objectContaining({ method: "POST" }));
});
