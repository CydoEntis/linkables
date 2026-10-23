import type { Page } from "@playwright/test";
import { API_URL } from "./env";
import { expect, test } from "./fixtures";

const RUST = { url: "https://doc.rust-lang.org/rust-by-example/", resource: { title: "Rust by Example", fetchStatus: "fetched" as const } };
const TOKYO = { url: "https://www.youtube.com/watch?v=tokyo", resource: { title: "Tokyo night walk", kind: "video" as const, fetchStatus: "fetched" as const } };

function panel(page: Page) {
  return page.getByRole("region", { name: "Link details" });
}

function linkRequest(page: Page, method: string) {
  return page.waitForResponse((response) => response.url().startsWith(`${API_URL}/api/v1/links/`) && response.request().method() === method);
}

test.describe("at 1280 px", () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test("a row opens its details beside the list, and Back closes them", async ({ page, seedLinks }) => {
    const [rust] = await seedLinks([RUST, TOKYO]);
    await page.goto("/");
    await page.getByRole("link", { name: /^Rust by Example/ }).click();
    await expect(panel(page).getByRole("heading", { name: /Rust by Example/ })).toBeVisible();
    await expect(page).toHaveURL(new RegExp(`\\?link=${rust?.id ?? ""}$`));
    await expect(panel(page).getByRole("link", { name: /Open ↗/ })).toHaveAttribute("href", RUST.url);

    await page.getByRole("link", { name: /^Tokyo night walk/ }).click();
    await expect(panel(page).getByRole("heading", { name: /Tokyo night walk/ })).toBeVisible();
    await panel(page).getByRole("button", { name: "Back" }).click();
    await expect(panel(page)).toHaveCount(0);
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole("link", { name: /^Tokyo night walk/ })).toBeFocused();
  });

  test("pinning from the details pins the link", async ({ page, seedLinks }) => {
    await seedLinks([RUST]);
    await page.goto("/");
    await page.getByRole("link", { name: /^Rust by Example/ }).click();
    const pinned = linkRequest(page, "PATCH");
    await panel(page).getByRole("button", { name: "Pin" }).click();
    expect((await pinned).status()).toBe(200);
    await expect(panel(page).getByRole("button", { name: "Pinned" })).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByRole("heading", { name: "Pinned" })).toBeVisible();
  });

  test("a new title shows in the row, and clearing it brings back the fetched one", async ({ page, seedLinks }) => {
    await seedLinks([RUST]);
    await page.goto("/");
    await page.getByRole("link", { name: /^Rust by Example/ }).click();
    await panel(page).getByRole("button", { name: /Rust by Example/ }).click();
    const title = panel(page).getByRole("textbox", { name: "Title" });
    await title.fill("Rust, the good parts");
    const renamed = linkRequest(page, "PATCH");
    await title.press("Enter");
    expect((await renamed).status()).toBe(200);
    await expect(page.getByRole("link", { name: /^Rust, the good parts/ })).toBeVisible();

    await page.reload();
    await panel(page).getByRole("button", { name: /Rust, the good parts/ }).click();
    await panel(page).getByRole("textbox", { name: "Title" }).fill("");
    await panel(page).getByRole("textbox", { name: "Title" }).press("Enter");
    await expect(page.getByRole("link", { name: /^Rust by Example/ })).toBeVisible();
  });

  test("the note saves itself and is still there after a reload", async ({ page, seedLinks }) => {
    await seedLinks([RUST]);
    await page.goto("/");
    await page.getByRole("link", { name: /^Rust by Example/ }).click();
    const saved = linkRequest(page, "PATCH");
    await panel(page).getByRole("textbox", { name: "Note" }).fill("Chapter 4 on ownership");
    expect((await saved).status()).toBe(200);
    await expect(panel(page).getByText("Saved", { exact: true })).toBeVisible();

    await page.reload();
    await expect(panel(page).getByRole("textbox", { name: "Note" })).toHaveValue("Chapter 4 on ownership");
  });

  test("delete offers Undo, and deletes for real once the toast closes", async ({ page, seedLinks }) => {
    await seedLinks([RUST]);
    await page.goto("/");
    const row = page.getByRole("link", { name: /^Rust by Example/ });

    await row.click();
    await panel(page).getByRole("button", { name: "Delete" }).click();
    await expect(panel(page)).toHaveCount(0);
    await expect(row).toHaveCount(0);
    await page.getByRole("button", { name: "Undo" }).click();
    await expect(row).toBeVisible();

    await row.click();
    const deleted = page.waitForResponse(
      (response) => response.url().startsWith(`${API_URL}/api/v1/links/`) && response.request().method() === "DELETE",
      { timeout: 10_000 },
    );
    await panel(page).getByRole("button", { name: "Delete" }).click();
    await page.mouse.move(640, 100);
    expect((await deleted).status()).toBe(200);
    await page.reload();
    await expect(page.getByText("No links yet")).toBeVisible();
  });
});

test.describe("at 375 px", () => {
  test.use({ viewport: { width: 375, height: 780 }, hasTouch: true });

  test("details fill the screen without scrolling sideways, and Back closes them", async ({ page, seedLinks }) => {
    await seedLinks([{ ...RUST, resource: { ...RUST.resource, title: `Rust ${"by example ".repeat(30)}` } }]);
    await page.goto("/");
    await page.getByRole("link", { name: /^Rust by example/ }).click();
    const details = page.getByRole("dialog", { name: "Link details" });
    await expect(details).toBeVisible();
    const box = await details.boundingBox();
    expect(box).toMatchObject({ x: 0, width: 375 });
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBe(0);
    await details.getByRole("button", { name: "Back" }).click();
    await expect(details).toHaveCount(0);
  });

  test("Tab keeps focus inside the details, also after the picker opens and closes", async ({ page, seedLinks }) => {
    await seedLinks([RUST]);
    await page.goto("/");
    await page.getByRole("link", { name: /^Rust by Example/ }).click();
    const details = page.getByRole("dialog", { name: "Link details" });
    await expect(details).toBeVisible();

    const focusStaysInside = async () => {
      for (let i = 0; i < 14; i++) {
        await page.keyboard.press("Tab");
        expect(await page.evaluate(() => document.activeElement?.closest("[role=dialog]") !== null)).toBe(true);
      }
    };
    await focusStaysInside();
    await details.getByRole("button", { name: "+ Add to" }).click();
    await expect(page.getByRole("textbox", { name: "Find or create a collection" })).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("textbox", { name: "Find or create a collection" })).toHaveCount(0);
    await expect(details.getByRole("button", { name: "+ Add to" })).toBeFocused();
    await focusStaysInside();
  });
});
