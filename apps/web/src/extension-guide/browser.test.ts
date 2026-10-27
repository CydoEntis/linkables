import { afterEach, expect, it, vi } from "vitest";
import { isFirefox } from "./browser";

const FIREFOX_DESKTOP = "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:130.0) Gecko/20100101 Firefox/130.0";
const FIREFOX_ANDROID = "Mozilla/5.0 (Android 14; Mobile; rv:130.0) Gecko/130.0 Firefox/130.0";
const CHROME = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36";
const SAFARI = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15";

afterEach(() => {
  vi.restoreAllMocks();
});

function as(userAgent: string) {
  vi.spyOn(navigator, "userAgent", "get").mockReturnValue(userAgent);
}

it("recognises desktop Firefox", () => {
  as(FIREFOX_DESKTOP);
  expect(isFirefox()).toBe(true);
});

it.each([["Firefox on Android", FIREFOX_ANDROID], ["Chrome", CHROME], ["Safari", SAFARI]])("does not treat %s as Firefox", (_name, ua) => {
  as(ua);
  expect(isFirefox()).toBe(false);
});
