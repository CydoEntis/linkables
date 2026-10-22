import { readFileSync } from "node:fs";
import { TITLE_MAX } from "@linkaroo/shared/links";
import { describe, expect, it } from "vitest";
import {
  DESCRIPTION_MAX,
  URL_MAX,
  extractHead,
  isYouTube,
  parseOEmbed,
  youTubeOEmbedUrl,
} from "./extract";

function fixture(name: string): string {
  return readFileSync(new URL(`./fixtures/${name}`, import.meta.url), "utf8");
}

describe("extractHead", () => {
  it("reads an article's og tags ahead of twitter and plain tags", () => {
    const head = extractHead(fixture("article.html"), "https://blog.example.com/posts/build-times");
    expect(head).toEqual({
      title: "How We Cut Build Times in Half",
      description: "Caching, parallelism and fewer dependencies.",
      favicon: "https://blog.example.com/favicon-32.png",
      thumbnail: "https://cdn.example.com/img/build-times.png",
      relCanonical: "https://blog.example.com/posts/build-times",
    });
  });

  it("reads a YouTube watch page head and decodes its entities", () => {
    const head = extractHead(fixture("youtube-watch.html"), "https://www.youtube.com/watch?v=dQw4w9WgXcQ");
    expect(head).toEqual({
      title: "Rick Astley - Never Gonna Give You Up (Official Video) (4K Remaster)",
      description: "The official video for “Never Gonna Give You Up” by Rick Astley.",
      favicon: "https://www.youtube.com/s/desktop/abc123/img/logos/favicon.ico",
      thumbnail: "https://i.ytimg.com/vi/dQw4w9WgXcQ/maxresdefault.jpg",
      relCanonical: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    });
  });

  it("reads a GitHub repo page, ignoring mask-icon", () => {
    const head = extractHead(fixture("github-repo.html"), "https://github.com/honojs/hono");
    expect(head).toEqual({
      title: "GitHub - honojs/hono: Web framework built on Web Standards",
      description:
        "Web framework built on Web Standards. Contribute to honojs/hono development by creating an account on GitHub.",
      favicon: "https://github.githubassets.com/favicons/favicon.png",
      thumbnail: "https://opengraph.githubassets.com/1/honojs/hono",
      relCanonical: "https://github.com/honojs/hono",
    });
  });

  it("reads a page with no head element", () => {
    const head = extractHead(fixture("no-head.html"), "https://example.com/dir/page");
    expect(head).toEqual({
      title: "Bare page",
      description: "No head or html tags at all.",
      favicon: "https://example.com/dir/icon.png",
      thumbnail: null,
      relCanonical: null,
    });
  });

  it("resolves relative and protocol-relative URLs against the base URL", () => {
    const head = extractHead(fixture("relative-icons.html"), "https://example.com/a/b/page.html");
    expect(head.favicon).toBe("https://example.com/a/b/img/favicon.ico");
    expect(head.thumbnail).toBe("https://cdn.example.com/og.png");
    expect(head.relCanonical).toBe("https://example.com/docs/page");
  });

  it("prefers rel=icon over apple-touch-icon and falls back to it", () => {
    const withIcon = extractHead(fixture("relative-icons.html"), "https://example.com/a/b/page.html");
    expect(withIcon.favicon).toBe("https://example.com/a/b/img/favicon.ico");
    const touchOnly = extractHead('<link rel="apple-touch-icon" href="/touch.png">', "https://example.com/");
    expect(touchOnly.favicon).toBe("https://example.com/touch.png");
  });

  it("returns null for javascript: and data: image, icon and canonical URLs", () => {
    const head = extractHead(fixture("unsafe-urls.html"), "https://example.com/");
    expect(head.thumbnail).toBeNull();
    expect(head.favicon).toBeNull();
    expect(head.relCanonical).toBeNull();
  });

  it("skips an unsafe og:image and uses the next safe candidate", () => {
    const html =
      '<meta property="og:image" content="javascript:alert(1)"><meta name="twitter:image" content="/t.png">';
    expect(extractHead(html, "https://example.com/").thumbnail).toBe("https://example.com/t.png");
  });

  it("does not guess /favicon.ico when the page declares no icon", () => {
    expect(extractHead("<title>x</title>", "https://example.com/").favicon).toBeNull();
  });

  it("decodes entities and collapses whitespace in the title", () => {
    const head = extractHead("<title>\n  Tom &amp; Jerry&#39;s   &lt;Show&gt; &copy;\n</title>", "https://example.com/");
    expect(head.title).toBe("Tom & Jerry's <Show> ©");
  });

  it("uses the first non-empty og:title when there are several", () => {
    const html =
      '<meta property="og:title" content="  "><meta property="og:title" content="First"><meta property="og:title" content="Second">';
    expect(extractHead(html, "https://example.com/").title).toBe("First");
  });

  it("falls back from og:title to twitter:title to the title element", () => {
    const twitter = '<title>Plain</title><meta name="twitter:title" content="Twitter">';
    expect(extractHead(twitter, "https://example.com/").title).toBe("Twitter");
    expect(extractHead("<title>Plain</title>", "https://example.com/").title).toBe("Plain");
  });

  it("ignores an SVG title in the body", () => {
    const html = "<body><svg><title>Icon</title></svg></body>";
    expect(extractHead(html, "https://example.com/").title).toBeNull();
  });

  it("caps a huge title and description", () => {
    const html = `<title>${"a".repeat(100_000)}</title><meta name="description" content="${"b".repeat(100_000)}">`;
    const head = extractHead(html, "https://example.com/");
    expect(head.title).toHaveLength(TITLE_MAX);
    expect(head.description).toHaveLength(DESCRIPTION_MAX);
  });

  it("does not split a surrogate pair when capping", () => {
    const html = `<title>${"a".repeat(TITLE_MAX - 1)}\u{1F600}</title>`;
    expect(extractHead(html, "https://example.com/").title).toBe(`${"a".repeat(TITLE_MAX - 1)}\u{1F600}`);
    const over = `<title>${"a".repeat(TITLE_MAX)}\u{1F600}</title>`;
    expect(extractHead(over, "https://example.com/").title).toBe("a".repeat(TITLE_MAX));
  });

  it("drops a URL longer than the cap instead of truncating it", () => {
    const html = `<meta property="og:image" content="https://example.com/${"a".repeat(URL_MAX)}">`;
    expect(extractHead(html, "https://example.com/").thumbnail).toBeNull();
  });

  it("does not read a meta tag written inside a script", () => {
    const html = `<script>document.write('<meta property="og:title" content="Injected">')</script><title>Real</title>`;
    expect(extractHead(html, "https://example.com/").title).toBe("Real");
  });

  it("keeps the text of a title cut off by the fetcher's size cap", () => {
    expect(extractHead("<head><title>Truncated ti", "https://example.com/").title).toBe("Truncated ti");
  });

  it("handles a 512 KB page of nested elements in linear time", () => {
    const html = `<title>Deep</title>${"<div>".repeat(512 * 1024 / 5)}`;
    const started = performance.now();
    expect(extractHead(html, "https://example.com/").title).toBe("Deep");
    expect(performance.now() - started).toBeLessThan(1000);
  });

  it("handles meta and link tags with 80k attributes each in linear time", () => {
    const filler = Array.from({ length: 80_000 }, (_, i) => `x${i.toString(36)}`).join(" ");
    const html = `<meta property="og:title" content="Kept" ${filler}><link rel=icon href=/i.png ${filler}>`;
    const started = performance.now();
    const head = extractHead(html, "https://example.com/");
    expect(performance.now() - started).toBeLessThan(1000);
    expect(head.title).toBe("Kept");
    expect(head.favicon).toBe("https://example.com/i.png");
  });

  it("reads tags after an unclosed svg or math element", () => {
    const html = '<svg><circle><meta property="og:title" content="After svg"><math><link rel="icon" href="/i.png">';
    const head = extractHead(html, "https://example.com/");
    expect(head.title).toBe("After svg");
    expect(head.favicon).toBe("https://example.com/i.png");
  });

  it("ignores tags inside a template", () => {
    const html = '<template><meta property="og:title" content="Template"><title>X</title></template><title>Real</title>';
    expect(extractHead(html, "https://example.com/").title).toBe("Real");
  });

  it("reads tags inside noscript", () => {
    const html = '<noscript><meta property="og:image" content="/n.png"></noscript>';
    expect(extractHead(html, "https://example.com/").thumbnail).toBe("https://example.com/n.png");
  });

  it("strips control characters and bidi overrides from text", () => {
    const html = '<title>a\u0000b&#1;c&#x202E;d\u2066e</title><meta name="description" content="x&#x7F;\u0085y">';
    const head = extractHead(html, "https://example.com/");
    expect(head.title).toBe("a\uFFFDbcde");
    expect(head.description).toBe("xy");
  });

  it("returns all nulls for empty input", () => {
    expect(extractHead("", "https://example.com/")).toEqual({
      title: null,
      description: null,
      favicon: null,
      thumbnail: null,
      relCanonical: null,
    });
  });
});

