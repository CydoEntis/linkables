import { describe, expect, it } from "vitest";
import { extractSharedUrl } from "./shared-url";

describe("extractSharedUrl", () => {
  it("takes the url param when it is a link", () => {
    expect(extractSharedUrl({ url: "https://example.test/a" })).toBe("https://example.test/a");
  });

  it("finds the link inside the text, as Android shares it", () => {
    expect(extractSharedUrl({ text: "look at this https://example.test/b ok" })).toBe("https://example.test/b");
  });

  it("falls back to the title when url and text hold no link", () => {
    expect(extractSharedUrl({ text: "no link here", title: "Video http://example.test/c" })).toBe("http://example.test/c");
  });

  it("prefers url over text and text over title", () => {
    expect(
      extractSharedUrl({ url: "https://example.test/url", text: "https://example.test/text", title: "https://example.test/title" }),
    ).toBe("https://example.test/url");
    expect(extractSharedUrl({ text: "https://example.test/text", title: "https://example.test/title" })).toBe(
      "https://example.test/text",
    );
  });

  it("takes the first of several links", () => {
    expect(extractSharedUrl({ text: "https://example.test/one and https://example.test/two" })).toBe("https://example.test/one");
  });

  it("drops punctuation that ends the sentence", () => {
    expect(extractSharedUrl({ text: "Watch this: https://example.test/v." })).toBe("https://example.test/v");
    expect(extractSharedUrl({ text: "(see https://example.test/p)!" })).toBe("https://example.test/p");
    expect(extractSharedUrl({ text: "“https://example.test/q”," })).toBe("https://example.test/q");
  });

  it("keeps a closing bracket that belongs to the link", () => {
    expect(extractSharedUrl({ text: "https://en.wikipedia.test/wiki/Kangaroo_(film)" })).toBe(
      "https://en.wikipedia.test/wiki/Kangaroo_(film)",
    );
  });

  it("never returns a javascript: or data: URL", () => {
    expect(extractSharedUrl({ url: "javascript:alert(1)" })).toBeNull();
    expect(extractSharedUrl({ url: "data:text/html,<script>alert(1)</script>" })).toBeNull();
    expect(extractSharedUrl({ text: "JavaScript:alert(document.cookie)" })).toBeNull();
  });

  it("matches the scheme in any case", () => {
    expect(extractSharedUrl({ text: "HTTPS://Example.test/X" })).toBe("HTTPS://Example.test/X");
  });

  it("returns null when nothing shared holds a link", () => {
    expect(extractSharedUrl({ text: "no link" })).toBeNull();
    expect(extractSharedUrl({})).toBeNull();
    expect(extractSharedUrl({ url: "https://", text: "ftp://example.test/file" })).toBeNull();
  });
});
