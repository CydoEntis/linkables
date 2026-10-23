import type { BrowserContext, Page, TestInfo } from "@playwright/test";
import { expect, test } from "./fixtures";

declare global {
  interface Window {
    closeCalls?: number;
  }
}

const POPUP = { width: 420, height: 640 };

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
