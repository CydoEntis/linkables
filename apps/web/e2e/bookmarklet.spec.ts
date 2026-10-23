import type { BrowserContext, Page, TestInfo } from "@playwright/test";
import type { Db } from "../../api/src/db/client";
import { WEB_URL } from "./env";
import { expect, test } from "./fixtures";
import type { TestUser } from "./session";

declare global {
  interface Window {
    closeCalls?: number;
  }
}

const ARTICLE = "https://news.example.test/story one?a=1&b=2#part";
const POPUP = { width: 420, height: 640 };

async function savedUrls(db: Db, user: TestUser): Promise<string[]> {
  const rows = await db.$client<{ original_url: string }[]>`select original_url from saved_link where user_id = ${user.id}`;
  return rows.map((row) => row.original_url);
}

// Counts window.close() calls in every page of the context, popups included.
async function stubWindowClose(context: BrowserContext) {
  await context.addInitScript(() => {
    window.closeCalls = 0;
    window.close = () => { window.closeCalls = (window.closeCalls ?? 0) + 1; };
  });
}

// Kept in test-results after a passing run, so the screens can be looked at.
async function shot(page: Page, testInfo: TestInfo, name: string) {
  await page.screenshot({ path: testInfo.outputPath(`${name}.png`), animations: "disabled" });
}

async function openBookmarkletDialog(page: Page) {
  await page.goto("/");
  await page.getByRole("button", { name: "Account" }).click();
  await page.getByRole("menuitem", { name: "Get the bookmark button" }).click();
  const dialog = page.getByRole("dialog", { name: "Get the bookmark button" });
  await expect(dialog).toBeVisible();
  return dialog;
}

test("the account menu offers a draggable Save to linkables button built from the app origin", async ({ page }, testInfo) => {
  const dialog = await openBookmarkletDialog(page);
  await expect(dialog.getByText("Drag this to your bookmarks bar")).toBeVisible();
  const button = dialog.getByRole("link", { name: "Save to linkables" });
  const href = await button.getAttribute("href");
  expect(href).toMatch(/^javascript:/);
  expect(href).toContain(`${WEB_URL}/save?url=`);
  await expect(dialog.getByRole("button", { name: "Copy the link" })).toBeVisible();
  await shot(page, testInfo, "bookmarklet-dialog");
});

test("clicking the bookmark button on a page saves it in a compact popup that only closes when asked", async ({ page, context, db, user }, testInfo) => {
  await stubWindowClose(context);
  await context.route("https://news.example.test/**", (route) => route.fulfill({ contentType: "text/html", body: "<h1>A story</h1>" }));
  const href = await (await openBookmarkletDialog(page)).getByRole("link", { name: "Save to linkables" }).getAttribute("href");

  await page.goto(ARTICLE);
  const popupOpened = context.waitForEvent("page");
  await page.evaluate((bookmarklet) => { location.href = bookmarklet; }, href ?? "");
  const popup = await popupOpened;
  await popup.setViewportSize(POPUP);

  await expect(popup.getByRole("heading", { name: "Saved to linkables" })).toBeVisible();
  await expect(popup.getByRole("button", { name: "Close" })).toBeVisible();
  await expect(popup.getByRole("link", { name: "Open linkables" })).toBeVisible();
  expect(new URL(popup.url()).searchParams.get("url")).toBe(new URL(ARTICLE).href);
  expect(page.url(), "the page itself stays where it was").toBe(new URL(ARTICLE).href);
  expect(await savedUrls(db, user)).toEqual([new URL(ARTICLE).href]);
  await shot(popup, testInfo, "popup-saved");

  await popup.waitForTimeout(5_000);
  expect(await popup.evaluate(() => window.closeCalls)).toBe(0);
  await expect(popup.getByRole("button", { name: "Undo" })).toBeVisible();

  await popup.getByRole("button", { name: "Close" }).click();
  expect(await popup.evaluate(() => window.closeCalls)).toBe(1);
});

test.describe("in a 420 × 640 window", () => {
  test.use({ viewport: POPUP });

  test("every /save state shows the compact card with Close", async ({ page, context }, testInfo) => {
    await stubWindowClose(context);
    await page.goto("/save?url=https://example.test/compact");
    await expect(page.getByRole("heading", { name: "Saved to linkables" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Close" })).toBeVisible();

    await page.getByRole("button", { name: "Undo" }).click();
    await expect(page.getByRole("heading", { name: "Removed" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Close" })).toBeVisible();
    await shot(page, testInfo, "popup-removed");

    await page.goto("/save?url=https://example.test/compact");
    await expect(page.getByRole("heading", { name: "Saved to linkables" })).toBeVisible();
    await page.goto("/save?url=https://example.test/compact");
    await expect(page.getByRole("heading", { name: "Already saved" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Close" })).toBeVisible();
    await shot(page, testInfo, "popup-already-saved");

    await page.goto("/save?text=no%20link");
    await expect(page.getByRole("heading", { name: "No link found" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Close" })).toBeVisible();
    await shot(page, testInfo, "popup-no-link");

    expect(await page.evaluate(() => window.closeCalls)).toBe(0);
  });
});
