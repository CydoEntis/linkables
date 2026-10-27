import type { Page, TestInfo } from "@playwright/test";
import { expect, test } from "./fixtures";
import { WELCOME_SEEN_KEY } from "../src/save-anywhere/welcome";
import { SUPABASE_URL } from "./env";
import { sessionJson, STORAGE_KEY, type TestUser } from "./session";

test.use({ signedIn: false });

function answerSend(page: Page, status = 200, body: object = {}) {
  return page.route(`${SUPABASE_URL}/auth/v1/otp*`, (route) => route.fulfill({ status, json: body }));
}

function answerVerify(page: Page, user: TestUser | null) {
  return page.route(`${SUPABASE_URL}/auth/v1/verify*`, (route) =>
    user
      ? route.fulfill({ status: 200, contentType: "application/json", body: sessionJson(user) })
      : route.fulfill({ status: 403, json: { code: 403, error_code: "otp_expired", msg: "Token has expired or is invalid" } }),
  );
}

function answerCodeExchange(page: Page, user: TestUser) {
  return page.route(`${SUPABASE_URL}/auth/v1/token*`, (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: sessionJson(user) }),
  );
}

async function snap(page: Page, testInfo: TestInfo, name: string) {
  await testInfo.attach(name, { body: await page.screenshot({ animations: "disabled" }), contentType: "image/png" });
}

async function sendEmail(page: Page, email: string) {
  await page.getByLabel("Email").fill(email);
  await page.getByRole("button", { name: "Email me a sign-in link" }).click();
}

test("the start step offers Google, then email", async ({ page }, testInfo) => {
  await page.goto("/sign-in");
  await expect(page.getByRole("heading", { name: "Sign in to linkables" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Continue with Google" })).toBeVisible();
  await expect(page.getByRole("link", { name: "← Back to home" })).toHaveAttribute("href", "/");
  await snap(page, testInfo, "sign-in-start");
});

test("a code from the email signs in and finishes the pending save", async ({ page, user }, testInfo) => {
  await answerSend(page);
  await answerVerify(page, user);
  await page.goto("/save?url=https://example.test/by-code");
  await expect(page.getByRole("heading", { name: "Sign in to save this link" })).toBeVisible();

  await sendEmail(page, user.email);
  await expect(page.getByRole("heading", { name: "Check your email" })).toBeVisible();
  await expect(page.getByRole("button", { name: /^Resend in \d+s$/ })).toBeDisabled();
  await snap(page, testInfo, "sign-in-sent");

  await page.getByLabel("6-digit code").pressSequentially("123456");
  await expect(page).toHaveURL(/\/save\?url=/);
  await expect(page.getByRole("heading", { name: "Saved to linkables" })).toBeVisible();
});

test("a wrong code says it didn't work", async ({ page, user }, testInfo) => {
  await answerSend(page);
  await answerVerify(page, null);
  await page.goto("/sign-in");
  await sendEmail(page, user.email);
  await page.getByLabel("6-digit code").pressSequentially("000000");
  await expect(page.getByRole("alert")).toHaveText("That code didn't work. Check it, or send a new one.");
  await snap(page, testInfo, "sign-in-wrong-code");
});

test("an invalid email is explained without sending", async ({ page }, testInfo) => {
  await page.goto("/sign-in");
  await sendEmail(page, "not-an-email");
  await expect(page.getByRole("alert")).toHaveText("Enter an email address, like you@example.com");
  await expect(page.getByLabel("Email")).toHaveAttribute("aria-invalid", "true");
  await snap(page, testInfo, "sign-in-invalid-email");
});

test("a rate-limited send asks the user to wait", async ({ page }, testInfo) => {
  await answerSend(page, 429, { code: 429, error_code: "over_email_send_rate_limit", msg: "Email rate limit exceeded" });
  await page.goto("/sign-in");
  await sendEmail(page, "owner@example.com");
  await expect(page.getByRole("alert")).toHaveText("Too many tries. Wait a minute, then try again.");
  await snap(page, testInfo, "sign-in-rate-limited");
});

test("offline shows a banner and disables the buttons", async ({ page, context }, testInfo) => {
  await page.goto("/sign-in");
  await context.setOffline(true);
  await expect(page.getByText("You're offline. Check your connection and try again.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Continue with Google" })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Email me a sign-in link" })).toBeDisabled();
  await snap(page, testInfo, "sign-in-offline");
  await context.setOffline(false);
});

test("an expired email link offers a new one", async ({ page }, testInfo) => {
  await page.goto("/#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired");
  await expect(page.getByRole("heading", { name: "This link has expired" })).toBeVisible();
  await snap(page, testInfo, "sign-in-expired");
  await page.getByRole("button", { name: "Send a new link" }).click();
  await expect(page.getByLabel("Email")).toBeFocused();
});

test("a magic link opened in the browser that asked for it signs in", async ({ page, user }) => {
  await answerSend(page);
  await answerCodeExchange(page, user);
  await page.goto("/sign-in");
  await sendEmail(page, user.email);
  await expect(page.getByRole("heading", { name: "Check your email" })).toBeVisible();
  await page.evaluate((key) => { localStorage.setItem(key, "1"); }, WELCOME_SEEN_KEY);

  await page.goto("/?code=e2e-code");
  await expect(page.getByRole("heading", { name: /Save your first link/ })).toBeVisible();
  expect(page.url()).not.toContain("code=");
});

test("Google coming back with a code signs in", async ({ page, user }) => {
  await answerCodeExchange(page, user);
  // The Google button leaves for Supabase's authorize page, which this suite never loads;
  // this stores the verifier it would have left behind.
  await page.goto("/sign-in");
  await page.evaluate((key) => { localStorage.setItem(`${key}-code-verifier`, JSON.stringify("e2e-verifier")); }, STORAGE_KEY);

  await page.goto("/sign-in?code=e2e-code");
  await expect(page).not.toHaveURL(/\/sign-in/);
  await expect(page.getByRole("heading", { name: "Sign in to linkables" })).toBeHidden();
});

test("a magic link opened in another browser says it didn't work", async ({ page }, testInfo) => {
  await page.goto("/?code=e2e-code");
  await expect(page.getByRole("alert")).toHaveText("This sign-in link didn't work. Send a new one.");
  await snap(page, testInfo, "sign-in-other-browser");
});

test("someone else's tokens in the URL fragment do not sign this browser in", async ({ page, user }) => {
  await page.goto(`/#access_token=${user.accessToken}&refresh_token=attacker-refresh&expires_in=3600&token_type=bearer`);
  await expect(page.getByRole("heading", { name: "Sign in to linkables" })).toBeVisible();
  await expect(page.getByRole("alert")).toHaveText("This sign-in link didn't work. Send a new one.");
  expect(page.url()).not.toContain("access_token");
  expect(await page.evaluate((key) => localStorage.getItem(key), STORAGE_KEY)).toBeNull();
});
