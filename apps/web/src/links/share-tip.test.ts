import { describe, expect, it } from "vitest";
import { shareTip } from "./share-tip";

describe("shareTip", () => {
  it("tells Android users to add linkables to the home screen first", () => {
    expect(shareTip("android", false)).toBe("Faster: add linkables to your home screen, then in any app tap Share → linkables.");
  });

  it("tells the installed Android app to share to linkables", () => {
    expect(shareTip("android", true)).toBe("Faster: in any app, tap Share, then linkables.");
  });

  it("promises nothing on iPhone yet", () => {
    expect(shareTip("iphone", false)).toBe("Saving from Share on iPhone is coming soon.");
    expect(shareTip("ipad", true)).toBe("Saving from Share on iPhone is coming soon.");
  });

  it("says nothing where sharing to linkables does not exist", () => {
    expect(shareTip("windows", false)).toBeNull();
    expect(shareTip("other", true)).toBeNull();
  });
});
