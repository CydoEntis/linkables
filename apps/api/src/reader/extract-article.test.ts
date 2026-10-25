import { readFileSync } from "node:fs";
import { readerArticleSchema } from "@linkables/shared/reader";
import { describe, expect, it } from "vitest";
import { extractArticle } from "./extract-article";

const PAGE_URL = "https://blog.example.com/posts/build-times";

function fixture(name: string): string {
  return readFileSync(new URL(`./fixtures/${name}`, import.meta.url), "utf8");
}

const text = (value: string) => [{ text: value }];

describe("extractArticle", () => {
  it("turns an article page into reader blocks", () => {
    const article = extractArticle(fixture("article.html"), PAGE_URL);

    expect(article).toMatchObject({
      title: "How We Cut Build Times in Half",
      byline: "Ada Lovelace",
      siteName: "Example Engineering",
      minutes: 1,
      truncated: false,
    });
    expect(article?.blocks.map((block) => block.type)).toEqual([
      "paragraph", "paragraph", "heading", "paragraph", "image", "heading", "list", "heading", "paragraph", "code",
      "quote", "list", "paragraph",
    ]);
    expect(article?.blocks.slice(2, 8)).toEqual([
      { type: "heading", level: 2, content: text("Caching dependencies") },
      {
        type: "paragraph",
        content: [
          { text: expect.stringMatching(/^We cached .* The command we run is $/) as unknown },
          { text: "pnpm install --frozen-lockfile", code: true },
          { text: ", and it never touches the network on a warm cache." },
        ],
      },
      {
        type: "image",
        src: "https://blog.example.com/img/build-chart.png",
        alt: "Build time before and after",
        caption: "Median build time over twelve weeks.",
      },
      { type: "heading", level: 3, content: text("What we cached") },
      {
        type: "list",
        ordered: false,
        items: [
          text("The package store, keyed on the lockfile."),
          text("Compiled test fixtures, keyed on their sources."),
          text("Browser binaries for the end-to-end suite."),
        ],
      },
      { type: "heading", level: 2, content: text("Splitting the tests") },
    ]);
    expect(article?.blocks.slice(9, 11)).toEqual([
      { type: "code", text: "shards: 4\nsplit: duration" },
      { type: "quote", paragraphs: [text("The fastest build is the one you never run.")] },
    ]);
  });

  it("keeps bold, italic and links resolved against the page", () => {
    const [first, second] = extractArticle(fixture("article.html"), PAGE_URL)?.blocks ?? [];

    expect(first).toMatchObject({ content: [{}, { text: "halve the build time", bold: true }, {}] });
    expect(second).toMatchObject({
      content: [
        {},
        { text: "dependency installation", italic: true },
        {},
        { text: "timing guide", href: "https://blog.example.com/docs/timing?ref=post#steps" },
        { text: " for the details, or skip the tracking link entirely." },
      ],
    });
  });

  it("leaves out scripts, styles, iframes, event handlers and javascript: links", () => {
    const stored = JSON.stringify(extractArticle(fixture("article.html"), PAGE_URL));

    for (const unsafe of ["injected", "window.track", "color: red", "ads.example.net", "onerror", "alert", "javascript:"]) {
      expect(stored).not.toContain(unsafe);
    }
  });

  it("finds no article on a sign-in page", () => {
    expect(extractArticle(fixture("no-article.html"), "https://app.example.com/sign-in")).toBeNull();
  });

  it("finds no article in an empty document", () => {
    expect(extractArticle("", PAGE_URL)).toBeNull();
  });

  it("gives an article the reader contract accepts", () => {
    expect(readerArticleSchema.safeParse(extractArticle(fixture("article.html"), PAGE_URL)).success).toBe(true);
  });
});
