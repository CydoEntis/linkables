import { describe, expect, it } from "vitest";
import { savedLink } from "./test-links";
import { pendingPoller, type LinksPages } from "./use-links";

const start = Date.parse("2026-10-22T12:00:00Z");
const after = (seconds: number) => start + seconds * 1000;

function pages(...links: ReturnType<typeof savedLink>[]): LinksPages {
  return { pages: [{ items: links, cursor: null }], pageParams: [undefined] };
}

const pending = (id: string, savedAt = new Date(start).toISOString()) =>
  savedLink({ id, savedAt, resource: { fetchStatus: "pending" } });

describe("pendingPoller", () => {
  it("does not poll when nothing is pending", () => {
    expect(pendingPoller()(pages(savedLink()), start)).toBe(false);
  });

  it("backs off from 2 s to 5 s to 15 s, then stops two minutes after it first saw the row", () => {
    const intervalFor = pendingPoller();
    const data = pages(pending("a"));
    expect(intervalFor(data, start)).toBe(2000);
    expect(intervalFor(data, after(20))).toBe(5000);
    expect(intervalFor(data, after(90))).toBe(15000);
    expect(intervalFor(data, after(121))).toBe(false);
  });

  it("keeps polling when the device clock runs ahead of the server's savedAt", () => {
    const tenMinutesBehind = new Date(start - 10 * 60_000).toISOString();
    expect(pendingPoller()(pages(pending("a", tenMinutesBehind)), start)).toBe(2000);
  });

  it("starts again at 2 s when a new pending row appears", () => {
    const intervalFor = pendingPoller();
    intervalFor(pages(pending("a")), start);
    expect(intervalFor(pages(pending("a"), pending("b")), after(90))).toBe(2000);
  });
});
