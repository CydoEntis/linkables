import { describe, expect, it } from "vitest";
import { memoryStorageArea } from "../test/memory-storage-area";
import { chromeStorage } from "./chrome-storage";

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
