import { describe, expect, it } from "vitest";
import { canRead } from "./can-read";

describe("canRead", () => {
  it("offers reading for a page", () => {
    expect(canRead({ resource: { kind: "page" } })).toBe(true);
  });

  it("offers reading while the kind is still unknown", () => {
    expect(canRead({ resource: { kind: null } })).toBe(true);
  });

  it("does not offer reading for a video or a file", () => {
    expect(canRead({ resource: { kind: "video" } })).toBe(false);
    expect(canRead({ resource: { kind: "other" } })).toBe(false);
  });
});
