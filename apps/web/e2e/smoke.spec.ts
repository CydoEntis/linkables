import { successEnvelopeSchema } from "@linkables/shared/http";
import { listLinksResponseSchema } from "@linkables/shared/links";
import { expect, test } from "./fixtures";
import { outlineContrast } from "./contrast";
import { API_URL } from "./env";

test("a signed-in user lands on All links", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "All links", level: 1 })).toBeVisible();
});

test("signing out returns to the sign-in screen", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Account" }).click();
  await page.getByRole("menuitem", { name: "Sign out" }).click();
  await expect(page.getByRole("heading", { name: "Sign in to linkables" })).toBeVisible();
});

test("the keyboard-highlighted account menu item has a visible focus ring", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Account" }).focus();
  await page.keyboard.press("ArrowDown");
  const item = page.getByRole("menuitem", { name: "Sign out" });
  await expect(item).toHaveAttribute("data-highlighted", "");
  const ring = await outlineContrast(item, page.getByRole("menu"));
  expect(ring.width).toBe("2px");
  expect(ring.ratio).toBeGreaterThanOrEqual(3);
});

test("seeded links come back from GET /links for their owner", async ({ request, user, seedLinks }) => {
  await seedLinks([{ url: "https://example.com/first" }, { url: "https://example.com/second" }]);
  const response = await request.get(`${API_URL}/api/v1/links`, {
    headers: { Authorization: `Bearer ${user.accessToken}` },
  });
  expect(response.ok()).toBe(true);
  const body = successEnvelopeSchema(listLinksResponseSchema).parse(await response.json());
  expect(body.data.items.map((item) => item.originalUrl).sort()).toEqual([
    "https://example.com/first",
    "https://example.com/second",
  ]);
});

test.describe("signed out", () => {
  test.use({ signedIn: false });

  test("a visitor without a session sees the sign-in screen", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Sign in to linkables" })).toBeVisible();
  });
});
