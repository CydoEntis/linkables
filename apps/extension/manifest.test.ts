import { describe, expect, it } from "vitest";
import { buildManifest, EXTENSION_ID, extensionIdFor, MANIFEST_KEY } from "./manifest";

const manifest = buildManifest({
  version: "0.1.0",
  appUrl: "https://linkables.app",
  supabaseUrl: "https://ref.supabase.co",
});

describe("buildManifest", () => {
  it("asks only for the active tab and storage", () => {
    expect(manifest.permissions).toEqual(["activeTab", "storage"]);
  });

  it("reaches only the app and the Supabase project", () => {
    expect(manifest.host_permissions).toEqual(["https://linkables.app/*", "https://ref.supabase.co/*"]);
  });

  it("carries the public key that fixes the extension id", () => {
    expect(manifest.key).toBe(MANIFEST_KEY);
  });

  it("leaves the key out of the Web Store build, which gets its id from the store", () => {
    const built = buildManifest({ version: "0.2.0", appUrl: "https://linkables.app", supabaseUrl: "https://ref.supabase.co", store: true });
    expect(built).not.toHaveProperty("key");
    expect(built.permissions).toEqual(manifest.permissions);
  });

  it("has a description short enough for the Web Store summary", () => {
    expect(manifest.description.length).toBeLessThanOrEqual(132);
  });

  it("drops a trailing slash from the configured origins", () => {
    const built = buildManifest({ version: "0.1.0", appUrl: "http://127.0.0.1:3261/", supabaseUrl: "http://dummy.test/" });
    expect(built.host_permissions).toEqual(["http://127.0.0.1:3261/*", "http://dummy.test/*"]);
  });
});

describe("extensionIdFor", () => {
  it("gives the id Chrome derives from the committed key", async () => {
    await expect(extensionIdFor(MANIFEST_KEY)).resolves.toBe(EXTENSION_ID);
  });
});
