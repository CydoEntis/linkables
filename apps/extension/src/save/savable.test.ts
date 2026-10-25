import { URL_MAX_LENGTH } from "@linkables/shared/links";
import { describe, expect, it } from "vitest";
import { CANT_SAVE_REASONS, savablePage } from "./savable";

describe("savablePage", () => {
  it("saves a web page with its address and title", () => {
    expect(savablePage({ url: "https://example.com/a?b=1", title: "Example" })).toEqual({
      ok: true,
      url: "https://example.com/a?b=1",
      title: "Example",
    });
  });

  it("saves a plain http page", () => {
    expect(savablePage({ url: "http://example.com/" })).toMatchObject({ ok: true, url: "http://example.com/" });
  });

  it("leaves the title out when the tab has none", () => {
    expect(savablePage({ url: "https://example.com/", title: "" })).toEqual({ ok: true, url: "https://example.com/", title: null });
  });

  it.each(["chrome://settings/", "edge://settings/", "brave://settings/", "about:blank", "chrome-extension://abc/popup.html", "view-source:https://example.com/", "devtools://devtools/bundled/inspector.html"])(
    "refuses the browser page %s",
    (url) => {
      expect(savablePage({ url })).toEqual({ ok: false, reason: CANT_SAVE_REASONS.browser });
    },
  );

  it("refuses a file on this computer", () => {
    expect(savablePage({ url: "file:///C:/notes.txt" })).toEqual({ ok: false, reason: CANT_SAVE_REASONS.file });
  });

  it.each(["https://chromewebstore.google.com/detail/abc", "https://chrome.google.com/webstore/detail/abc"])(
    "refuses the Chrome Web Store page %s",
    (url) => {
      expect(savablePage({ url })).toEqual({ ok: false, reason: CANT_SAVE_REASONS.webStore });
    },
  );

  it("saves a page on chrome.google.com outside the Web Store", () => {
    expect(savablePage({ url: "https://chrome.google.com/intl/en/" })).toMatchObject({ ok: true });
  });

  it.each(["data:text/html,hi", "blob:https://example.com/1234", "javascript:void(0)"])("refuses the address %s", (url) => {
    expect(savablePage({ url })).toEqual({ ok: false, reason: CANT_SAVE_REASONS.noAddress });
  });

  it("refuses a tab whose address the extension may not read", () => {
    expect(savablePage({ title: "Hidden" })).toEqual({ ok: false, reason: CANT_SAVE_REASONS.unreadable });
  });

  it("refuses an address longer than the API accepts", () => {
    const url = `https://example.com/${"a".repeat(URL_MAX_LENGTH)}`;
    expect(savablePage({ url })).toEqual({ ok: false, reason: CANT_SAVE_REASONS.tooLong });
  });
});
