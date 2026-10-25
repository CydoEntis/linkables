import { describe, expect, it } from "vitest";
import { LANDING_PAGE, PRIVACY_PAGE, SUPPORT_PAGE, TERMS_PAGE } from "./pages";
import { renderMarketingFiles } from "./render-pages";

const ASSETS = { stylesheets: ["/assets/index-abc.css"], entry: "/assets/index-abc.js" };
const files = renderMarketingFiles(ASSETS);

function parsed(file: string): Document {
  const found = files.find((output) => output.file === file);
  if (!found) throw new Error(`${file} was not rendered`);
  return new DOMParser().parseFromString(found.contents, "text/html");
}

const meta = (doc: Document, selector: string) => doc.querySelector(selector)?.getAttribute("content");

describe.each([LANDING_PAGE, PRIVACY_PAGE, TERMS_PAGE, SUPPORT_PAGE])("$path", (page) => {
  const doc = parsed(page.file);

  it("has its own title and description, short enough for search results", () => {
    expect(doc.title).toBe(page.title);
    expect(page.title.length).toBeLessThanOrEqual(60);
    expect(meta(doc, "meta[name=description]")).toBe(page.description);
    expect(page.description.length).toBeLessThanOrEqual(155);
  });

  it("names its canonical address on linkables.app", () => {
    const url = `https://linkables.app${page.path}`;
    expect(doc.querySelector("link[rel=canonical]")?.getAttribute("href")).toBe(url);
    expect(meta(doc, "meta[property='og:url']")).toBe(url);
  });

  it("has a link preview for social apps", () => {
    expect(meta(doc, "meta[property='og:title']")).toBe(page.title);
    expect(meta(doc, "meta[property='og:image']")).toBe("https://linkables.app/social/linkables.png");
    expect(meta(doc, "meta[name='twitter:card']")).toBe("summary_large_image");
  });

  it("is open to search engines and has one h1", () => {
    expect(doc.querySelector("meta[name=robots]")).toBeNull();
    expect(doc.querySelectorAll("h1")).toHaveLength(1);
  });

  it("links the built stylesheet", () => {
    expect(doc.querySelector("link[rel=stylesheet]")?.getAttribute("href")).toBe(ASSETS.stylesheets[0]);
  });
});

it("renders the landing page content into the HTML", () => {
  expect(parsed(LANDING_PAGE.file).querySelector("h1")?.textContent).toBe("Never lose a link again.");
});

it("lets only the landing page load the app, for signed-in users", () => {
  expect(parsed(LANDING_PAGE.file).head.querySelector("script")?.textContent).toContain(ASSETS.entry);
  expect(parsed(PRIVACY_PAGE.file).documentElement.innerHTML).not.toContain(ASSETS.entry);
});

it("lists the public pages in the sitemap", () => {
  const sitemap = files.find((output) => output.file === "sitemap.xml")?.contents ?? "";
  const locs = [...sitemap.matchAll(/<loc>(.+?)<\/loc>/g)].map((match) => match[1]);
  expect(locs).toEqual(["https://linkables.app/", "https://linkables.app/privacy", "https://linkables.app/terms", "https://linkables.app/support"]);
});
