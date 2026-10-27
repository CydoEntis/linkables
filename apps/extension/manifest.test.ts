import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { buildFirefoxManifest, buildManifest, EXTENSION_ID, GECKO_ID, extensionIdFor, MANIFEST_KEY } from "./manifest";

const manifest = buildManifest({
  version: "0.1.0",
  appUrl: "https://linkables.app",
  supabaseUrl: "https://ref.supabase.co",
});

describe("buildManifest", () => {
  it("asks only for the active tab, storage, the Google sign-in window, the side panel and the right-click menu", () => {
    expect(manifest.permissions).toEqual(["activeTab", "storage", "identity", "sidePanel", "contextMenus"]);
  });

  it("runs its worker as a module", () => {
    expect(manifest.background).toEqual({ service_worker: "worker.js", type: "module" });
  });

  it("injects its content script on the app's pages only, before they run", () => {
    expect(manifest.content_scripts).toEqual([{ matches: ["https://linkables.app/*"], js: ["content-script.js"], run_at: "document_start" }]);
  });

  it("does not let web pages message the extension directly, which Firefox cannot do", () => {
    expect(manifest).not.toHaveProperty("externally_connectable");
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

  it("points every icon size at a file drawn at exactly that size", () => {
    for (const [size, file] of Object.entries({ ...manifest.icons, ...manifest.action.default_icon })) {
      const png = readFileSync(join(import.meta.dirname, "public", file));
      expect([png.readUInt32BE(16), png.readUInt32BE(20)], file).toEqual([Number(size), Number(size)]);
    }
    expect(Object.keys(manifest.icons)).toEqual(["16", "32", "48", "128"]);
  });

  it("drops a trailing slash from the configured origins", () => {
    const built = buildManifest({ version: "0.1.0", appUrl: "http://127.0.0.1:3261/", supabaseUrl: "http://dummy.test/" });
    expect(built.host_permissions).toEqual(["http://127.0.0.1:3261/*", "http://dummy.test/*"]);
  });
});

describe("side panel", () => {
  it("asks for tabs only when the user turns on Follow the tab you're on", () => {
    expect(manifest.optional_permissions).toEqual(["tabs"]);
  });

  it("opens the side panel page", () => {
    expect(manifest.side_panel).toEqual({ default_path: "sidepanel.html" });
  });

  it("suggests Alt+Shift+L to open the side panel", () => {
    expect(manifest.commands["open-side-panel"].suggested_key).toEqual({ default: "Alt+Shift+L" });
  });
});

describe("buildFirefoxManifest", () => {
  const firefox = buildFirefoxManifest({ version: "0.3.1", appUrl: "https://linkables.app", supabaseUrl: "https://ref.supabase.co" });

  it("runs the worker as an event page, since Firefox has no service worker", () => {
    expect(firefox.background).toEqual({ scripts: ["worker.js"], type: "module" });
    expect(firefox.background).not.toHaveProperty("service_worker");
  });

  it("has a fixed gecko id and no Chrome key", () => {
    expect(firefox.browser_specific_settings.gecko.id).toBe(GECKO_ID);
    expect(firefox).not.toHaveProperty("key");
  });

  it("shows the panel as a sidebar and opens it with Alt+Shift+L", () => {
    expect(firefox.sidebar_action.default_panel).toBe("sidepanel.html");
    expect(firefox).not.toHaveProperty("side_panel");
    expect(firefox.commands._execute_sidebar_action.suggested_key).toEqual({ default: "Alt+Shift+L" });
  });

  it("drops the Chrome-only sidePanel permission and keeps the rest", () => {
    expect(firefox.permissions).toEqual(["activeTab", "storage", "identity", "contextMenus"]);
  });

  it("reaches the same hosts and runs the same content script as Chrome", () => {
    expect(firefox.host_permissions).toEqual(manifest.host_permissions);
    expect(firefox.content_scripts).toEqual(manifest.content_scripts);
    expect(firefox.optional_permissions).toEqual(["tabs"]);
  });
});

describe("extensionIdFor", () => {
  it("gives the id Chrome derives from the committed key", async () => {
    await expect(extensionIdFor(MANIFEST_KEY)).resolves.toBe(EXTENSION_ID);
  });
});
