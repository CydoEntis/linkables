import { describe, expect, it } from "vitest";
import { saveDevice } from "./save-device";

describe("saveDevice", () => {
  it("leads Android with Share", () => {
    expect(saveDevice("android")).toBe("android");
  });

  it("leads iPhone and iPad with the shortcut", () => {
    expect(saveDevice("iphone")).toBe("iphone");
    expect(saveDevice("ipad")).toBe("iphone");
  });

  it("leads every computer, and anything unknown, with the bookmark button", () => {
    for (const source of ["mac", "windows", "linux", "chromeos", "other"] as const) {
      expect(saveDevice(source)).toBe("desktop");
    }
  });
});
