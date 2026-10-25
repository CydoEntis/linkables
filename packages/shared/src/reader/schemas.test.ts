import { describe, expect, it } from "vitest";
import { readerBlockSchema } from "./schemas";

describe("readerBlockSchema", () => {
  it("accepts a paragraph whose link is https", () => {
    const block = { type: "paragraph", content: [{ text: "docs", href: "https://example.com/docs" }] };
    expect(readerBlockSchema.parse(block)).toEqual(block);
  });

  it.each(["javascript:alert(1)", "data:text/html,hi", "/relative"])("refuses a link to %s", (href) => {
    expect(readerBlockSchema.safeParse({ type: "paragraph", content: [{ text: "x", href }] }).success).toBe(false);
  });

  it("refuses an image that is not http(s)", () => {
    const block = { type: "image", src: "data:image/png;base64,AAAA", alt: null, caption: null };
    expect(readerBlockSchema.safeParse(block).success).toBe(false);
  });

  it("refuses a block it does not know, such as raw html", () => {
    expect(readerBlockSchema.safeParse({ type: "html", html: "<script></script>" }).success).toBe(false);
  });
});
