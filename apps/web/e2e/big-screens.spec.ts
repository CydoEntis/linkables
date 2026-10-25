import { expect, test } from "./fixtures";

const TWO_LINKS = [
  { url: "https://example.com/older", resource: { title: "Older link", fetchStatus: "fetched" as const } },
  { url: "https://example.com/newer", resource: { title: "Newer link", description: "What the page says about itself.", fetchStatus: "fetched" as const } },
];

test.describe("at 2560 px", () => {
  test.use({ viewport: { width: 2560, height: 1440 } });

  test("the list opens as a grid, with the newest link's details docked beside it", async ({ page, seedLinks }) => {
    await seedLinks(TWO_LINKS);
    await page.goto("/");
    const grid = page.getByRole("list", { name: "Links" });
    await expect(grid.getByRole("link", { name: /^Newer link/ })).toHaveAttribute("aria-current", "true");
    const details = page.getByRole("region", { name: "Link details" });
    await expect(details.getByRole("heading", { name: /Newer link/ })).toBeVisible();
    await expect(details).not.toBeFocused();

    const gridBox = await grid.boundingBox();
    const detailsBox = await details.boundingBox();
    expect(detailsBox?.width).toBe(480);
    expect((gridBox?.x ?? 0) + (gridBox?.width ?? 0)).toBeLessThanOrEqual(detailsBox?.x ?? 0);
  });

  test("closing the docked panel widens the list column, and it stays closed", async ({ page, seedLinks }) => {
    await seedLinks(TWO_LINKS);
    await page.goto("/");
    const main = page.getByRole("main");
    const docked = (await main.boundingBox())?.width ?? 0;
    await page.getByRole("region", { name: "Link details" }).getByRole("button", { name: "Back" }).click();
    await expect(page.getByRole("region", { name: "Link details" })).toHaveCount(0);
    await expect.poll(async () => (await main.boundingBox())?.width).toBe(1900);
    expect(docked).toBe(1560);
  });
});

test.describe("at 1440 px", () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test("the list stays a list, and a switch to the grid is remembered on this device", async ({ page, seedLinks }) => {
    await seedLinks(TWO_LINKS);
    await page.goto("/");
    await expect(page.getByRole("link", { name: /^Newer link/ })).toBeVisible();
    await expect(page.getByRole("list", { name: "Links" })).toHaveCount(0);
    await expect(page.getByRole("region", { name: "Link details" })).toHaveCount(0);

    await page.getByRole("button", { name: "Grid" }).click();
    await expect(page.getByRole("list", { name: "Links" })).toBeVisible();
    await page.reload();
    await expect(page.getByRole("list", { name: "Links" }).getByRole("link", { name: /^Newer link/ })).toBeVisible();
    await expect(page.getByRole("button", { name: "Grid" })).toHaveAttribute("aria-pressed", "true");
  });

  test("the sidebar's Chrome extension card stays dismissed", async ({ page }) => {
    await page.goto("/");
    const card = page.getByRole("region", { name: "Chrome extension" });
    await expect(card.getByRole("link", { name: "Add to Chrome" })).toHaveAttribute("href", "/extension");
    await card.getByRole("button", { name: "Dismiss" }).click();
    await expect(card).toHaveCount(0);
    await page.reload();
    await expect(page.getByRole("heading", { name: /Save your first link/ })).toBeVisible();
    await expect(card).toHaveCount(0);
  });
});
