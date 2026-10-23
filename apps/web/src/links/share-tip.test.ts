import { describe, expect, it } from "vitest";
import { shareTip } from "./share-tip";

describe("shareTip", () => {
  it("tells Android users to add linkables to the home screen first", () => {
    expect(shareTip("android", false, false)).toBe("Faster: add linkables to your home screen, then in any app tap Share → linkables.");
  });

  it("tells the installed Android app to share to linkables", () => {
    expect(shareTip("android", true, false)).toBe("Faster: in any app, tap Share, then linkables.");
  });

  it("tells iPhone and iPad users to share through the shortcut once it exists", () => {
    const tip = "Faster: add the Save to linkables shortcut, then in any app tap Share → Save to linkables.";
    expect(shareTip("iphone", false, true)).toBe(tip);
    expect(shareTip("ipad", true, true)).toBe(tip);
  });

  it("promises nothing on iPhone while there is no shortcut to add", () => {
    expect(shareTip("iphone", false, false)).toBe("Saving from Share on iPhone is coming soon.");
    expect(shareTip("ipad", true, false)).toBe("Saving from Share on iPhone is coming soon.");
  });

  it("says nothing where sharing to linkables does not exist", () => {
    expect(shareTip("windows", false, true)).toBeNull();
    expect(shareTip("other", true, false)).toBeNull();
  });
});
