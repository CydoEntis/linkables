import { collectionSchema } from "@linkables/shared/collections";
import { successEnvelopeSchema } from "@linkables/shared/http";
import type { APIRequestContext, Page } from "@playwright/test";
import { API_URL } from "./env";
import { expect, test } from "./fixtures";
import type { TestUser } from "./session";

async function createCollection(request: APIRequestContext, user: TestUser, name: string) {
  const response = await request.post(`${API_URL}/api/v1/collections`, {
    headers: { Authorization: `Bearer ${user.accessToken}` },
    data: { name },
  });
  expect(response.status()).toBe(201);
  return successEnvelopeSchema(collectionSchema).parse(await response.json()).data;
}

function sidebar(page: Page) {
  return page.getByRole("complementary");
}

// Every row has its own Add to… button.
function rowButton(page: Page, title: RegExp, name: string) {
  return page.getByRole("listitem").filter({ has: page.getByRole("link", { name: title }) }).getByRole("button", { name });
}

async function openAddTo(page: Page, title: RegExp) {
  await page.getByRole("link", { name: title }).hover();
  await rowButton(page, title, "Add to…").click();
  return page.getByRole("dialog");
}

test.describe("at 1280 px", () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test("filing a link moves it from To sort to its collection, and back when removed", async ({ page, seedLinks }) => {
    await seedLinks([{ url: "https://doc.rust-lang.org/rust-by-example/", resource: { title: "Rust by Example", fetchStatus: "fetched" } }]);
    const row = /^Rust by Example/;

    await page.goto("/");
    await sidebar(page).getByRole("button", { name: "New collection" }).click();
    await page.getByRole("textbox", { name: "New collection name" }).fill("rust");
    await page.keyboard.press("Enter");
    await expect(page.getByRole("heading", { level: 1, name: /^Rust/ })).toBeVisible();
    await expect(page.getByText("Nothing here yet")).toBeVisible();

    await sidebar(page).getByRole("link", { name: "To sort" }).click();
    await expect(page.getByRole("link", { name: row })).toContainText("To sort");
    const picker = await openAddTo(page, row);
    await picker.getByRole("button", { name: "Rust" }).click();
    await expect(picker.getByRole("button", { name: "Rust" })).toHaveAttribute("aria-pressed", "true");
    await page.keyboard.press("Escape");
    await expect(page.getByRole("link", { name: row })).toHaveCount(0);
    await expect(page.getByText("All sorted")).toBeVisible();

    await sidebar(page).getByRole("link", { name: /^Rust/ }).click();
    await expect(page.getByRole("link", { name: row })).toBeVisible();
    await expect(page.getByText("1 link", { exact: true })).toBeVisible();

    const again = await openAddTo(page, row);
    const refetched = page.waitForResponse(
      (response) => response.url().startsWith(`${API_URL}/api/v1/links?collectionId=`) && response.request().method() === "GET",
    );
    await again.getByRole("button", { name: "Rust" }).click();
    await refetched;
    await expect(again.getByRole("button", { name: "Rust" })).toHaveAttribute("aria-pressed", "false");
    await page.keyboard.press("Escape");
    await expect(page.getByRole("link", { name: row })).toHaveCount(0);

    await sidebar(page).getByRole("link", { name: "To sort" }).click();
    await expect(page.getByRole("link", { name: row })).toContainText("To sort");
  });

  test("closing Add to… returns focus to it, or to the next row when the link leaves", async ({ page, seedLinks, request, user }) => {
    await createCollection(request, user, "Rust");
    await createCollection(request, user, "Books");
    await seedLinks([
      { url: "https://example.com/second", resource: { title: "Second link", fetchStatus: "fetched" } },
      { url: "https://example.com/first", resource: { title: "First link", fetchStatus: "fetched" } },
    ]);
    await page.goto("/?view=inbox");
    await page.getByRole("link", { name: /^First link/ }).focus();
    await page.keyboard.press("Tab");
    const addTo = rowButton(page, /^First link/, "Add to…");
    await expect(addTo).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("textbox", { name: "Find or create a collection" })).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(addTo).toBeFocused();

    // The refetch after filing no longer lists the link; the popover must stay open anyway.
    await page.keyboard.press("Enter");
    const picker = page.getByRole("dialog");
    const refetched = page.waitForResponse(
      (response) => response.url() === `${API_URL}/api/v1/links?view=inbox` && response.request().method() === "GET",
    );
    await picker.getByRole("button", { name: "Rust" }).click();
    const listed = (await (await refetched).json()) as { data: { items: { id: string }[] } };
    expect(listed.data.items).toHaveLength(1);
    await page.waitForTimeout(300);
    await expect(picker).toBeVisible();
    await picker.getByRole("button", { name: "Books" }).click();
    await expect(picker.getByRole("button", { name: "Books" })).toHaveAttribute("aria-pressed", "true");
    await expect(picker.getByRole("button", { name: "Rust" })).toHaveAttribute("aria-pressed", "true");
    await page.keyboard.press("Escape");
    await expect(page.getByRole("link", { name: /^First link/ })).toHaveCount(0);
    await expect(page.getByRole("link", { name: /^Second link/ })).toBeFocused();
  });

  test("dragging a row onto a sidebar collection files it", async ({ page, seedLinks, request, user }) => {
    await createCollection(request, user, "Watch later");
    await seedLinks([{ url: "https://www.youtube.com/watch?v=abc", resource: { title: "Tokyo night walk", kind: "video", fetchStatus: "fetched" } }]);
    await page.goto("/?view=inbox");
    const row = page.getByRole("link", { name: /^Tokyo night walk/ });
    await row.dragTo(sidebar(page).getByRole("link", { name: /^Watch later/ }));
    await expect(row).toHaveCount(0);
    await expect(sidebar(page).getByRole("link", { name: /^Watch later/ })).toContainText("1");
  });

  test("Undo on delete brings the collection back, and nothing is deleted", async ({ page, request, user }) => {
    const japan = await createCollection(request, user, "trip to japan");
    await page.goto(`/c/${japan.id}`);
    await expect(page.getByRole("heading", { level: 1, name: /^Trip to japan/ })).toBeVisible();

    await page.getByRole("button", { name: "Delete collection" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "All links" })).toBeVisible();
    await expect(sidebar(page).getByRole("link", { name: /^Trip to japan/ })).toHaveCount(0);
    await page.getByRole("button", { name: "Undo" }).click();
    await expect(sidebar(page).getByRole("link", { name: /^Trip to japan/ })).toBeVisible();

    // Past the Undo window: the DELETE was never sent.
    await page.waitForTimeout(5_500);
    await page.reload();
    await expect(sidebar(page).getByRole("link", { name: /^Trip to japan/ })).toBeVisible();
  });

  test("Undo still works after the toast is held open past five seconds", async ({ page, request, user }) => {
    const japan = await createCollection(request, user, "trip to japan");
    await page.goto(`/c/${japan.id}`);
    await page.getByRole("button", { name: "Delete collection" }).click();
    const toast = page.getByText(/^Deleted Trip to japan/);
    await toast.hover();
    await page.waitForTimeout(6_000);
    await page.getByRole("button", { name: "Undo" }).click();
    await expect(sidebar(page).getByRole("link", { name: /^Trip to japan/ })).toBeVisible();
    await page.mouse.move(640, 400);
    await page.waitForTimeout(1_000);
    await page.reload();
    await expect(sidebar(page).getByRole("link", { name: /^Trip to japan/ })).toBeVisible();
  });

  test("without Undo the collection is deleted once its toast closes", async ({ page, request, user }) => {
    const japan = await createCollection(request, user, "trip to japan");
    await page.goto(`/c/${japan.id}`);
    await page.getByRole("button", { name: "Delete collection" }).click();
    const deleted = page.waitForResponse(
      (response) => response.url() === `${API_URL}/api/v1/collections/${japan.id}` && response.request().method() === "DELETE",
      { timeout: 10_000 },
    );
    await page.mouse.move(640, 100);
    expect((await deleted).status()).toBe(200);
    await page.reload();
    await expect(page.getByRole("heading", { level: 1, name: "All links" })).toBeVisible();
    await expect(sidebar(page).getByRole("link", { name: /^Trip to japan/ })).toHaveCount(0);
  });


  test("going back to a collection inside its Undo window offers Undo", async ({ page, request, user }) => {
    const japan = await createCollection(request, user, "trip to japan");
    await page.goto(`/c/${japan.id}`);
    await page.getByRole("button", { name: "Delete collection" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "All links" })).toBeVisible();
    await page.goBack();
    await expect(page.getByRole("heading", { level: 1, name: "Deleted" })).toBeVisible();
    await page.getByRole("main").getByRole("button", { name: "Undo" }).click();
    await expect(page.getByRole("heading", { level: 1, name: /^Trip to japan/ })).toBeVisible();
  });
  test("renaming a collection to a name the user has says so", async ({ page, request, user }) => {
    await createCollection(request, user, "Rust");
    const recipes = await createCollection(request, user, "recipes");
    await page.goto(`/c/${recipes.id}`);
    await page.getByRole("button", { name: /^Recipes/ }).click();
    const field = page.getByRole("textbox", { name: "Collection name" });
    await field.fill("rust");
    await field.press("Enter");
    await expect(page.getByRole("alert")).toHaveText("You already have Rust");
    await field.fill("Weeknight recipes");
    await field.press("Enter");
    await expect(page.getByRole("heading", { level: 1, name: /^Weeknight recipes/ })).toBeVisible();
    await expect(sidebar(page).getByRole("link", { name: /^Weeknight recipes/ })).toBeVisible();
  });
});

