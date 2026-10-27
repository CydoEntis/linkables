import type { Page, TestInfo } from "@playwright/test";
import { API_URL, IOS_SHORTCUT_URL } from "./env";
import { expect, test } from "./fixtures";

const USER_AGENTS = {
  android: "Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Mobile Safari/537.36",
  iphone: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1",
  desktop: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36",
};

const WIDTHS = [375, 1280];

// Kept in test-results after a passing run, so the screens can be looked at.
async function shot(page: Page, testInfo: TestInfo, name: string) {
  await page.screenshot({ path: testInfo.outputPath(`${name}.png`), fullPage: true, animations: "disabled" });
}

async function openPage(page: Page) {
  await page.goto("/save-from-anywhere");
  await expect(page.getByRole("heading", { name: "Save from anywhere", level: 1 })).toBeVisible();
  return page.getByRole("region").first();
}

for (const width of WIDTHS) {
  test.describe(`at ${String(width)} px`, () => {
    test.describe("on Android", () => {
      test.use({ userAgent: USER_AGENTS.android, viewport: { width, height: 900 }, hasTouch: true });

      test("leads with adding linkables to the home screen", async ({ page }, testInfo) => {
        const lead = await openPage(page);
        await expect(lead).toHaveAccessibleName("On Android");
        await expect(lead.getByText("Add linkables to your home screen")).toBeVisible();
        await expect(lead.getByText(/Then in any app, tap Share/)).toBeVisible();
        await shot(page, testInfo, `save-anywhere-android-${String(width)}`);
      });
    });

    test.describe("on iPhone", () => {
      test.use({ userAgent: USER_AGENTS.iphone, viewport: { width, height: 900 }, hasTouch: true });

      test("leads with the shortcut and its three-step guide", async ({ page }, testInfo) => {
        const lead = await openPage(page);
        await expect(lead).toHaveAccessibleName("On iPhone or iPad");
        await expect(lead.getByRole("link", { name: "Add the shortcut" })).toHaveAttribute("href", IOS_SHORTCUT_URL);
        await expect(lead.getByRole("listitem")).toHaveCount(3);
        await expect(lead.getByText(/default browser \(usually Safari\), so sign in to linkables there once/)).toBeVisible();
        await shot(page, testInfo, `save-anywhere-iphone-${String(width)}`);
      });
    });

    test.describe("on a computer", () => {
      test.use({ userAgent: USER_AGENTS.desktop, viewport: { width, height: 900 } });

      test("leads with the bookmark button and shows the other ways on request", async ({ page }, testInfo) => {
        const lead = await openPage(page);
        await expect(lead).toHaveAccessibleName("On a computer");
        await expect(lead.getByRole("link", { name: "Save to linkables" })).toHaveAttribute("href", /^javascript:/);
        await expect(lead.getByText("Or drag any link onto your links list.")).toBeVisible();
        await shot(page, testInfo, `save-anywhere-desktop-${String(width)}`);

        await expect(page.getByRole("region", { name: "On Android" })).toBeHidden();
        await page.getByText("See other ways").click();
        await expect(page.getByRole("region", { name: "On Android" })).toBeVisible();
        await expect(page.getByRole("region", { name: "On iPhone or iPad" })).toBeVisible();
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
        expect(overflow).toBe(0);
        await shot(page, testInfo, `save-anywhere-desktop-all-${String(width)}`);
      });
    });
  });
}

test.describe("the first time this device sees the signed-in app", () => {
  test.use({ welcomed: false });

  test("Save from anywhere shows once, can be skipped, and stays skipped after a reload", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/\/save-from-anywhere\?welcome=true/);
    await expect(page.getByRole("heading", { name: "Save from anywhere", level: 1 })).toBeVisible();

    await page.getByRole("link", { name: "Skip" }).click();
    await expect(page.getByRole("heading", { name: "All links", level: 1 })).toBeVisible();

    await page.reload();
    await expect(page.getByRole("heading", { name: "All links", level: 1 })).toBeVisible();
    expect(new URL(page.url()).pathname).toBe("/");
  });

  test("Skip returns to the view the app was opened on", async ({ page }) => {
    await page.goto("/?view=inbox");
    await expect(page.getByRole("heading", { name: "Save from anywhere", level: 1 })).toBeVisible();
    await page.getByRole("link", { name: "Skip" }).click();
    await expect(page.getByRole("heading", { name: "New", level: 1, exact: true })).toBeVisible();
    expect(new URL(page.url()).search).toBe("?view=inbox");
  });
});

