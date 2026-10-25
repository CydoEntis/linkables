import { describe, expect, it } from "vitest";
import { windowCounter } from "./window-counter";

const HOUR = 60 * 60 * 1000;

function counter(maxKeys = 100) {
  let now = 0;
  const windows = windowCounter({ limit: 2, windowMs: HOUR, maxKeys, now: () => now });
  return { windows, at: (ms: number) => { now = ms; } };
}

describe("windowCounter", () => {
  it("allows up to the limit per key in one window", () => {
    const { windows } = counter();

    expect([windows.hit("a"), windows.hit("a"), windows.hit("a")].map((result) => result.ok)).toEqual([true, true, false]);
  });

  it("says how long until the window ends", () => {
    const { windows, at } = counter();
    windows.hit("a");
    windows.hit("a");
    at(HOUR - 1000);

    expect(windows.hit("a")).toEqual({ ok: false, retryAfterMs: 1000 });
  });

  it("starts a fresh window once the old one ends", () => {
    const { windows, at } = counter();
    windows.hit("a");
    windows.hit("a");
    at(HOUR);

    expect(windows.hit("a").ok).toBe(true);
  });

  it("drops keys whose window has ended", () => {
    const { windows, at } = counter();
    windows.hit("a");
    windows.hit("b");
    at(HOUR);

    windows.hit("c");

    expect(windows.size()).toBe(1);
  });

  it("keeps a key that started a new window after keys that are still open", () => {
    const { windows, at } = counter();
    windows.hit("a");
    at(HOUR / 2);
    windows.hit("b");
    at(HOUR);
    windows.hit("a");
    at(HOUR + HOUR / 2);

    windows.hit("c");

    expect(windows.size()).toBe(2);
  });

  it("never holds more than maxKeys keys", () => {
    const { windows } = counter(3);

    for (const key of ["a", "b", "c", "d", "e"]) windows.hit(key);

    expect(windows.size()).toBe(3);
  });

  it("limits a new key while it is full of open windows", () => {
    const { windows } = counter(2);
    windows.hit("a");
    windows.hit("b");

    expect(windows.hit("c")).toEqual({ ok: false, retryAfterMs: HOUR });
    expect(windows.hit("a").ok).toBe(true);
  });

  it("takes a new key again once the oldest window ends", () => {
    const { windows, at } = counter(2);
    windows.hit("a");
    at(1000);
    windows.hit("b");
    at(HOUR);

    expect(windows.hit("c").ok).toBe(true);
  });
});
