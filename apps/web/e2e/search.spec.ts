import type { Page } from "@playwright/test";
import { expect, test } from "./fixtures";
import type { SeedLink } from "./seed";

const LINKS: SeedLink[] = [
  { url: "https://doc.rust-lang.org/rust-by-example/", resource: { title: "Rust by Example", kind: "page", fetchStatus: "fetched" } },
  { url: "https://www.youtube.com/watch?v=abc", resource: { title: "Tokyo night walk", kind: "video", fetchStatus: "fetched" } },
  { url: "https://www.seriouseats.com/curry", resource: { title: "Japanese curry", kind: "page", fetchStatus: "fetched" }, link: { pinned: true } },
];

const RUST = /^Rust by Example/;
const TOKYO = /^Tokyo night walk/;
const CURRY = /^Japanese curry/;

function row(page: Page, name: RegExp) {
  return page.getByRole("link", { name });
}

async function rowTitles(page: Page): Promise<string[]> {
  return page.locator("[data-row-link] span.line-clamp-2").allTextContents();
}

test.describe("at 1280 px", () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test("search finds a link by a title word and by its domain, and highlights the match", async ({ page, seedLinks }) => {
    await seedLinks(LINKS);
    await page.goto("/");
    await expect(row(page, RUST)).toBeVisible();
    const bar = page.getByRole("textbox", { name: "Search or paste a link" });

    await bar.fill("tokyo");
    await expect(page).toHaveURL(/[?&]q=tokyo/);
    await expect(page.getByRole("heading", { level: 1, name: "Search" })).toBeVisible();
    await expect(row(page, TOKYO)).toBeVisible();
    await expect(row(page, RUST)).toHaveCount(0);
    await expect(row(page, CURRY)).toHaveCount(0);
    await expect(row(page, TOKYO).locator("mark")).toHaveText("Tokyo");
    await expect(page.getByText("1 match", { exact: true })).toBeVisible();

    await bar.fill("seriouseats");
    await expect(row(page, CURRY)).toBeVisible();
    await expect(row(page, TOKYO)).toHaveCount(0);
    await expect(row(page, CURRY).locator("mark")).toHaveText("seriouseats");

    await page.getByRole("button", { name: "Clear search" }).click();
    await expect(page).not.toHaveURL(/q=/);
    await expect(row(page, RUST)).toBeVisible();
    await expect(page.getByRole("heading", { level: 1, name: "All links" })).toBeVisible();
  });

  test("a search that looks like a link stays a search when the page loads", async ({ page, seedLinks }) => {
    await seedLinks(LINKS);
    await page.goto("/?q=seriouseats.com");
    await expect(row(page, CURRY)).toBeVisible();
    await expect(row(page, RUST)).toHaveCount(0);
    await page.waitForTimeout(500);
    await expect(page).toHaveURL(/[?&]q=seriouseats\.com/);
    await expect(page.getByRole("textbox", { name: "Search or paste a link" })).toHaveValue("seriouseats.com");
    await expect(page.getByRole("button", { name: "Save link" })).toHaveCount(0);
  });

  test("searching from New covers every link", async ({ page, seedLinks }) => {
    await seedLinks(LINKS);
    await page.goto("/?view=inbox");
    await expect(row(page, RUST)).toBeVisible();
    await page.keyboard.press("/");
    await expect(page.getByRole("textbox", { name: "Search or paste a link" })).toBeFocused();
    await page.keyboard.type("curry");
    await expect(row(page, CURRY)).toBeVisible();
    await expect(row(page, RUST)).toHaveCount(0);
  });

  test("a kind or pinned filter narrows the list, and its chip removes it", async ({ page, seedLinks }) => {
    await seedLinks(LINKS);
    await page.goto("/");
    await expect(row(page, RUST)).toBeVisible();

    await page.getByRole("button", { name: "Filter", exact: true }).click();
    await page.getByRole("radio", { name: "Videos" }).check();
    await expect(page).toHaveURL(/kind=video/);
    await expect(row(page, TOKYO)).toBeVisible();
    await expect(row(page, RUST)).toHaveCount(0);
    await expect(row(page, CURRY)).toHaveCount(0);

    await page.getByRole("radio", { name: "Any" }).check();
    await page.getByRole("checkbox", { name: "Pinned only" }).check();
    await page.keyboard.press("Escape");
    await expect(row(page, CURRY)).toBeVisible();
    await expect(row(page, TOKYO)).toHaveCount(0);

    await page.getByRole("button", { name: "Remove filter: Pinned" }).click();
    await expect(row(page, TOKYO)).toBeVisible();
    await expect(page.getByRole("button", { name: "Clear all" })).toHaveCount(0);
  });

  test("sorting by title orders the list A to Z", async ({ page, seedLinks }) => {
    await seedLinks(LINKS);
    await page.goto("/");
    await expect(row(page, RUST)).toBeVisible();
    await page.getByRole("button", { name: "Sort: Newest" }).click();
    await page.getByRole("menuitemradio", { name: "Title A–Z" }).click();
    await expect(page).toHaveURL(/sort=title/);
    await expect.poll(() => rowTitles(page)).toEqual(["Japanese curry", "Rust by Example", "Tokyo night walk"]);
  });

  test("a search with no matches says so, and Clear search brings the list back", async ({ page, seedLinks }) => {
    await seedLinks(LINKS);
    await page.goto("/");
    await page.getByRole("textbox", { name: "Search or paste a link" }).fill("zebra");
    await expect(page.getByText("No links match “zebra”")).toBeVisible();
    await expect(page.getByRole("heading", { name: /Save your first link/ })).toHaveCount(0);
    await page.getByRole("button", { name: "Clear search" }).filter({ hasText: "Clear search" }).click();
    await expect(row(page, RUST)).toBeVisible();
    await expect(page.getByRole("textbox", { name: "Search or paste a link" })).toHaveValue("");
  });

  test("the search and filters live in the URL, survive a reload and step back with Back", async ({ page, seedLinks }) => {
    await seedLinks(LINKS);
    await page.goto("/?q=curry");
    await expect(row(page, CURRY)).toBeVisible();
    await page.getByRole("button", { name: "Filter", exact: true }).click();
    await page.getByRole("radio", { name: "Videos" }).check();
    await page.keyboard.press("Escape");
    await expect(page.getByText("No links match “curry”")).toBeVisible();

    await page.reload();
    await expect(page.getByRole("textbox", { name: "Search or paste a link" })).toHaveValue("curry");
    await expect(page.getByRole("button", { name: "Remove filter: Videos" })).toBeVisible();
    await expect(page.getByText("No links match “curry”")).toBeVisible();

    await page.goBack();
    await expect(page).not.toHaveURL(/kind=/);
    await expect(row(page, CURRY)).toBeVisible();
    await expect(page.getByRole("textbox", { name: "Search or paste a link" })).toHaveValue("curry");
  });
  test("Ctrl+K opens the command palette, which searches and goes to a view", async ({ page, seedLinks }) => {
    await seedLinks(LINKS);
    await page.goto("/");
    await expect(row(page, RUST)).toBeVisible();
    await expect(page.getByRole("search").filter({ visible: true }).locator("kbd")).toHaveText(/K$/);

    await page.keyboard.press("Control+k");
    const palette = page.getByRole("dialog", { name: "Command palette" });
    await page.keyboard.type("curry");
    await page.keyboard.press("Enter");
    await expect(palette).toBeHidden();
    await expect(row(page, CURRY)).toBeVisible();
    await expect(row(page, RUST)).toHaveCount(0);

    await page.keyboard.press("Control+k");
    await palette.getByRole("option", { name: "Go to New", exact: true }).click();
    await expect(page).toHaveURL(/view=inbox/);
    await expect(page).not.toHaveURL(/q=/);
    await expect(page.getByRole("heading", { level: 1, name: "New", exact: true })).toBeVisible();

    // Leave focus on the page without clicking: a click in the middle could land on a row and open its details.
    await expect(palette).toBeHidden();
    await page.evaluate(() => { (document.activeElement as HTMLElement | null)?.blur(); });
    await page.keyboard.press("?");
    await expect(page.getByRole("dialog", { name: "Keyboard shortcuts" })).toBeVisible();
  });
});

