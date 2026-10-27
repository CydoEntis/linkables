import { expect, test } from "./fixtures";
import { openLinkPage } from "./open-link-page";

const TWO_LINKS = [
  { url: "https://example.com/older", resource: { title: "Older link", fetchStatus: "fetched" as const } },
  { url: "https://example.com/newer", resource: { title: "Newer link", description: "What the page says about itself.", fetchStatus: "fetched" as const } },
];

test.describe("at 2560 px", () => {
  test.use({ viewport: { width: 2560, height: 1440 } });

  test("the list opens as a grid across the whole column, and a card's Read opens its link's page", async ({ page, seedLinks }) => {
    const [, newer] = await seedLinks(TWO_LINKS);
    await page.goto("/");
    const grid = page.getByRole("list", { name: "Links" });
    await expect(grid.getByRole("link", { name: /^Newer link/ })).toBeVisible();
    expect((await page.getByRole("main").boundingBox())?.width).toBe(1900);

    await openLinkPage(page, grid.getByRole("link", { name: /^Newer link/ }));
    await expect(page).toHaveURL(new RegExp(`/l/${newer?.id ?? ""}$`));
  });
});

test.describe("at 1440 px", () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test("the list stays a list, and a switch to the grid is remembered on this device", async ({ page, seedLinks }) => {
    await seedLinks(TWO_LINKS);
    await page.goto("/");
    await expect(page.getByRole("link", { name: /^Newer link/ })).toBeVisible();
    await expect(page.getByRole("list", { name: "Links" })).toHaveCount(0);

    await page.getByRole("button", { name: "Grid" }).click();
    await expect(page.getByRole("list", { name: "Links" })).toBeVisible();
    await page.reload();
    await expect(page.getByRole("list", { name: "Links" }).getByRole("link", { name: /^Newer link/ })).toBeVisible();
    await expect(page.getByRole("button", { name: "Grid" })).toHaveAttribute("aria-pressed", "true");
  });

  test("the sidebar's Chrome extension card stays dismissed", async ({ page }) => {
    await page.goto("/");
    const card = page.getByRole("region", { name: "Chrome extension" });
    await expect(card.getByRole("link", { name: /^Add to Chrome/ })).toHaveAttribute("href", "https://chromewebstore.google.com/detail/linkables/dckjkoommfddaimpjbghbomojdkhaoai");
    await card.getByRole("button", { name: "Dismiss" }).click();
    await expect(card).toHaveCount(0);
    await page.reload();
    await expect(page.getByRole("heading", { name: /Save your first link/ })).toBeVisible();
    await expect(card).toHaveCount(0);
  });

  test.describe("in Firefox", () => {
    test.use({ userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:130.0) Gecko/20100101 Firefox/130.0" });

    test("the sidebar card and the settings tile offer Add to Firefox", async ({ page }) => {
      await page.goto("/");
      const card = page.getByRole("region", { name: "Firefox extension" });
      await expect(card.getByRole("link", { name: "Add to Firefox" })).toHaveAttribute("href", "/downloads/linkables-firefox.xpi");
      await page.goto("/settings");
      await expect(page.getByRole("main").getByRole("link", { name: "Add to Firefox" })).toHaveAttribute("href", "/downloads/linkables-firefox.xpi");
      await expect(page.getByRole("link", { name: /Add to Chrome/ })).toHaveCount(0);
    });
  });
});
