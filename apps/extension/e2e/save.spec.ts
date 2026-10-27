import type { APIRequestContext, BrowserContext, Page, TestInfo } from "@playwright/test";
import type { TestUser } from "../../web/e2e/session";
import { API_URL, APP_URL } from "./env";
import { badgeText, expect, recordCopies, tabIdOf, test } from "./fixtures";

// Served by the test, on an origin the e2e build may read, so the pop-up sees its address and title.
const ARTICLE_URL = `${APP_URL}/e2e/weeknight-pasta`;

async function openArticle(context: BrowserContext): Promise<Page> {
  await context.route(ARTICLE_URL, (route) =>
    route.fulfill({ contentType: "text/html", body: "<!doctype html><title>Weeknight pasta</title><h1>Weeknight pasta</h1>" }),
  );
  const article = await context.newPage();
  await article.goto(ARTICLE_URL);
  return article;
}

async function signIn(popup: Page, email: string) {

  await popup.getByLabel("Email").fill(email);
  await popup.getByLabel("Password", { exact: true }).fill("local-e2e-password-1234");
  await popup.getByRole("button", { name: "Sign in", exact: true }).click();


  // Signed in, the pop-up tries to save its own tab, an extension page.
  await expect(popup.getByRole("heading", { name: "This page can't be saved" })).toBeVisible();
}

// The pop-up saves the active tab when it opens. Opened as a tab here, it is the
// active tab itself until the article is brought back to the front and the pop-up reloads.
async function saveFromPopup(popup: Page, article: Page) {
  await article.bringToFront();
  await popup.reload();
}

type ListedLink = { originalUrl: string; savedFrom: string; pinned: boolean; collections: { name: string }[] };

// What the user's account holds now, as the web app would list it.
async function savedLinks(request: APIRequestContext, user: TestUser): Promise<ListedLink[]> {
  const response = await request.get(`${API_URL}/api/v1/links`, { headers: { Authorization: `Bearer ${user.accessToken}` } });
  const body = (await response.json()) as { data: { items: ListedLink[] } };
  return body.data.items;
}

async function seed<T>(request: APIRequestContext, user: TestUser, path: string, data: unknown): Promise<T> {
  const response = await request.post(`${API_URL}/api/v1${path}`, { headers: { Authorization: `Bearer ${user.accessToken}` }, data });
  expect(response.ok(), path).toBe(true);
  return ((await response.json()) as { data: T }).data;
}

async function snap(popup: Page, testInfo: TestInfo, name: string) {
  await testInfo.attach(name, { body: await popup.locator("#root").screenshot({ animations: "disabled" }), contentType: "image/png" });
}

test("signs in with a local password, then saves the tab the user is on", async ({ context, openPopup, request, user }, testInfo) => {
  const article = await openArticle(context);
  const popup = await openPopup();
  await expect(popup.getByRole("heading", { name: "Sign in to your server" })).toBeVisible();
  await snap(popup, testInfo, "popup-sign-in");

  await signIn(popup, user.email);
  await expect(popup.getByText("Browser pages like Settings don't have a web address.")).toBeVisible();
  await snap(popup, testInfo, "popup-cant-save");

  await saveFromPopup(popup, article);
  await expect(popup.getByRole("heading", { name: "Saved", exact: true })).toBeVisible();
  await expect(popup.getByText("Weeknight pasta")).toBeVisible();
  await expect(popup.getByText("In New")).toBeVisible();
  await snap(popup, testInfo, "popup-saved");

  expect(await savedLinks(request, user)).toMatchObject([{ originalUrl: ARTICLE_URL, savedFrom: "extension", pinned: false, collections: [] }]);
});