describe("isYouTube", () => {
  it.each([
    "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    "https://m.youtube.com/watch?v=dQw4w9WgXcQ",
    "https://youtube.com/watch?v=dQw4w9WgXcQ&t=42",
    "https://www.youtube.com:443/watch?v=dQw4w9WgXcQ",
  ])("is true for the watch URL %s", (url) => {
    expect(isYouTube(url)).toBe(true);
  });

  it.each([
    ["a channel", "https://www.youtube.com/@RickAstleyYT"],
    ["a legacy channel", "https://www.youtube.com/channel/UCuAXFkgsw1L7xaCfnd5JJOw"],
    ["a playlist", "https://www.youtube.com/playlist?list=PLFgquLnL59alCl_2TQvOiD5Vgm1hCaGSI"],
    ["a watch URL without v", "https://www.youtube.com/watch"],
    ["a watch URL with empty v", "https://www.youtube.com/watch?v="],
    ["a URL with userinfo", "https://user:pw@www.youtube.com/watch?v=dQw4w9WgXcQ"],
    ["a non-default port", "https://www.youtube.com:8443/watch?v=dQw4w9WgXcQ"],
    ["a non-http scheme", "ftp://www.youtube.com/watch?v=dQw4w9WgXcQ"],
    ["an invalid video id", "https://www.youtube.com/watch?v=dQw4%20w9WgXcQ"],
    ["an uncanonicalised short", "https://www.youtube.com/shorts/dQw4w9WgXcQ"],
    ["a youtu.be link", "https://youtu.be/dQw4w9WgXcQ"],
    ["a look-alike host", "https://www.youtube.com.evil.example/watch?v=dQw4w9WgXcQ"],
    ["an invalid URL", "not a url"],
  ])("is false for %s", (_label, url) => {
    expect(isYouTube(url)).toBe(false);
  });
});