test.describe("at 375 px", () => {
  test.use({ viewport: { width: 375, height: 780 }, hasTouch: true });

  test("the phone search field searches, and filters never scroll the page sideways", async ({ page, seedLinks }, testInfo) => {
    await seedLinks(LINKS);
    await page.goto("/?kind=page&pinned=true&from=2026-01-01&to=2026-12-31");
    await expect(page.getByRole("button", { name: "Clear all" })).toBeVisible();
    await expect(page.getByRole("navigation", { name: "Links" }).getByRole("link", { name: "New", exact: true })).toBeVisible();
    const field = page.getByRole("searchbox", { name: "Search your links" });
    expect((await page.getByRole("search").filter({ visible: true }).locator("label").boundingBox())?.height).toBe(48);

    await page.getByRole("button", { name: "Clear all" }).click();
    await field.fill("tokyo");
    await expect(row(page, TOKYO)).toBeVisible();
    await expect(row(page, RUST)).toHaveCount(0);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBe(0);
    await page.goto("/?q=seriouseats.com");
    await page.reload();
    await expect(row(page, CURRY)).toBeVisible();
    await page.waitForTimeout(500);
    await expect(page).toHaveURL(/[?&]q=seriouseats\.com/);
    await expect(field).toHaveValue("seriouseats.com");
    await testInfo.attach("search-375", { body: await page.screenshot({ animations: "disabled" }), contentType: "image/png" });
  });
});
