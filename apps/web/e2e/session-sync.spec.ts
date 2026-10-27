import type { Page } from "@playwright/test";
import { API_URL } from "./env";
import { expect, test } from "./fixtures";
import { createTestUser, type TestUser } from "./session";
import { WELCOME_SEEN_KEY } from "../src/save-anywhere/welcome";

test.use({ signedIn: false });

async function login(page: Page, user: TestUser) {
  await page.getByLabel("Email", { exact: true }).fill(user.email);
  await page.getByLabel("Password", { exact: true }).fill(user.password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
}

test.beforeEach(async ({ context }) => {
  await context.addInitScript((key) => { localStorage.setItem(key, "1"); }, WELCOME_SEEN_KEY);
});

test("signing out clears private content from another open tab", async ({ page, context, user, seedLinks }) => {
  await seedLinks([{ url: "https://example.com/private-a", resource: { title: "Private account A", fetchStatus: "fetched" } }]);
  await page.goto("/sign-in");
  await login(page, user);
  await expect(page.getByRole("link", { name: /^Private account A/ })).toBeVisible();
  const second = await context.newPage();
  await second.goto("/");
  await expect(second.getByRole("link", { name: /^Private account A/ })).toBeVisible();
  await page.getByRole("button", { name: "Account" }).click();
  await page.getByRole("menuitem", { name: "Sign out" }).click();
  await expect(second.getByRole("heading", { name: "Sign in to linkables" })).toBeVisible();
  await expect(second.getByRole("link", { name: /^Private account A/ })).toHaveCount(0);
});

test("signing into a different account updates both tabs without showing the old library", async ({ page, context, request, user, seedLinks }) => {
  await seedLinks([{ url: "https://example.com/private-a", resource: { title: "Private account A", fetchStatus: "fetched" } }]);
  const other = await createTestUser();
  const saved = await request.post(API_URL + "/api/v1/links", { headers: { Authorization: "Bearer " + other.accessToken }, data: { url: "https://example.com/private-b" } });
  expect(saved.status()).toBe(201);
  await page.goto("/sign-in");
  await login(page, user);
  const second = await context.newPage();
  await second.goto("/");
  await expect(second.getByRole("link", { name: /^Private account A/ })).toBeVisible();
  await page.getByRole("button", { name: "Account" }).click();
  await page.getByRole("menuitem", { name: "Sign out" }).click();
  await expect(second.getByRole("heading", { name: "Sign in to linkables" })).toBeVisible();
  await login(second, other);
  await expect(page.getByRole("link", { name: /example.com\/private-b/ })).toBeVisible();
  await expect(second.getByRole("link", { name: /example.com\/private-b/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /^Private account A/ })).toHaveCount(0);
  await expect(second.getByRole("link", { name: /^Private account A/ })).toHaveCount(0);
});

test("focusing a tab reconciles a cookie account changed outside that tab", async ({ page, context, user, seedLinks }) => {
  await seedLinks([{ url: "https://example.com/private-a", resource: { title: "Private account A", fetchStatus: "fetched" } }]);
  const other = await createTestUser();
  await page.goto("/sign-in");
  await login(page, user);
  await expect(page.getByRole("link", { name: /^Private account A/ })).toBeVisible();
  const second = await context.newPage();
  const loginResponse = await second.request.post(API_URL + "/api/v1/auth/sign-in", { data: { email: other.email, password: other.password } });
  expect(loginResponse.status()).toBe(200);
  const cookieSession = await second.request.get(API_URL + "/api/v1/auth/session");
  expect((await cookieSession.json() as { data: { user: { id: string } } }).data.user.id).toBe(other.id);
  await second.bringToFront();
  await page.bringToFront();
  // Headless Chromium does not reliably deliver an OS window-focus event.
  await page.evaluate(() => { window.dispatchEvent(new Event("focus")); });
  await expect(page.getByRole("link", { name: /^Private account A/ })).toHaveCount(0);
  await page.getByRole("button", { name: "Account" }).click();
  await expect(page.getByRole("menu")).toContainText(other.email);
});
