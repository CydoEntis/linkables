import { READER_BLOCKS_MAX, READER_TEXT_MAX } from "@linkables/shared/reader";
import { parseHTML } from "linkedom";
import { describe, expect, it } from "vitest";
import { toBlocks, type PageNode } from "./to-blocks";

const PAGE_URL = "https://example.com/blog/post";

function convert(body: string) {
  const { document } = parseHTML(`<html><body><div id="root">${body}</div></body></html>`);
  return toBlocks(document.getElementById("root") as unknown as PageNode, PAGE_URL);
}

describe("toBlocks", () => {
  it.each([
    ["javascript:alert(1)"],
    ["JAVASCRIPT:alert(1)"],
    [" javascript:alert(1)"],
    ["data:text/html,<script>alert(1)</script>"],
    ["vbscript:msgbox(1)"],
    ["mailto:a@example.com"],
  ])("keeps the text of a link to %s but not the link", (href) => {
    const { blocks } = convert(`<p>Read <a href="${href}">this</a> now.</p>`);
    expect(blocks).toEqual([{ type: "paragraph", content: [{ text: "Read this now." }] }]);
  });

  it("resolves a relative link against the page", () => {
    const { blocks } = convert(`<p><a href="../about">About</a></p>`);
    expect(blocks).toEqual([{ type: "paragraph", content: [{ text: "About", href: "https://example.com/about" }] }]);
  });

  it("drops an image that is not http(s)", () => {
    expect(convert(`<img src="data:image/png;base64,AAAA" alt="pixel"><img alt="no source">`).blocks).toEqual([]);
  });

  it("keeps an image wrapped in a link", () => {
    const { blocks } = convert(`<a href="/big.png"><img src="/small.png" alt="Chart"></a>`);
    expect(blocks).toEqual([{ type: "image", src: "https://example.com/small.png", alt: "Chart", caption: null }]);
  });

  it("never reads script, style, iframe, svg or form content", () => {
    const { blocks } = convert(
      `<p>Kept<script>bad()</script><style>.x{}</style></p><iframe src="https://x.example/"></iframe>` +
        `<svg><text>vector</text></svg><form><button>Pay</button></form>`,
    );
    expect(blocks).toEqual([{ type: "paragraph", content: [{ text: "Kept" }] }]);
  });

  it("keeps line breaks and nested marks inside a paragraph", () => {
    const { blocks } = convert(`<p>  Roses <b>are <i>red</i></b><br>  violets   are blue </p>`);
    expect(blocks).toEqual([
      {
        type: "paragraph",
        content: [
          { text: "Roses " },
          { text: "are ", bold: true },
          { text: "red", bold: true, italic: true },
          { text: "\nviolets are blue" },
        ],
      },
    ]);
  });

  it("reads loose text between blocks as paragraphs", () => {
    const { blocks } = convert(`Intro <em>text</em><h2>Title</h2>Outro`);
    expect(blocks).toEqual([
      { type: "paragraph", content: [{ text: "Intro " }, { text: "text", italic: true }] },
      { type: "heading", level: 2, content: [{ text: "Title" }] },
      { type: "paragraph", content: [{ text: "Outro" }] },
    ]);
  });

  it("strips bidi overrides and control characters from text", () => {
    const { blocks } = convert(`<p>safe‮txt.exe\u0007</p>`);
    expect(blocks).toEqual([{ type: "paragraph", content: [{ text: "safetxt.exe" }] }]);
  });

  it("stops at the text cap and says the article was cut short", () => {
    const paragraph = `<p>${"word ".repeat(2_000)}</p>`;
    const { blocks, truncated } = convert(paragraph.repeat(Math.ceil(READER_TEXT_MAX / 10_000) + 2));
    expect(truncated).toBe(true);
    expect(blocks.length).toBeLessThan(READER_TEXT_MAX / 9_000);
  });

  it("stops at the block cap", () => {
    const { blocks, truncated } = convert("<p>x</p>".repeat(READER_BLOCKS_MAX + 5));
    expect(blocks).toHaveLength(READER_BLOCKS_MAX);
    expect(truncated).toBe(true);
  });
});
