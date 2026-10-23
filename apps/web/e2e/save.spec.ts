import type { Page } from "@playwright/test";
import { API_URL, WEB_URL } from "./env";
import { expect, test } from "./fixtures";
import type { Db } from "../../api/src/db/client";
import { signedInState, type TestUser } from "./session";

function linksResponse(page: Page, method: string) {
  return page.waitForResponse(
    (response) => response.url().startsWith(`${API_URL}/api/v1/links`) && response.request().method() === method,
  );
}

async function savedUrls(db: Db, user: TestUser): Promise<string[]> {
  const rows = await db.$client<{ original_url: string }[]>`select original_url from saved_link where user_id = ${user.id}`;
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
    await expect(page.getByText(/^You saved this on .+ · in To sort$/)).toBeVisible();
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
    expect(posts).toEqual([]);
    expect(await savedUrls(db, user)).toEqual([]);
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

      // The test sign-in: store the session as supabase-js would, then reload the same tab.
      const [origin] = signedInState(user, WEB_URL).origins;
      await page.evaluate((entries) => { for (const { name, value } of entries) localStorage.setItem(name, value); }, origin?.localStorage ?? []);
      const saved = linksResponse(page, "POST");
      await page.reload();
      expect((await saved).status()).toBe(201);
      await expect(page).toHaveURL(/\/save\?url=/);
      await expect(page.getByRole("heading", { name: "Saved to linkables" })).toBeVisible();
      expect(await savedUrls(db, user)).toEqual(["https://example.test/after-sign-in"]);
      expect(posts, "no save is attempted while signed out").toEqual([201]);
    });
  });
});