describe("youTubeOEmbedUrl", () => {
  it("builds the JSON oEmbed endpoint with the URL encoded", () => {
    expect(youTubeOEmbedUrl("https://www.youtube.com/watch?v=dQw4w9WgXcQ")).toBe(
      "https://www.youtube.com/oembed?url=https%3A%2F%2Fwww.youtube.com%2Fwatch%3Fv%3DdQw4w9WgXcQ&format=json",
    );
  });
});

describe("parseOEmbed", () => {
  const valid = {
    title: "Rick Astley - Never Gonna Give You Up (Official Video) (4K Remaster)",
    author_name: "Rick Astley",
    author_url: "https://www.youtube.com/@RickAstleyYT",
    type: "video",
    height: 113,
    width: 200,
    version: "1.0",
    provider_name: "YouTube",
    provider_url: "https://www.youtube.com/",
    thumbnail_height: 360,
    thumbnail_width: 480,
    thumbnail_url: "https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg",
    html: "<iframe></iframe>",
  };

  it("returns title, author and thumbnail from a valid response", () => {
    expect(parseOEmbed(valid)).toEqual({
      ok: true,
      data: {
        title: "Rick Astley - Never Gonna Give You Up (Official Video) (4K Remaster)",
        author: "Rick Astley",
        thumbnail: "https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg",
      },
    });
  });

  it("returns null author and thumbnail when they are missing", () => {
    expect(parseOEmbed({ title: "Only a title" })).toEqual({
      ok: true,
      data: { title: "Only a title", author: null, thumbnail: null },
    });
  });

  it("returns a null author and thumbnail when they are not strings", () => {
    expect(parseOEmbed({ ...valid, author_name: 42, thumbnail_url: { url: "x" } })).toEqual({
      ok: true,
      data: { title: valid.title, author: null, thumbnail: null },
    });
  });

  it("strips control characters and bidi overrides", () => {
    const result = parseOEmbed({ ...valid, title: "a\u0000b\u202Ec", author_name: "Ri\u2066ck\u0007" });
    expect(result.ok && result.data).toMatchObject({ title: "abc", author: "Rick" });
  });

  it("strips lone surrogates", () => {
    const result = parseOEmbed({ ...valid, title: "a\uD800b\uDFFFc" });
    expect(result.ok && result.data.title).toBe("abc");
  });

  it("returns a null thumbnail for a non-http URL", () => {
    const result = parseOEmbed({ ...valid, thumbnail_url: "javascript:alert(1)" });
    expect(result.ok && result.data.thumbnail).toBeNull();
  });

  it("caps a huge title", () => {
    const result = parseOEmbed({ ...valid, title: "a".repeat(100_000) });
    expect(result.ok && result.data.title).toHaveLength(TITLE_MAX);
  });

  it.each([
    ["null", null],
    ["a string", "Not Found"],
    ["an array", [valid]],
    ["a missing title", { author_name: "Rick Astley" }],
    ["a non-string title", { title: 42 }],
    ["a blank title", { title: "   " }],
  ])("returns a malformed failure for %s", (_label, json) => {
    expect(parseOEmbed(json)).toEqual({ ok: false, reason: "malformed" });
  });
});
