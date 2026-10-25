import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import type { Locator, Page } from "@playwright/test";
import type { Db } from "../../api/src/db/client";
import { resourceReader } from "../../api/src/db/schema";
import { extractArticle } from "../../api/src/reader/extract-article";
import { API_URL } from "./env";
import { expect, test } from "./fixtures";
import { seedLinks as seedLinksFor } from "./seed";

const ARTICLE_URL = "https://blog.example.com/posts/build-times?utm_source=me";
const ARTICLE = { url: ARTICLE_URL, resource: { title: "Build times", kind: "page" as const, fetchStatus: "fetched" as const } };
const VIDEO = { url: "https://www.youtube.com/watch?v=tokyo", resource: { title: "Tokyo night walk", kind: "video" as const, fetchStatus: "fetched" as const } };

// The e2e API cannot fetch the fixture page: the SSRF guard refuses loopback
// addresses, rightly. So the API's own extractor reads the fixture here and the
// copy is stored as the API would store it, and the API serves it from there.
async function storeReadableCopy(db: Db, resourceId: string) {
  const html = readFileSync(new URL("../../api/src/reader/fixtures/article.html", import.meta.url), "utf8");
  const article = extractArticle(html, "https://blog.example.com/posts/build-times");
  if (article === null) throw new Error("the article fixture has no article");
  await db.insert(resourceReader).values({ resourceId, status: "ok", article });
}

function panel(page: Page) {
  return page.getByRole("region", { name: "Link details" });
}

function bodyText(page: Page) {
  return page.getByRole("article").getByText(/^Our continuous integration pipeline/);
}

function cssOf(locator: Locator, property: string) {
  return locator.evaluate((element, name) => getComputedStyle(element).getPropertyValue(name), property);
}

