import { expect, test } from "./fixtures";
import { API_URL } from "./env";
import { markFetched } from "./seed";

// Two of the list's 2 s pending refetches, so one slow request cannot fail the test.
const WITHIN_REFETCH = 5_000;

test("a saved link shows pending, then its title once the metadata lands", async ({ page, db }) => {
  await page.goto("/");
  await expect(page.getByText("No links yet")).toBeVisible();
  const bar = page.getByRole("textbox", { name: "Search or paste a link" });
  await expect(bar).toBeFocused();

  await bar.fill("https://example.com/e2e-article");
  const saved = page.waitForResponse(
    (response) => response.url() === `${API_URL}/api/v1/links` && response.request().method() === "POST",
  );
  await bar.press("Enter");
  expect((await saved).status()).toBe(201);

  const row = page.getByRole("link", { name: /example\.com\/e2e-article/ });
  await expect(row).toContainText("Getting details…");

  await markFetched(db, "https://example.com/e2e-article", "Fetched by the e2e worker");
  await expect(page.getByRole("link", { name: /^Fetched by the e2e worker/ })).toBeVisible({ timeout: WITHIN_REFETCH });
  await expect(page.getByText("Getting details…")).toHaveCount(0);
});

test.describe("at 360 px", () => {
  test.use({ viewport: { width: 360, height: 780 } });

  test("the list never scrolls sideways, even with long titles and URLs", async ({ page, seedLinks }) => {
    await seedLinks([
      { url: `https://example.com/${"very-long-path-segment-".repeat(40)}`, resource: { fetchStatus: "fetch_failed" } },
      { url: "https://example.com/long-title", resource: { title: "A".repeat(300), fetchStatus: "fetched" } },
      { url: "https://example.com/pending" },
    ]);
    await page.goto("/");
    await expect(page.getByRole("link", { name: /example\.com\/pending/ })).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBe(0);
  });

  test("the + button opens the save sheet and saves a link", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Save a link" }).click();
    const field = page.getByRole("textbox", { name: "Link" });
    await expect(field).toBeFocused();
    await field.fill("example.com/from-phone");
    await page.getByRole("button", { name: "Save", exact: true }).click();
    await expect(page.getByRole("dialog")).toBeHidden();
    await expect(page.getByRole("link", { name: /example\.com\/from-phone/ })).toBeVisible();
  });
});

test.describe("at 1280 px", () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  // Geometry, not a pixel diff: baselines would differ per OS and font load.
  test("the shell lays out the sidebar, save bar and day groups", async ({ page, seedLinks }, testInfo) => {
    await seedLinks([
      { url: "https://doc.rust-lang.org/rust-by-example/", resource: { title: "Rust by Example", fetchStatus: "fetched" } },
      { url: "https://www.youtube.com/watch?v=abc", resource: { title: "Tokyo night walk", kind: "video", fetchStatus: "fetched" } },
      { url: "https://fasterthanli.me/articles/a-half-hour-to-learn-rust", resource: { title: "A half-hour to learn Rust", fetchStatus: "fetched" }, link: { pinned: true } },
    ]);
    await page.goto("/");
    await expect(page.getByRole("link", { name: /^Rust by Example/ })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Pinned" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Today" })).toBeVisible();
    expect((await page.getByRole("complementary").boundingBox())?.width).toBe(272);
    expect((await page.locator("form label").boundingBox())?.height).toBe(52);
    const screenshot = await page.screenshot({ fullPage: true, animations: "disabled" });
    await testInfo.attach("links-1280", { body: screenshot, contentType: "image/png" });
  });
});
