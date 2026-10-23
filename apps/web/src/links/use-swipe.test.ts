import { describe, expect, it } from "vitest";
import { clampOffset, settlesOpen } from "./use-swipe";

describe("swipe", () => {
  it("stops at the tiles and never swipes right", () => {
    expect(clampOffset(-500, 204)).toBe(-204);
    expect(clampOffset(40, 204)).toBe(0);
  });

  it("opens once a closed row moves past 60 px", () => {
    expect(settlesOpen(false, -59, 204)).toBe(false);
    expect(settlesOpen(false, -61, 204)).toBe(true);
  });

  it("closes once an open row moves back past 60 px", () => {
    expect(settlesOpen(true, -150, 204)).toBe(true);
    expect(settlesOpen(true, -140, 204)).toBe(false);
  });
});
