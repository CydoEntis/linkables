import { describe, expect, it } from "vitest";
import { saveSource } from "./save-source";

const UA = {
  iphone: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1",
  ipadOld: "Mozilla/5.0 (iPad; CPU OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1",
  macSafari: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15",
  android: "Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Mobile Safari/537.36",
  chromeos: "Mozilla/5.0 (X11; CrOS x86_64 15000.0.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36",
  windowsFirefox: "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:140.0) Gecko/20100101 Firefox/140.0",
  linuxFirefox: "Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0",
};

describe("saveSource", () => {
  it("reads the device from the user agent", () => {
    expect(saveSource({ userAgent: UA.iphone, maxTouchPoints: 5 })).toBe("iphone");
    expect(saveSource({ userAgent: UA.ipadOld, maxTouchPoints: 5 })).toBe("ipad");
    expect(saveSource({ userAgent: UA.macSafari, maxTouchPoints: 0 })).toBe("mac");
    expect(saveSource({ userAgent: UA.android, maxTouchPoints: 5 })).toBe("android");
    expect(saveSource({ userAgent: UA.chromeos, maxTouchPoints: 0 })).toBe("chromeos");
    expect(saveSource({ userAgent: UA.windowsFirefox, maxTouchPoints: 0 })).toBe("windows");
    expect(saveSource({ userAgent: UA.linuxFirefox, maxTouchPoints: 0 })).toBe("linux");
  });

  it("tells an iPad from a Mac, since iPadOS Safari sends the Mac user agent", () => {
    expect(saveSource({ userAgent: UA.macSafari, maxTouchPoints: 5 })).toBe("ipad");
  });

  it("prefers the platform from client hints when the browser gives it", () => {
    const frozen = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36";
    expect(saveSource({ userAgent: frozen, maxTouchPoints: 0, userAgentData: { platform: "macOS" } })).toBe("mac");
    expect(saveSource({ userAgent: frozen, maxTouchPoints: 0, userAgentData: { platform: "Chrome OS" } })).toBe("chromeos");
  });

  it("says other for anything it does not recognise", () => {
    expect(saveSource({ userAgent: "curl/8.0", maxTouchPoints: 0 })).toBe("other");
    expect(saveSource({ userAgent: "curl/8.0", maxTouchPoints: 0, userAgentData: { platform: "" } })).toBe("other");
  });
});
