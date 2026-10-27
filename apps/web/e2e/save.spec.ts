import { sql } from "drizzle-orm";
import type { Page } from "@playwright/test";
import { API_URL } from "./env";
import { expect, test } from "./fixtures";
import type { Db } from "../../api/src/db/client";
import { type TestUser } from "./session";

function linksResponse(page: Page, method: string) {
  return page.waitForResponse(
    (response) => response.url().startsWith(`${API_URL}/api/v1/links`) && response.request().method() === method,
  );
}

async function savedUrls(db: Db, user: TestUser): Promise<string[]> {
  const rows = await db.all<{ original_url: string }>(sql`select original_url from saved_link where user_id = ${user.id}`);
  return rows.map((row) => row.original_url);
}

test.describe("at 375 px", () => {
  test.use({ viewport: { width: 375, height: 780 } });

  test("/save?url= saves the link and shows Saved", async ({ page, db, user }, testInfo) => {
    const saved = linksResponse(page, "POST");
    await page.goto("/save?url=https://example.test/a");
    expect((await saved).status()).toBe(201);
    await expect(page.getByRole("heading", { name: "Saved to linkables" })).toBeVisible();
    await expect(page.getByText("example.test/a")).toBeVisible();
    await testInfo.attach("save-saved-375", { body: await page.screenshot({ animations: "disabled" }), contentType: "image/png" });
    expect(await savedUrls(db, user)).toEqual(["https://example.test/a"]);
  });

  test("/save?text= saves the link found inside the text, and a second visit shows Already saved", async ({ page, db, user }, testInfo) => {
    const shared = "/save?text=look%20at%20this%20https://example.test/b%20ok";
    await page.goto(shared);
    await expect(page.getByRole("heading", { name: "Saved to linkables" })).toBeVisible();

    await page.goto(shared);
    await expect(page.getByRole("heading", { name: "Already saved" })).toBeVisible();
    await expect(page.getByText(/^You saved this on .+ Â· in New$/)).toBeVisible();
    await expect(page.getByRole("button", { name: "Undo" })).toHaveCount(0);
    await testInfo.attach("save-already-375", { body: await page.screenshot({ animations: "disabled" }), contentType: "image/png" });
    expect(await savedUrls(db, user)).toEqual(["https://example.test/b"]);
  });

  test("/save?text=no%20link shows No link found and saves nothing", async ({ page, db, user }, testInfo) => {
    await page.goto("/save?text=no%20link");
    await expect(page.getByRole("heading", { name: "No link found" })).toBeVisible();
    await expect(page.getByRole("textbox", { name: "Link" })).toBeVisible();
    await testInfo.attach("save-no-link-375", { body: await page.screenshot({ animations: "disabled" }), contentType: "image/png" });
    expect(await savedUrls(db, user)).toEqual([]);
  });

  test("/save?url=javascript: saves nothing", async ({ page, db, user }) => {
    const posts: string[] = [];
    page.on("request", (request) => { if (request.method() === "POST") posts.push(request.url()); });
    await page.goto("/save?url=javascript:alert(1)");
    await expect(page.getByRole("heading", { name: "No link found" })).toBeVisible();
    await page.waitForLoadState("networkidle");
    expect(posts).toEqual([]);
    expect(await savedUrls(db, user)).toEqual([]);
  });

  test("a long link never scrolls the page sideways while saving or once saved", async ({ page }) => {
    const longUrl = `https://example.test/${"very-long-path-segment-".repeat(30)}`;
    let releaseSave: () => void = () => undefined;
    const held = new Promise<void>((resolve) => { releaseSave = resolve; });
    await page.route(`${API_URL}/api/v1/links`, async (route) => {
      if (route.request().method() === "POST") await held;
      await route.fallback();
    });
    const overflow = () => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

    await page.goto(`/save?url=${encodeURIComponent(longUrl)}`);
    await expect(page.getByRole("heading", { name: "Savingâ€¦" })).toBeVisible();
    expect(await overflow()).toBeLessThanOrEqual(0);

    releaseSave();
    await expect(page.getByRole("heading", { name: "Saved to linkables" })).toBeVisible();
    expect(await overflow()).toBeLessThanOrEqual(0);
  });

  test("Undo removes a new save", async ({ page, db, user }, testInfo) => {
    await page.goto("/save?url=https://example.test/undo");
    await expect(page.getByRole("heading", { name: "Saved to linkables" })).toBeVisible();
    const deleted = linksResponse(page, "DELETE");
    await page.getByRole("button", { name: "Undo" }).click();
    expect((await deleted).status()).toBe(200);
    await expect(page.getByRole("heading", { name: "Removed" })).toBeVisible();
    await testInfo.attach("save-removed-375", { body: await page.screenshot({ animations: "disabled" }), contentType: "image/png" });
    expect(await savedUrls(db, user)).toEqual([]);
  });

  test.describe("signed out", () => {
    test.use({ signedIn: false });

    test("the save completes after signing in", async ({ page, db, user }, testInfo) => {
      const posts: number[] = [];
      page.on("response", (response) => { if (response.request().method() === "POST") posts.push(response.status()); });
      await page.goto("/save?url=https://example.test/after-sign-in");
      await expect(page).toHaveURL(/\/sign-in$/);
      await expect(page.getByRole("heading", { name: "Sign in to save this link" })).toBeVisible();
      await testInfo.attach("save-signed-out-375", { body: await page.screenshot({ animations: "disabled" }), contentType: "image/png" });

      const saved = linksResponse(page, "POST");
      await page.getByLabel("Email", { exact: true }).fill(user.email);
      await page.getByLabel("Password", { exact: true }).fill(user.password);
      await page.getByRole("button", { name: "Sign in", exact: true }).click();
      expect((await saved).status()).toBe(201);
      await expect(page).toHaveURL(/\/save\?url=/);
      await expect(page.getByRole("heading", { name: "Saved to linkables" })).toBeVisible();
      expect(await savedUrls(db, user)).toEqual(["https://example.test/after-sign-in"]);
      expect(posts, "sign-in succeeds before saving").toEqual([200, 201]);
    });
  });
});

