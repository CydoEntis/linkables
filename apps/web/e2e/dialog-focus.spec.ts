import { expect, test } from "./fixtures";
import { expectFocusTrapped } from "./focus-trap";

test.describe("at 1280 px", () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test("the command palette keeps Tab inside", async ({ page }) => {
    await page.goto("/");
    await page.locator("body").click();
    await page.keyboard.press("Control+k");
    await expect(page.getByRole("dialog", { name: "Command palette" })).toBeVisible();
    await expectFocusTrapped(page, 0);
  });

  test("the keyboard shortcuts dialog keeps Tab inside", async ({ page }) => {
    await page.goto("/");
    await page.locator("body").click();
    await page.keyboard.press("?");
    await expect(page.getByRole("dialog", { name: "Keyboard shortcuts" })).toBeVisible();
    await expectFocusTrapped(page, 0);
  });

  test("the bookmark button dialog keeps Tab inside", async ({ page }) => {
    await page.goto("/settings");
    await page.getByRole("button", { name: "Get the button" }).click();
    await expect(page.getByRole("dialog", { name: "Get the bookmark button" })).toBeVisible();
    await expectFocusTrapped(page);
  });
});
