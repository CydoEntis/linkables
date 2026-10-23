import { collectionSchema } from "@linkables/shared/collections";
import { successEnvelopeSchema } from "@linkables/shared/http";
import type { Locator, Page } from "@playwright/test";
import { API_URL } from "./env";
import { expect, test } from "./fixtures";
import { expectFocusTrapped } from "./focus-trap";

const RUST = { url: "https://doc.rust-lang.org/rust-by-example/", resource: { title: "Rust by Example", fetchStatus: "fetched" as const } };

async function expectTrapAndEscape(page: Page, trigger: Locator) {
  const sheet = page.getByRole("dialog");
  await expect(sheet).toBeVisible();
  await expectFocusTrapped(page);
  await page.keyboard.press("Escape");
  await expect(sheet).toHaveCount(0);
  await expect(trigger).toBeFocused();
}

test.describe("at 375 px", () => {
  test.use({ viewport: { width: 375, height: 780 }, hasTouch: true });

  test("the Save sheet keeps Tab inside, and Esc returns to the Save button", async ({ page }) => {
    await page.goto("/");
    const trigger = page.getByRole("button", { name: "Save a link" });
    await trigger.click();
    await expectTrapAndEscape(page, trigger);
  });

  test("the Add to sheet keeps Tab inside, and Esc returns to the Add to tile", async ({ page, seedLinks, request, user }) => {
    const created = await request.post(`${API_URL}/api/v1/collections`, {
      headers: { Authorization: `Bearer ${user.accessToken}` },
      data: { name: "Recipes" },
    });
    successEnvelopeSchema(collectionSchema).parse(await created.json());
    await seedLinks([{ url: "https://www.seriouseats.com/curry", resource: { title: "Japanese curry", fetchStatus: "fetched" } }]);
    await page.goto("/");
    const trigger = page.getByRole("button", { name: "Add to", exact: true });
    await trigger.focus();
    await page.keyboard.press("Enter");
    await expectTrapAndEscape(page, trigger);
  });

  test("the collection sheet keeps Tab inside, and Esc returns to the chip", async ({ page, seedLinks }) => {
    await seedLinks([RUST]);
    await page.goto("/");
    const trigger = page.getByRole("button", { name: "All links" });
    await trigger.click();
    await expectTrapAndEscape(page, trigger);
  });

  test("the link details sheet keeps Tab inside, and Esc returns to the row", async ({ page, seedLinks }) => {
    await seedLinks([RUST]);
    await page.goto("/");
    const trigger = page.getByRole("link", { name: /^Rust by Example/ });
    await trigger.click();
    await expectTrapAndEscape(page, trigger);
  });
});
