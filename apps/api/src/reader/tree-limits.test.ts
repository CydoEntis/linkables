import { parseHTML } from "linkedom";
import { describe, expect, it } from "vitest";
import type { PageNode } from "./to-blocks";
import { exceedsLimits } from "./tree-limits";

function page(body: string): PageNode {
  return parseHTML(`<html><head></head><body>${body}</body></html>`).document;
}

// html, head and body are three elements, at depths 1 and 2.
describe("exceedsLimits", () => {
  it("counts a linkedom document's elements", () => {
    const doc = page("<p>a</p><p>b</p>");
    expect(exceedsLimits(doc, { elements: 5, depth: 10 })).toBe(false);
    expect(exceedsLimits(doc, { elements: 4, depth: 10 })).toBe(true);
  });

  it("measures how deep elements are nested", () => {
    const doc = page("<div><div><p>a</p></div></div>");
    expect(exceedsLimits(doc, { elements: 100, depth: 5 })).toBe(false);
    expect(exceedsLimits(doc, { elements: 100, depth: 4 })).toBe(true);
  });

  it("measures a tree far deeper than the stack allows", () => {
    expect(exceedsLimits(page(`${"<b>".repeat(20_000)}x${"</b>".repeat(20_000)}`), { elements: 50_000, depth: 150 })).toBe(true);
  });
});
