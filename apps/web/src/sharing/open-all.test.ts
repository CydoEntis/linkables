import { describe, expect, it, vi } from "vitest";
import { openAll } from "./open-all";

type FakeTab = { opener: unknown; location: { href: string } };

function tab(): FakeTab {
  return { opener: {}, location: { href: "about:blank" } };
}

function opener(results: (FakeTab | null)[]) {
  const open = vi.fn<typeof window.open>();
  for (const result of results) open.mockReturnValueOnce(result as Window | null);
  return open;
}

describe("openAll", () => {
  it("opens every http(s) link in its own tab with no way back to this page", () => {
    const tabs = [tab(), tab()];

    const result = openAll(["https://a.example/", "javascript:alert(1)", "http://b.example/"], opener(tabs));

    expect(tabs).toEqual([
      { opener: null, location: { href: "https://a.example/" } },
      { opener: null, location: { href: "http://b.example/" } },
    ]);
    expect(result).toEqual({ opened: ["https://a.example/", "http://b.example/"], blocked: [] });
  });

  it("names the links the browser blocked", () => {
    const result = openAll(["https://a.example/", "https://b.example/", "https://c.example/"], opener([tab(), null, null]));

    expect(result).toEqual({ opened: ["https://a.example/"], blocked: ["https://b.example/", "https://c.example/"] });
  });
});
