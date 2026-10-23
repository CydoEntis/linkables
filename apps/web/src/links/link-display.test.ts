import { describe, expect, it } from "vitest";
import { domainOf, relativeTime, tileFor } from "./link-display";

const now = new Date(2026, 9, 22, 12, 0).getTime();
const ago = (ms: number) => new Date(now - ms).toISOString();
const MINUTE = 60_000;

describe("relativeTime", () => {
  it("says now for the last minute, and for a server clock slightly ahead", () => {
    expect(relativeTime(ago(30_000), now)).toBe("now");
    expect(relativeTime(ago(-5_000), now)).toBe("now");
  });

  it("counts minutes, then hours, within a day", () => {
    expect(relativeTime(ago(35 * MINUTE), now)).toBe("35m");
    expect(relativeTime(ago(3 * 60 * MINUTE), now)).toBe("3h");
  });

  it("shows the date after a day, with the year only when it differs", () => {
    expect(relativeTime(new Date(2026, 9, 20, 9, 0).toISOString(), now)).toBe("Oct 20");
    expect(relativeTime(new Date(2025, 11, 31, 9, 0).toISOString(), now)).toBe("Dec 31, 2025");
  });
});

describe("domainOf", () => {
  it("drops www. and keeps other subdomains", () => {
    expect(domainOf("https://www.youtube.com/watch?v=x")).toBe("youtube.com");
    expect(domainOf("https://doc.rust-lang.org/book")).toBe("doc.rust-lang.org");
  });
});

describe("tileFor", () => {
  it("gives a domain the same hue every time and its first letter", () => {
    expect(tileFor("seriouseats.com")).toEqual(tileFor("seriouseats.com"));
    expect(tileFor("seriouseats.com").letter).toBe("S");
    expect(tileFor("seriouseats.com").hue).toBeGreaterThanOrEqual(0);
    expect(tileFor("seriouseats.com").hue).toBeLessThan(360);
  });
});
