import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { memoryStorageArea } from "../test/memory-storage-area";
import { CONNECTION_KEY, configureServer, forgetSession, readConnection, signIn } from "./session";

const session = { user: { id: "0b6e2f3a-5c1d-4e8f-9a2b-3c4d5e6f7a81", email: "user@example.com", name: "User" }, token: "server-a-token", expiresAt: new Date(Date.now() + 3600_000).toISOString() };
let area: chrome.storage.StorageArea;
const request = vi.fn(() => Promise.resolve(true));

beforeEach(() => {
  area = memoryStorageArea();
  request.mockClear();
  vi.stubGlobal("chrome", { storage: { local: area }, permissions: { request } });
});
afterEach(() => { vi.unstubAllGlobals(); });

it("clears credentials when changing server", async () => {
  await area.set({ [CONNECTION_KEY]: { origin: "https://a.example.com", session } });
  await configureServer("https://b.example.com");
  expect(await readConnection()).toEqual({ origin: "https://b.example.com", session: null });
  expect(request).toHaveBeenCalledWith({ origins: ["https://b.example.com/*"] });
});

it("does not change server when host access is denied", async () => {
  request.mockResolvedValueOnce(false);
  await area.set({ [CONNECTION_KEY]: { origin: "https://a.example.com", session } });
  await expect(configureServer("https://b.example.com")).rejects.toThrow("Allow access");
  expect((await readConnection())?.session?.token).toBe("server-a-token");
});

it("ignores an old server's unauthorized response after switching", async () => {
  await area.set({ [CONNECTION_KEY]: { origin: "https://b.example.com", session } });
  await forgetSession("https://a.example.com");
  expect((await readConnection())?.session?.token).toBe("server-a-token");
});

it("keeps a newer sign-in when an older token is rejected on the same server", async () => {
  await area.set({ [CONNECTION_KEY]: { origin: "https://a.example.com", session: { ...session, token: "new-token" } } });
  await forgetSession("https://a.example.com", "old-token");
  expect((await readConnection())?.session?.token).toBe("new-token");
});

it("does not replace a new server connection with an old sign-in response", async () => {
  await area.set({ [CONNECTION_KEY]: { origin: "https://a.example.com", session: null } });
  let finish: (response: Response) => void = () => undefined;
  const pending = new Promise<Response>((resolve) => { finish = resolve; });
  const fetchSpy = vi.fn(() => pending);
  vi.stubGlobal("fetch", fetchSpy);
  const signingIn = signIn({ email: "user@example.com", password: "password1234" });
  await vi.waitFor(() => { expect(fetchSpy).toHaveBeenCalledOnce(); });
  await configureServer("https://b.example.com");
  finish(new Response(JSON.stringify({ ok: true, data: session, meta: { requestId: crypto.randomUUID(), ms: 1, version: "v1" } })));
  await expect(signingIn).rejects.toThrow("Server changed");
  expect(await readConnection()).toEqual({ origin: "https://b.example.com", session: null });
});

it("keeps stored credentials on a temporary network failure", async () => {
  await area.set({ [CONNECTION_KEY]: { origin: "https://a.example.com", session } });
  vi.stubGlobal("fetch", vi.fn(() => Promise.reject(new TypeError("offline"))));
  await expect(signIn({ email: "user@example.com", password: "password1234" })).rejects.toMatchObject({ code: "NETWORK_ERROR" });
  expect((await readConnection())?.session?.token).toBe("server-a-token");
});
