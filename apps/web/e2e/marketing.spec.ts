import { expect, test } from "./fixtures";

const PUBLIC_PAGES = [
  { path: "/privacy", heading: "Privacy policy" },
  { path: "/terms", heading: "Terms of use" },
  { path: "/support", heading: "Support" },
];

test.describe("signed out", () => {
  test.use({ signedIn: false });

  test("the landing page asks for access by email during the private beta", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("Private beta").first()).toBeVisible();
    await expect(page.getByRole("link", { name: "Request access" }).first()).toHaveAttribute(
      "href",
      "mailto:support@linkables.app?subject=linkables%20beta%20access",
    );
    await expect(page.getByRole("link", { name: /Get started/ })).toHaveCount(0);
  });

  test("Sign in on the landing page leads invited users to sign-in", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: "Sign in", exact: true }).first().click();
    await expect(page.getByRole("heading", { name: "Sign in to linkables" })).toBeVisible();
    await expect(page.getByText("linkables is invite-only for now")).toBeVisible();
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
