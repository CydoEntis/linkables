import { successEnvelopeSchema } from "@linkaroo/shared/http";
import { listLinksResponseSchema } from "@linkaroo/shared/links";
import { expect, test } from "./fixtures";
import { API_URL } from "./env";

test("a signed-in user sees GET /me answer with their id", async ({ page, user }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "You're signed in" })).toBeVisible();
  await expect(page.getByText(`"id": "${user.id}"`)).toBeVisible();
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
    await expect(page.getByRole("heading", { name: "Sign in to linkaroo" })).toBeVisible();
  });
});