test.describe("at 1280 px", () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test("Read opens the saved article in the reader, and Back returns to its details", async ({ page, db, seedLinks }) => {
    const [link] = await seedLinks([ARTICLE]);
    await storeReadableCopy(db, link?.resourceId ?? "");
    await page.goto("/");
    await page.getByRole("link", { name: /^Build times/ }).click();
    await panel(page).getByRole("group", { name: "Actions" }).getByRole("link", { name: "Read" }).click();

    await expect(page).toHaveURL(new RegExp(`/l/${link?.id ?? ""}/read$`));
    await expect(page.getByRole("heading", { level: 1, name: "How We Cut Build Times in Half" })).toBeVisible();
    await expect(page.getByRole("banner").getByText("Example Engineering · 1 min read")).toBeVisible();
    await expect(page.getByText("Ada Lovelace · 1 min read")).toBeVisible();
    await expect(page.getByRole("heading", { level: 2, name: "Caching dependencies" })).toBeVisible();
    await expect(page.getByRole("link", { name: "timing guide" })).toHaveAttribute("href", "https://blog.example.com/docs/timing?ref=post#steps");
    await expect(page.getByRole("img", { name: "Build time before and after" })).toHaveAttribute("referrerpolicy", "no-referrer");
    await expect(page.getByRole("link", { name: /Open original/ })).toHaveAttribute("href", ARTICLE_URL);
    await expect(page.locator("main script, main iframe")).toHaveCount(0);
    expect(await cssOf(bodyText(page), "font-family")).toContain("Newsreader");

    await page.getByRole("button", { name: "Back" }).click();
    await expect(panel(page).getByRole("heading", { name: /Build times/ })).toBeVisible();
  });

  test("the article ends with Pin, Share and Back to my links", async ({ page, db, seedLinks }) => {
    const [link] = await seedLinks([ARTICLE]);
    await storeReadableCopy(db, link?.resourceId ?? "");
    await page.goto(`/l/${link?.id ?? ""}/read`);
    const end = page.getByRole("article");

    await end.getByRole("button", { name: "Pin" }).click();
    await expect(end.getByRole("button", { name: "Pinned" })).toHaveAttribute("aria-pressed", "true");
    await end.getByRole("link", { name: "Back to my links" }).click();
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole("link", { name: /^Build times/ })).toBeVisible();
  });

  test("the text size steps through 17, 19 and 22 px and is remembered", async ({ page, db, seedLinks }) => {
    const [link] = await seedLinks([ARTICLE]);
    await storeReadableCopy(db, link?.resourceId ?? "");
    await page.goto(`/l/${link?.id ?? ""}/read`);
    const sizes = page.getByRole("group", { name: "Text size" });
    await expect(sizes.getByRole("button", { name: "Default text" })).toHaveAttribute("aria-pressed", "true");
    await expect.poll(() => cssOf(bodyText(page), "font-size")).toBe("19px");

    await sizes.getByRole("button", { name: "Smaller text" }).click();
    await expect.poll(() => cssOf(bodyText(page), "font-size")).toBe("17px");
    await sizes.getByRole("button", { name: "Larger text" }).click();
    await expect.poll(() => cssOf(bodyText(page), "font-size")).toBe("22px");
    expect(await cssOf(page.getByRole("article"), "max-width")).toBe("760px");

    await page.reload();
    await expect(sizes.getByRole("button", { name: "Larger text" })).toHaveAttribute("aria-pressed", "true");
    await expect.poll(() => cssOf(bodyText(page), "font-size")).toBe("22px");
  });

  test("says it is getting the article while the copy loads", async ({ page, db, seedLinks }) => {
    const [link] = await seedLinks([ARTICLE]);
    await storeReadableCopy(db, link?.resourceId ?? "");
    let release = () => {};
    const held = new Promise<void>((resolve) => { release = resolve; });
    await page.route(`${API_URL}/api/v1/links/${link?.id ?? ""}/reader`, async (route) => {
      await held;
      await route.fallback();
    });
    await page.goto(`/l/${link?.id ?? ""}/read`);

    await expect(page.getByRole("status")).toContainText("Getting the article…");
    release();
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByText("Getting the article…")).toHaveCount(0);
  });

  test("a video has no Read action, and its reader address says reader view isn't available", async ({ page, seedLinks }) => {
    const [video] = await seedLinks([VIDEO]);
    await page.goto(`/?link=${video?.id ?? ""}`);
    await expect(panel(page).getByRole("heading", { name: /Tokyo night walk/ })).toBeVisible();
    await expect(panel(page).getByRole("link", { name: "Read" })).toHaveCount(0);

    await page.goto(`/l/${video?.id ?? ""}/read`);
    await expect(page.getByText("Reader view isn't available for this page")).toBeVisible();
    await expect(page.getByText("It's a video, it's behind a paywall, or there's no article on it to pull out.")).toBeVisible();
    await expect(page.getByRole("main").getByRole("link", { name: /^Open original/ })).toHaveAttribute("href", VIDEO.url);

    await page.getByRole("button", { name: "Back" }).click();
    await expect(page).toHaveURL(/\/\?link=/);
  });

  test("another user's link reads as not found", async ({ page, db }) => {
    const [theirs] = await seedLinksFor(db, randomUUID(), [ARTICLE]);
    await page.goto(`/l/${theirs?.id ?? ""}/read`);
    await expect(page.getByText("Couldn't find this link")).toBeVisible();
  });
});

test.describe("at 390 px", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("the reader fits a phone without sideways scrolling, at phone text sizes", async ({ page, db, seedLinks }) => {
    const [link] = await seedLinks([ARTICLE]);
    await storeReadableCopy(db, link?.resourceId ?? "");
    await page.goto(`/l/${link?.id ?? ""}/read`);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect.poll(() => cssOf(bodyText(page), "font-size")).toBe("18px");
    await page.getByRole("group", { name: "Text size" }).getByRole("button", { name: "Larger text" }).click();
    await expect.poll(() => cssOf(bodyText(page), "font-size")).toBe("20px");

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBe(0);
  });
});
