import { describe, expect, it } from "vitest";
import { memoryStorageArea } from "../test/memory-storage-area";
import { authStorage, chromeStorage } from "./chrome-storage";

describe("chromeStorage", () => {
  it("reads a missing key as null", async () => {
    await expect(chromeStorage(memoryStorageArea()).getItem("sb-auth")).resolves.toBeNull();
  });

  it("reads back what it wrote", async () => {
    const storage = chromeStorage(memoryStorageArea());
    await storage.setItem("sb-auth", '{"access_token":"t"}');
    await expect(storage.getItem("sb-auth")).resolves.toBe('{"access_token":"t"}');
  });

  it("forgets a removed key", async () => {
    const storage = chromeStorage(memoryStorageArea());
    await storage.setItem("sb-auth", "session");
    await storage.removeItem("sb-auth");
    await expect(storage.getItem("sb-auth")).resolves.toBeNull();
  });

  it("reads a value that is not text as null", async () => {
    const area = memoryStorageArea();
    await area.set({ "sb-auth": { not: "a string" } });
    await expect(chromeStorage(area).getItem("sb-auth")).resolves.toBeNull();
  });

  it("keeps the session where another popup opened later reads it", async () => {
    const area = memoryStorageArea();
    await chromeStorage(area).setItem("sb-auth", "session");
    await expect(chromeStorage(area).getItem("sb-auth")).resolves.toBe("session");
  });
});

describe("authStorage", () => {
  it("keeps the session in the persistent area and the PKCE verifier only in memory", async () => {
    const [local, session] = [memoryStorageArea(), memoryStorageArea()];
    const storage = authStorage(local, session);

    await storage.setItem("sb-auth", "session");
    await storage.setItem("sb-auth-code-verifier", "verifier");

    await expect(local.get("sb-auth")).resolves.toEqual({ "sb-auth": "session" });
    await expect(local.get("sb-auth-code-verifier")).resolves.toEqual({});
    await expect(storage.getItem("sb-auth-code-verifier")).resolves.toBe("verifier");
    await storage.removeItem("sb-auth-code-verifier");
    await expect(session.get("sb-auth-code-verifier")).resolves.toEqual({});
  });
});
