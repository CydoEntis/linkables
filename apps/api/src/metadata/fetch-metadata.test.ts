import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import { fetchMetadata, type Fetchers } from "./fetch-metadata";
import { FetchError } from "./fetcher";

const VIDEO_URL = "https://www.youtube.com/watch?v=dQw4w9WgXcQ";
const ARTICLE_URL = "https://blog.example.com/posts/build-times";

function stubFetchers(overrides: Partial<Fetchers> = {}): Fetchers {
  return {
    fetchHtml: vi.fn<Fetchers["fetchHtml"]>().mockRejectedValue(new Error("fetchHtml not expected")),
    fetchJson: vi.fn<Fetchers["fetchJson"]>().mockRejectedValue(new Error("fetchJson not expected")),
    ...overrides,
  };
}

const articleHtml = readFileSync(new URL("./fixtures/article.html", import.meta.url), "utf8");

describe("fetchMetadata", () => {
  it("reads a page's head into a page resource", async () => {
    const fetchHtml = vi.fn<Fetchers["fetchHtml"]>().mockResolvedValue({
      url: `${ARTICLE_URL}?final`,
      contentType: "text/html",
      html: articleHtml,
    });

    const outcome = await fetchMetadata(ARTICLE_URL, stubFetchers({ fetchHtml }));

    expect(fetchHtml).toHaveBeenCalledWith(ARTICLE_URL);
    expect(outcome).toEqual({
      ok: true,
      update: {
        title: "How We Cut Build Times in Half",
        description: "Caching, parallelism and fewer dependencies.",
        author: null,
        faviconUrl: "https://blog.example.com/favicon-32.png",
        thumbnailUrl: "https://cdn.example.com/img/build-times.png",
        relCanonicalUrl: ARTICLE_URL,
        finalUrl: `${ARTICLE_URL}?final`,
        contentType: "text/html",
        kind: "page",
      },
    });
  });

  it("records a non-html response as kind other with its content type and no title", async () => {
    const fetchHtml = vi
      .fn<Fetchers["fetchHtml"]>()
      .mockResolvedValue({ url: "https://example.com/doc.pdf", contentType: "application/pdf", html: null });

    const outcome = await fetchMetadata("https://example.com/doc.pdf", stubFetchers({ fetchHtml }));

    expect(outcome).toMatchObject({
      ok: true,
      update: { title: null, contentType: "application/pdf", kind: "other", finalUrl: "https://example.com/doc.pdf" },
    });
  });

  it("reads a YouTube video through oEmbed as kind video", async () => {
    const fetchJson = vi.fn<Fetchers["fetchJson"]>().mockResolvedValue({
      title: "Never Gonna Give You Up",
      author_name: "Rick Astley",
      thumbnail_url: "https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg",
    });
    const fetchers = stubFetchers({ fetchJson });

    const outcome = await fetchMetadata(VIDEO_URL, fetchers);

    expect(fetchJson).toHaveBeenCalledWith(`https://www.youtube.com/oembed?url=${encodeURIComponent(VIDEO_URL)}&format=json`);
    expect(fetchers.fetchHtml).not.toHaveBeenCalled();
    expect(outcome).toEqual({
      ok: true,
      update: {
        title: "Never Gonna Give You Up",
        description: null,
        author: "Rick Astley",
        faviconUrl: null,
        thumbnailUrl: "https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg",
        relCanonicalUrl: null,
        finalUrl: VIDEO_URL,
        contentType: null,
        kind: "video",
      },
    });
  });

  it("fails with http_status when oEmbed answers non-2xx", async () => {
    const fetchJson = vi.fn<Fetchers["fetchJson"]>().mockRejectedValue(new FetchError("http_status", "unexpected status 401"));

    expect(await fetchMetadata(VIDEO_URL, stubFetchers({ fetchJson }))).toEqual({ ok: false, reason: "http_status" });
  });

  it("fails with parse_failed when the oEmbed body has no title", async () => {
    const fetchJson = vi.fn<Fetchers["fetchJson"]>().mockResolvedValue({ author_name: "x" });

    expect(await fetchMetadata(VIDEO_URL, stubFetchers({ fetchJson }))).toEqual({ ok: false, reason: "parse_failed" });
  });

  it("fails with the fetch error's reason, never its message", async () => {
    const fetchHtml = vi
      .fn<Fetchers["fetchHtml"]>()
      .mockRejectedValue(new FetchError("blocked", "example.com resolves to blocked address 10.0.0.1"));

    expect(await fetchMetadata(ARTICLE_URL, stubFetchers({ fetchHtml }))).toEqual({ ok: false, reason: "blocked" });
  });

  it("propagates an error that is not a fetch failure", async () => {
    const fetchHtml = vi.fn<Fetchers["fetchHtml"]>().mockRejectedValue(new TypeError("bug"));

    await expect(fetchMetadata(ARTICLE_URL, stubFetchers({ fetchHtml }))).rejects.toThrow("bug");
  });
});
