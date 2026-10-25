import type { Page } from "@playwright/test";
import { collection, collectionItem } from "../../api/src/db/schema";
import { expect, test } from "./fixtures";

const TOKEN = "Settings_Token-For-E2E-012345678";
const LINKS = [{ url: "https://example.com/kyoto", resource: { title: "Kyoto temples", fetchStatus: "fetched" as const }, link: { note: "a note" } }];

function sharedSection(page: Page) {
  return page.getByRole("region", { name: "Shared collections" });
}

test.describe("at 1280 px", () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test("opens Settings from the account menu", async ({ page, user }) => {
    await page.goto("/");
    await page.getByRole("complementary").getByRole("button", { name: "Account" }).click();
    await page.getByRole("menuitem", { name: "Settings" }).click();

    await expect(page).toHaveURL(/\/settings$/);
    await expect(page.getByRole("heading", { level: 1, name: "Settings" })).toBeVisible();
    await expect(page.getByRole("region", { name: "Account" })).toContainText(user.email);
    await expect(page.getByRole("link", { name: "Get the extension" })).toHaveAttribute("href", "/extension");
    await expect(page.getByRole("link", { name: "Privacy policy" })).toHaveAttribute("href", "/privacy");
  });

  test("turns off a collection's share link so it stops working", async ({ page, db, user, seedLinks }) => {
    const [link] = await seedLinks(LINKS);
    const [row] = await db.insert(collection).values({ userId: user.id, name: "Trip to Japan", shareToken: TOKEN }).returning();
    if (row === undefined || link === undefined) throw new Error("seed failed");
    await db.insert(collectionItem).values({ collectionId: row.id, savedLinkId: link.id });
    await page.goto("/settings");

    await expect(sharedSection(page).getByRole("link", { name: "Trip to Japan" })).toBeVisible();
    await sharedSection(page).getByRole("button", { name: "Turn off link to Trip to Japan" }).click();

    await expect(sharedSection(page)).toContainText("No collection has its link on");
    await page.goto(`/s/${TOKEN}`);
    await expect(page.getByRole("heading", { name: "This shared collection isn't available" })).toBeVisible();
  });

  test("deletes the account after DELETE is typed, then signs out", async ({ page, db, user, seedLinks }) => {
    await seedLinks(LINKS);
    await db.insert(collection).values({ userId: user.id, name: "Trip to Japan" });
    await page.goto("/settings");

    await page.getByRole("button", { name: "Delete account" }).click();
    const dialog = page.getByRole("dialog", { name: "Delete your account?" });
    await dialog.getByRole("textbox", { name: "Type DELETE to confirm" }).fill("DELETE");
    await dialog.getByRole("button", { name: "Delete account" }).click();

    await expect(page.getByText("Your account is deleted")).toBeVisible();
    await expect(page).toHaveURL(/\/sign-in$/);
    expect(await db.query.savedLink.findMany({ where: (row, { eq }) => eq(row.userId, user.id) })).toEqual([]);
    expect(await db.query.collection.findMany({ where: (row, { eq }) => eq(row.userId, user.id) })).toEqual([]);
  });
});

test.describe("on a 360 px phone", () => {
  test.use({ viewport: { width: 360, height: 780 } });

  test("opens Settings from the header's account menu with no horizontal scroll", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("banner").getByRole("button", { name: "Account" }).click();
    await page.getByRole("menuitem", { name: "Settings" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Settings" })).toBeVisible();

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBe(0);
  });
});
