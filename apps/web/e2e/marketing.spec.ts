import { expect, test } from "./fixtures";

const PUBLIC_PAGES = [
  { path: "/privacy", heading: "Privacy policy" },
  { path: "/terms", heading: "Terms of use" },
  { path: "/support", heading: "Support" },
];

test.describe("signed out", () => {
  test.use({ signedIn: false });

  test("Get started on the landing page leads to sign-in", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: "Get started, it's free" }).first().click();
    await expect(page.getByRole("heading", { name: "Sign in to linkables" })).toBeVisible();
  });

  test("the landing page shows the Chrome extension as coming soon, with no action", async ({ page }) => {
    await page.goto("/");
    const chrome = page.locator("article", { has: page.getByRole("heading", { name: "Chrome extension" }) });
    await expect(chrome.getByText("Coming soon")).toBeVisible();
    await expect(chrome.getByRole("link")).toHaveCount(0);
  });

  test("the landing page has no horizontal scroll on a 360 px phone", async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 780 });
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBe(0);
  });

  for (const { path, heading } of PUBLIC_PAGES) {
    test(`${path} is readable without signing in`, async ({ page }) => {
      await page.goto(path);
      await expect(page.getByRole("heading", { name: heading, level: 1 })).toBeVisible();
      await expect(page.getByText("The short version")).toBeVisible();
    });
  }
});

test("a signed-in user can still read the privacy policy", async ({ page }) => {
  await page.goto("/privacy");
  await expect(page.getByRole("heading", { name: "Privacy policy", level: 1 })).toBeVisible();
});