test("the empty list and Settings lead to Save from anywhere", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Set up your phone" }).click();
  await expect(page.getByRole("heading", { name: "Save from anywhere", level: 1 })).toBeVisible();
  await page.getByRole("link", { name: "Back to links" }).click();

  await page.getByRole("button", { name: "Account" }).click();
  await page.getByRole("menuitem", { name: "Settings" }).click();
  await page.getByRole("link", { name: "All the ways to save" }).click();
  await expect(page.getByRole("heading", { name: "Save from anywhere", level: 1 })).toBeVisible();
});

test.describe("on a phone", () => {
  test.use({ userAgent: USER_AGENTS.iphone, viewport: { width: 375, height: 780 }, hasTouch: true });

  test("the save sheet points iPhone users to the shortcut and its setup page", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Save a link" }).click();
    const sheet = page.getByRole("dialog");
    await expect(sheet.getByText("Faster: add the Save to linkables shortcut, then in any app tap Share → Save to linkables.")).toBeVisible();
    await sheet.getByRole("link", { name: "See how to save from anywhere" }).click();
    await expect(page.getByRole("heading", { name: "Save from anywhere", level: 1 })).toBeVisible();
    await expect(page.getByRole("dialog")).toHaveCount(0);
  });
});

test.describe("drag and drop at 1280 px", () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test("dropping a text/uri-list link on New saves it", async ({ page, db, user }, testInfo) => {
    await page.goto("/?view=inbox");
    await expect(page.getByRole("heading", { name: "New", level: 1, exact: true })).toBeVisible();
    const dataTransfer = await page.evaluateHandle(() => {
      const data = new DataTransfer();
      data.setData("text/uri-list", "https://example.test/dropped");
      return data;
    });

    await page.dispatchEvent("main", "dragenter", { dataTransfer });
    await expect(page.getByText("Drop to save")).toBeVisible();
    // A real drag repeats dragover; one more keeps the overlay up for the screenshot.
    await page.dispatchEvent("main", "dragover", { dataTransfer });
    await shot(page, testInfo, "drop-to-save-1280");
    const saved = page.waitForResponse((response) => response.url() === `${API_URL}/api/v1/links` && response.request().method() === "POST");
    await page.dispatchEvent("main", "drop", { dataTransfer });
    expect((await saved).status()).toBe(201);

    await expect(page.getByText("Drop to save")).toBeHidden();
    await expect(page.getByRole("link", { name: /example\.test\/dropped/ })).toBeVisible();
    const rows = await db.$client<{ original_url: string }[]>`select original_url from saved_link where user_id = ${user.id}`;
    expect(rows.map((row) => row.original_url)).toEqual(["https://example.test/dropped"]);
  });

  test("after a row is dragged onto a collection and leaves New, an outside link still drops", async ({ page, seedLinks, request, user }) => {
    const created = await request.post(`${API_URL}/api/v1/collections`, {
      headers: { Authorization: `Bearer ${user.accessToken}` },
      data: { name: "Watch later" },
    });
    expect(created.status()).toBe(201);
    await seedLinks([{ url: "https://example.com/filed", resource: { title: "Filed by drag", fetchStatus: "fetched" } }]);
    await page.goto("/?view=inbox");
    const row = page.getByRole("link", { name: /^Filed by drag/ });
    await row.dragTo(page.getByRole("complementary").getByRole("link", { name: /^Watch later/ }));
    await expect(row).toHaveCount(0);

    const dataTransfer = await page.evaluateHandle(() => {
      const data = new DataTransfer();
      data.setData("text/uri-list", "https://example.test/after-filing");
      return data;
    });
    await page.dispatchEvent("main", "dragenter", { dataTransfer });
    await expect(page.getByText("Drop to save")).toBeVisible();
    await page.dispatchEvent("main", "dragover", { dataTransfer });
    await page.dispatchEvent("main", "drop", { dataTransfer });
    await expect(page.getByRole("link", { name: /example\.test\/after-filing/ })).toBeVisible();
  });

  test("dragging a row within the app does not offer to save it", async ({ page, seedLinks }) => {
    await seedLinks([{ url: "https://example.com/row", resource: { title: "A saved row", fetchStatus: "fetched" } }]);
    await page.goto("/");
    await page.evaluate(() => {
      window.addEventListener("dragenter", () => { document.body.dataset.dragEntered = "yes"; });
    });
    const row = page.getByRole("link", { name: /^A saved row/ });
    await row.hover();
    await page.mouse.down();
    const target = await page.getByRole("heading", { name: "All links", level: 1 }).boundingBox();
    await page.mouse.move((target?.x ?? 0) + 10, (target?.y ?? 0) + 10, { steps: 8 });
    await expect(page.locator("body"), "the row really is being dragged").toHaveAttribute("data-drag-entered", "yes");
    await expect(page.getByText("Drop to save")).toHaveCount(0);
    await page.mouse.up();
  });
});
