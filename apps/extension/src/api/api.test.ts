import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { z } from "zod";
import { CONNECTION_KEY } from "../auth/session";
import { memoryStorageArea } from "../test/memory-storage-area";
import { api } from "./api";

let area: chrome.storage.StorageArea;
const session = { user: { id: "0b6e2f3a-5c1d-4e8f-9a2b-3c4d5e6f7a81", email: "user@example.com", name: "User" }, token: "a-token", expiresAt: new Date(Date.now() + 3600_000).toISOString() };
beforeEach(() => {
  area = memoryStorageArea();
  vi.stubGlobal("chrome", { storage: { local: area } });
});
afterEach(() => { vi.unstubAllGlobals(); });

it("sends a session token only to its associated server", async () => {
  await area.set({ [CONNECTION_KEY]: { origin: "https://a.example.com", session } });
  const fetchSpy = vi.fn<typeof fetch>(() => Promise.resolve(new Response(JSON.stringify({ ok: true, data: { id: "link" }, meta: { requestId: crypto.randomUUID(), ms: 1, version: "v1" } }))));
  vi.stubGlobal("fetch", fetchSpy);
  await api.request("/me", z.object({ id: z.string() }));
  expect(fetchSpy.mock.calls[0]?.[0]).toBe("https://a.example.com/api/v1/me");
  expect(new Headers(fetchSpy.mock.calls[0]?.[1]?.headers).get("Authorization")).toBe("Bearer a-token");
  await area.set({ [CONNECTION_KEY]: { origin: "https://b.example.com", session: null } });
  await expect(api.request("/me", z.object({ id: z.string() }))).rejects.toMatchObject({ code: "NO_SESSION" });
  expect(fetchSpy).toHaveBeenCalledOnce();
});
