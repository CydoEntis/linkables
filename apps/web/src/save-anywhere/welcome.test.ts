import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const blocked = () => { throw new DOMException("blocked", "SecurityError"); };

// A fresh module per test: what this tab has seen is module state.
async function loadWelcome() {
  return import("./welcome");
}

beforeEach(() => {
  vi.resetModules();
});

afterEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
});

describe("welcomeSeen", () => {
  it("is false until the prompt has been seen on this device, and stays true after a reload", async () => {
    const welcome = await loadWelcome();
    expect(welcome.welcomeSeen()).toBe(false);
    welcome.markWelcomeSeen();
    expect(welcome.welcomeSeen()).toBe(true);

    vi.resetModules();
    expect((await loadWelcome()).welcomeSeen()).toBe(true);
  });

  it("reads as seen when storage cannot be read, so the prompt does not show on every visit", async () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(blocked);
    expect((await loadWelcome()).welcomeSeen()).toBe(true);
  });

  it("stays seen for the rest of the visit when storage refuses the write", async () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(blocked);
    const welcome = await loadWelcome();
    expect(() => { welcome.markWelcomeSeen(); }).not.toThrow();
    expect(welcome.welcomeSeen()).toBe(true);
  });
});
