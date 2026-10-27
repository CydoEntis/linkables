import { expect, test } from "@playwright/test";

test("opens the app at the instance root without a local-storage session", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-app-boot", "");
  await expect(page.locator("#landing")).toBeHidden();
  await expect(page.locator("#root > *").first()).toBeAttached();
});

test("the extension guide describes self-hosted connection and does not offer an obsolete signed add-on", async ({ page }) => {
  await page.goto("/extension");
  await expect(page.getByRole("heading", { name: "Linkables browser extensions" })).toBeVisible();
  await expect(page.locator('a[href$=".xpi"]')).toHaveCount(0);
});

for (const [path, heading] of [["/privacy", "Privacy on this server"], ["/terms", "About this self-hosted instance"], ["/support", "Self-hosted help"]] as const) {
  test(`${path} is readable as static HTML`, async ({ request }) => {
    const response = await request.get(path);
    expect(response.ok()).toBe(true);
    expect(await response.text()).toContain(heading);
  });
}

test("shared collection deep links retain private headers", async ({ request }) => {
  const response = await request.get(`/s/${"A".repeat(32)}`);
  expect(response.status()).toBe(200);
  expect(response.headers()["x-robots-tag"]).toBe("noindex, nofollow");
  expect(response.headers()["referrer-policy"]).toBe("no-referrer");
});
