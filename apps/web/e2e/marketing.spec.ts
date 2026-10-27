import { expect, test } from "./fixtures";

test.describe("signed out", () => {
  test.use({ signedIn: false });

  test("opens local sign-in at the instance root", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Sign in to linkables" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Continue with Google" })).toHaveCount(0);
  });

  for (const [path, heading] of [["/privacy", "Privacy on this server"], ["/terms", "About this self-hosted instance"], ["/support", "Self-hosted help"]] as const) {
    test(`${path} is readable without signing in`, async ({ page }) => {
      await page.goto(path);
      await expect(page.getByRole("heading", { name: heading, level: 1 })).toBeVisible();
    });
  }
});
