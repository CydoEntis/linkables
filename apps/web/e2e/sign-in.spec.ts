import { expect, test } from "./fixtures";

test.use({ signedIn: false });

test("signs in with a local account and keeps the session after reload", async ({ page, user }) => {
  await page.goto("/sign-in");
  await page.getByLabel("Email", { exact: true }).fill(user.email);
  await page.getByLabel("Password", { exact: true }).fill(user.password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).not.toHaveURL(/sign-in/);
  await page.reload();
  await expect(page).not.toHaveURL(/sign-in/);
  await expect(page.getByRole("heading", { name: "Sign in to linkables" })).toHaveCount(0);
});

test("rejects an incorrect password without signing in", async ({ page, user }) => {
  await page.goto("/sign-in");
  await page.getByLabel("Email", { exact: true }).fill(user.email);
  await page.getByLabel("Password", { exact: true }).fill("incorrect-password");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.getByRole("alert")).toBeVisible();
  await expect(page).toHaveURL(/sign-in/);
});

test("requires a valid email before sending credentials", async ({ page }) => {
  await page.goto("/sign-in");
  await page.getByLabel("Email", { exact: true }).fill("not-an-email");
  await page.getByLabel("Password", { exact: true }).fill("password1234");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.getByLabel("Email", { exact: true })).toHaveAttribute("aria-invalid", "true");
});

test("disables sign-in while offline", async ({ page, context }) => {
  await page.goto("/sign-in");
  await context.setOffline(true);
  await expect(page.getByRole("button", { name: "Sign in", exact: true })).toBeDisabled();
  await context.setOffline(false);
});

test("ignores tokens placed in a URL fragment", async ({ page, user }) => {
  await page.goto(`/#access_token=${user.accessToken}&refresh_token=other`);
  await expect(page.getByRole("heading", { name: "Sign in to linkables" })).toBeVisible();
  expect((await page.context().cookies()).some((cookie) => cookie.name.includes("session"))).toBe(false);
});