test.describe("at 375 px", () => {
  test.use({ viewport: { width: 375, height: 780 }, hasTouch: true });

  test("the swipe actions' Add to opens the sheet, and the chip shows the collection", async ({ page, seedLinks, request, user }) => {
    await createCollection(request, user, "Recipes");
    await seedLinks([{ url: "https://www.seriouseats.com/curry", resource: { title: "Japanese curry", fetchStatus: "fetched" } }]);
    await page.goto("/");

    // Keyboard focus opens the tiles as a swipe would.
    await page.getByRole("button", { name: "Add to", exact: true }).focus();
    await page.keyboard.press("Enter");
    const sheet = page.getByRole("dialog");
    await expect(sheet.getByText("Add to a collection")).toBeVisible();
    await sheet.getByRole("button", { name: "Recipes" }).click();
    await expect(sheet.getByRole("button", { name: "Recipes" })).toHaveAttribute("aria-pressed", "true");
    await page.keyboard.press("Escape");

    await page.getByRole("button", { name: "All links" }).click();
    await page.getByRole("dialog").getByRole("link", { name: /^Recipes/ }).click();
    await expect(page.getByRole("button", { name: "Recipes", exact: true })).toHaveAttribute("aria-haspopup", "dialog");
    await expect(page.getByRole("link", { name: /^Japanese curry/ })).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBe(0);
  });
});
