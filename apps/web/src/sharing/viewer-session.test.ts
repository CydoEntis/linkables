import { afterEach, describe, expect, it } from "vitest";
import { forgetViewerSession, rememberViewerSession, viewerSessionFor } from "./viewer-session";

const TOKEN = "T".repeat(32);
const SESSION = "S".repeat(32);
const NOW = Date.UTC(2026, 9, 27, 12, 0, 0);

afterEach(() => {
  forgetViewerSession(TOKEN);
  localStorage.clear();
});

describe("viewer session", () => {
  it("is held until it expires", () => {
    rememberViewerSession(TOKEN, { session: SESSION, expiresAt: new Date(NOW + 1000).toISOString() });

    expect(viewerSessionFor(TOKEN, NOW)).toBe(SESSION);
    expect(viewerSessionFor(TOKEN, NOW + 1000)).toBeUndefined();
  });

  it("survives a reload through storage", () => {
    rememberViewerSession(TOKEN, { session: SESSION, expiresAt: new Date(NOW + 1000).toISOString() });
    forgetViewerSession(TOKEN);
    localStorage.setItem(`linkables.viewer.${TOKEN}`, JSON.stringify({ session: SESSION, expiresAt: new Date(NOW + 1000).toISOString() }));

    expect(viewerSessionFor(TOKEN, NOW)).toBe(SESSION);
  });

  it("is forgotten on demand", () => {
    rememberViewerSession(TOKEN, { session: SESSION, expiresAt: new Date(NOW + 1000).toISOString() });
    forgetViewerSession(TOKEN);

    expect(viewerSessionFor(TOKEN, NOW)).toBeUndefined();
  });

  it("ignores a stored value that is not a session", () => {
    localStorage.setItem(`linkables.viewer.${TOKEN}`, "{not json");

    expect(viewerSessionFor(TOKEN, NOW)).toBeUndefined();
  });
});
