import { accessRequest } from "../../api/src/db/schema";
import { expect, test } from "./fixtures";

test.use({ signedIn: false });

test("a visitor requests access from the landing page", async ({ page, db }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Request access" }).first().click();

  await page.getByLabel("Email").fill("Sam@Example.com");
  await page.getByLabel("Name (optional)").fill("Sam");
  await page.getByLabel("What would you use it for? (optional)").fill("Recipes I find on my phone");
  await page.getByRole("button", { name: "Request access" }).click();

  await expect(page.getByRole("heading", { name: "Thanks! We'll email you when there's a spot." })).toBeVisible();
  expect(await db.select({ email: accessRequest.email, name: accessRequest.name }).from(accessRequest)).toEqual([
    { email: "sam@example.com", name: "Sam" },
  ]);
});

test("an address that is not an email is caught before sending", async ({ page, db }) => {
  await page.goto("/request-access");

  await page.getByLabel("Email").fill("sam at example");
  await page.getByRole("button", { name: "Request access" }).click();

  await expect(page.getByRole("alert")).toHaveText("Enter a valid email address");
  await expect(page.getByLabel("Email")).toBeFocused();
  expect(await db.$count(accessRequest)).toBe(0);
});

test("the form has no horizontal scroll on a 360 px phone", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 780 });
  await page.goto("/request-access");
  await expect(page.getByRole("heading", { name: "Request access", level: 1 })).toBeVisible();

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBe(0);
});
