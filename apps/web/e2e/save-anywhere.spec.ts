import type { Page, TestInfo } from "@playwright/test";
import { IOS_SHORTCUT_URL } from "./env";
import { expect, test } from "./fixtures";

const USER_AGENTS = {
  android: "Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Mobile Safari/537.36",
  iphone: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1",
  desktop: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36",
};

const WIDTHS = [375, 1280];

// Kept in test-results after a passing run, so the screens can be looked at.
async function shot(page: Page, testInfo: TestInfo, name: string) {
  await page.screenshot({ path: testInfo.outputPath(`${name}.png`), fullPage: true, animations: "disabled" });
}

async function openPage(page: Page) {
  await page.goto("/save-from-anywhere");
  await expect(page.getByRole("heading", { name: "Save from anywhere", level: 1 })).toBeVisible();
  return page.getByRole("region").first();
}

for (const width of WIDTHS) {
  test.describe(`at ${String(width)} px`, () => {
    test.describe("on Android", () => {
      test.use({ userAgent: USER_AGENTS.android, viewport: { width, height: 900 }, hasTouch: true });

      test("leads with adding linkables to the home screen", async ({ page }, testInfo) => {
        const lead = await openPage(page);
        await expect(lead).toHaveAccessibleName("On Android");
        await expect(lead.getByText("Add linkables to your home screen")).toBeVisible();
        await expect(lead.getByText(/Then in any app, tap Share/)).toBeVisible();
        await shot(page, testInfo, `save-anywhere-android-${String(width)}`);
      });
    });

    test.describe("on iPhone", () => {
      test.use({ userAgent: USER_AGENTS.iphone, viewport: { width, height: 900 }, hasTouch: true });

      test("leads with the shortcut and its three-step guide", async ({ page }, testInfo) => {
        const lead = await openPage(page);
        await expect(lead).toHaveAccessibleName("On iPhone or iPad");
        await expect(lead.getByRole("link", { name: "Add the shortcut" })).toHaveAttribute("href", IOS_SHORTCUT_URL);
        await expect(lead.getByRole("listitem")).toHaveCount(3);
        await expect(lead.getByText(/sign in to linkables in Safari/)).toBeVisible();
        await shot(page, testInfo, `save-anywhere-iphone-${String(width)}`);
      });
    });

    test.describe("on a computer", () => {
      test.use({ userAgent: USER_AGENTS.desktop, viewport: { width, height: 900 } });

      test("leads with the bookmark button and shows the other ways on request", async ({ page }, testInfo) => {
        const lead = await openPage(page);
        await expect(lead).toHaveAccessibleName("On a computer");
        await expect(lead.getByRole("link", { name: "Save to linkables" })).toHaveAttribute("href", /^javascript:/);
        await expect(lead.getByText("Or drag any link onto this window.")).toBeVisible();
        await shot(page, testInfo, `save-anywhere-desktop-${String(width)}`);

        await expect(page.getByRole("region", { name: "On Android" })).toBeHidden();
        await page.getByText("See other ways").click();
        await expect(page.getByRole("region", { name: "On Android" })).toBeVisible();
        await expect(page.getByRole("region", { name: "On iPhone or iPad" })).toBeVisible();
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
        expect(overflow).toBe(0);
        await shot(page, testInfo, `save-anywhere-desktop-all-${String(width)}`);
      });
    });
  });
}
