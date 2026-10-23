import { describe, expect, it } from "vitest";
import { savedLink } from "./test-links";
import { pendingRefetchInterval, type LinksPages } from "./use-links";

const now = Date.parse("2026-10-22T12:00:00Z");
const secondsAgo = (seconds: number) => new Date(now - seconds * 1000).toISOString();

function pages(...links: ReturnType<typeof savedLink>[]): LinksPages {
  return { pages: [{ items: links, cursor: null }], pageParams: [undefined] };
}

const pending = (seconds: number) => savedLink({ savedAt: secondsAgo(seconds), resource: { fetchStatus: "pending" } });

describe("pendingRefetchInterval", () => {
  it("does not poll when nothing is pending", () => {
    expect(pendingRefetchInterval(pages(savedLink()), now)).toBe(false);
  });

  it("backs off from 2 s to 5 s to 15 s as the newest pending save ages", () => {
    expect(pendingRefetchInterval(pages(pending(3)), now)).toBe(2000);
    expect(pendingRefetchInterval(pages(pending(20)), now)).toBe(5000);
    expect(pendingRefetchInterval(pages(pending(90)), now)).toBe(15000);
  });

  it("follows the newest pending save", () => {
    expect(pendingRefetchInterval(pages(pending(300), pending(3)), now)).toBe(2000);
  });

  it("stops two minutes after the newest pending save", () => {
    expect(pendingRefetchInterval(pages(pending(121)), now)).toBe(false);
  });
});