test("a saved page gets a âœ“ on the toolbar button until its tab moves on", async ({ context, openPopup, user }) => {
  const article = await openArticle(context);
  const popup = await openPopup();
  await signIn(popup, user.email);
  const tabId = await tabIdOf(popup, ARTICLE_URL);
  expect(await badgeText(popup, tabId)).toBe("");

  await saveFromPopup(popup, article);
  await expect(popup.getByRole("heading", { name: "Saved", exact: true })).toBeVisible();
  await expect.poll(() => badgeText(popup, tabId)).toBe("âœ“");

  const next = `${APP_URL}/e2e/next-page`;
  await context.route(next, (route) => route.fulfill({ contentType: "text/html", body: "<!doctype html><title>Next</title>" }));
  await article.goto(next);
  await expect.poll(() => badgeText(popup, tabId)).toBe("");
});

test("a page saved before shows as Already saved, and can be pinned and filed", async ({ context, openPopup, request, user }, testInfo) => {
  const article = await openArticle(context);
  const popup = await openPopup();
  await signIn(popup, user.email);
  await saveFromPopup(popup, article);
  await expect(popup.getByRole("heading", { name: "Saved", exact: true })).toBeVisible();

  await saveFromPopup(popup, article);
  await expect(popup.getByRole("heading", { name: "Already saved" })).toBeVisible();

  await popup.getByLabel("Search collections").fill("Recipes");
  await popup.getByRole("button", { name: "+ Create â€œRecipesâ€" }).click();
  await expect(popup.getByRole("button", { name: "Recipes", pressed: true })).toBeVisible();
  await expect(popup.getByText("In Recipes")).toBeVisible();

  await popup.getByRole("button", { name: "Pin", exact: true }).click();
  await expect(popup.getByRole("button", { name: "Pinned" })).toHaveAttribute("aria-pressed", "true");
  const copies = await recordCopies(popup);
  await popup.getByRole("button", { name: "Share link" }).click();
  await expect(popup.getByRole("button", { name: "Copied âœ“" })).toBeVisible();
  expect(await copies()).toEqual([ARTICLE_URL]);
  await expect(popup.getByText("Alt+Shift+S saves quietly")).toBeVisible();
  await snap(popup, testInfo, "popup-already-saved-filed");

  await expect
    .poll(() => savedLinks(request, user))
    .toMatchObject([{ originalUrl: ARTICLE_URL, pinned: true, collections: [{ name: "Recipes" }] }]);
});

test("a saved page can be filed in a group of its collection", async ({ context, openPopup, request, user }) => {
  const collection = await seed<{ id: string }>(request, user, "/collections", { name: "Dinners" });
  const mains = await seed<{ id: string }>(request, user, `/collections/${collection.id}/groups`, { name: "Mains" });
  const article = await openArticle(context);
  const popup = await openPopup();
  await signIn(popup, user.email);
  await saveFromPopup(popup, article);
  await expect(popup.getByRole("heading", { name: "Saved", exact: true })).toBeVisible();
  await expect(popup.getByRole("group", { name: /^Group in/ })).toHaveCount(0);

  await popup.getByRole("button", { name: "Dinners", exact: true }).click();
  const choice = popup.getByRole("group", { name: "Group in Dinners" });
  await expect(choice.getByRole("button", { name: "Ungrouped" })).toHaveAttribute("aria-pressed", "true");
  await choice.getByRole("button", { name: "Mains" }).click();
  await expect(choice.getByRole("button", { name: "Mains" })).toHaveAttribute("aria-pressed", "true");

  await expect
    .poll(async () => {
      const response = await request.get(`${API_URL}/api/v1/links?collectionId=${collection.id}&groupId=${mains.id}`, {
        headers: { Authorization: `Bearer ${user.accessToken}` },
      });
      return ((await response.json()) as { data: { items: { originalUrl: string }[] } }).data.items.map((link) => link.originalUrl);
    })
    .toEqual([ARTICLE_URL]);
});

test("signing out returns to sign-in", async ({ openPopup, user }) => {
  const popup = await openPopup();
  await signIn(popup, user.email);

  await popup.getByRole("button", { name: "Sign out" }).click();
  await expect(popup.getByRole("heading", { name: "Sign in to your server" })).toBeVisible();
});

