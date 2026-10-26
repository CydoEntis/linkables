import type { APIRequestContext, BrowserContext, Page, TestInfo } from "@playwright/test";
import type { TestUser } from "../../web/e2e/session";
import { API_URL } from "./env";
import { badgeText, expect, PANEL_URL, recordCopies, tabIdOf, test } from "./fixtures";

// Served by the test, on an origin the e2e build may read, so the panel sees its address and title.
const ARTICLE_URL = `${API_URL}/e2e/kyoto-slow-days`;

async function openArticle(context: BrowserContext): Promise<Page> {
  await context.route(ARTICLE_URL, (route) =>
    route.fulfill({ contentType: "text/html", body: "<!doctype html><title>Kyoto in two slow days</title><h1>Kyoto</h1>" }),
  );
  const article = await context.newPage();
  await article.goto(ARTICLE_URL);
  return article;
}

// Opened as a tab, the panel reads its own tab first: an extension page, which can't be saved.
async function openPanel(context: BrowserContext, email: string): Promise<Page> {
  const panel = await context.newPage();
  await panel.goto(PANEL_URL);
  await panel.getByLabel("Email").fill(email);
  await panel.getByRole("button", { name: "Email me a code" }).click();
  await panel.getByLabel("6-digit code").fill("123456");
  await expect(panel.getByRole("heading", { name: "This page can't be saved" })).toBeVisible();
  return panel;
}

// Sets up the account the way the web app would, through the API.
async function callApi<T>(request: APIRequestContext, user: TestUser, method: "GET" | "POST" | "PATCH", path: string, data?: unknown): Promise<T> {
  const response = await request.fetch(`${API_URL}/api/v1${path}`, {
    method,
    headers: { Authorization: `Bearer ${user.accessToken}` },
    ...(data === undefined ? {} : { data }),
  });
  expect(response.ok(), `${method} ${path}`).toBe(true);
  return ((await response.json()) as { data: T }).data;
}

async function snap(panel: Page, testInfo: TestInfo, name: string) {
  await testInfo.attach(name, { body: await panel.screenshot({ animations: "disabled" }), contentType: "image/png" });
}

test("saves the page the user is on from the side panel, then pins it", async ({ context, request, user }, testInfo) => {
  const article = await openArticle(context);
  const panel = await openPanel(context, user.email);

  // Switching tabs is what the panel follows, as it stays open beside every tab.
  await article.bringToFront();
  await expect(panel.getByText("Kyoto in two slow days")).toBeVisible();
  const tabId = await tabIdOf(panel, ARTICLE_URL);
  expect(await badgeText(panel, tabId)).toBe("");
  await panel.getByRole("button", { name: "Save this page" }).click();
  await expect(panel.getByText("Saved to your links")).toBeVisible();
  await expect.poll(() => badgeText(panel, tabId)).toBe("✓");
  await expect(panel.getByText("In New")).toBeVisible();

  await panel.getByRole("button", { name: "Pin", exact: true }).click();
  await expect(panel.getByRole("button", { name: "Pinned" })).toHaveAttribute("aria-pressed", "true");
  // The e2e API runs no metadata worker, so the list shows the address until a title is fetched.
  await expect(panel.getByRole("list", { name: "Recent links" })).toContainText("/e2e/kyoto-slow-days");
  await snap(panel, testInfo, "panel-saved");

  await expect
    .poll(() => callApi<{ items: { originalUrl: string; savedFrom: string; pinned: boolean }[] }>(request, user, "GET", "/links"))
    .toMatchObject({ items: [{ originalUrl: ARTICLE_URL, savedFrom: "extension", pinned: true }] });
});

// The e2e build may read the article's origin, as a granted Follow the tab you're on would let it.
test("a single-page address change on a readable tab updates the card and the ✓", async ({ context, user }) => {
  const article = await openArticle(context);
  const panel = await openPanel(context, user.email);
  await article.bringToFront();
  await panel.getByRole("button", { name: "Save this page" }).click();
  const tabId = await tabIdOf(panel, ARTICLE_URL);
  await expect.poll(() => badgeText(panel, tabId)).toBe("✓");

  await article.evaluate(() => { history.pushState({}, "", "/e2e/another-dish"); });
  await expect(panel.getByRole("button", { name: "Save this page" })).toBeVisible();
  await expect.poll(() => badgeText(panel, tabId)).toBe("");
});

test("the page card keeps a pin and a collection made in the panel after switching tabs", async ({ context, user }) => {
  const article = await openArticle(context);
  const panel = await openPanel(context, user.email);
  await article.bringToFront();
  await panel.getByRole("button", { name: "Save this page" }).click();
  await panel.getByRole("button", { name: "Pin", exact: true }).click();
  await panel.getByRole("button", { name: "+ Add to" }).click();
  await panel.getByLabel("Search collections").fill("Recipes");
  await panel.getByRole("button", { name: "+ Create “Recipes”" }).click();
  await expect(panel.getByText("In Recipes", { exact: true })).toBeVisible();
  await panel.keyboard.press("Escape");

  await panel.bringToFront();
  await expect(panel.getByRole("heading", { name: "This page can't be saved" })).toBeVisible();
  await article.bringToFront();
  await expect(panel.getByRole("button", { name: "Pinned" })).toHaveAttribute("aria-pressed", "true");
  await expect(panel.getByText("In Recipes", { exact: true })).toBeVisible();
});

test("shows a page saved before as saved, and switches between Recent, Pinned and Collections", async ({ context, request, user }, testInfo) => {
  const pinned = await callApi<{ id: string }>(request, user, "POST", "/links", { url: "https://example.com/pinned-one" });
  await callApi(request, user, "PATCH", `/links/${pinned.id}`, { pinned: true });
  await callApi(request, user, "POST", "/links", { url: ARTICLE_URL });
  await callApi(request, user, "POST", "/collections", { name: "Trip to Japan" });
  const article = await openArticle(context);
  const panel = await openPanel(context, user.email);

  await article.bringToFront();
  await expect(panel.getByText("Saved to your links")).toBeVisible();
  await expect.poll(async () => badgeText(panel, await tabIdOf(panel, ARTICLE_URL))).toBe("✓");

  const recent = panel.getByRole("list", { name: "Recent links" });
  await expect(recent.getByRole("link")).toHaveCount(2);
  await expect(recent.getByRole("link").first()).toContainText("example.com/pinned-one");

  await panel.getByRole("tab", { name: "Pinned" }).click();
  const pinnedList = panel.getByRole("list", { name: "Pinned links" });
  await expect(pinnedList.getByRole("link")).toHaveCount(1);
  await expect(pinnedList).toContainText("example.com/pinned-one");

  await panel.getByRole("tab", { name: "Collections" }).click();
  await expect(panel.getByRole("list", { name: "Collections" })).toContainText("Trip to Japan");
  await expect(panel.getByRole("list", { name: "Collections" })).toContainText("0 links");

  await panel.getByRole("tab", { name: "Recent" }).click();
  await panel.getByLabel("Search your links").fill("pinned-one");
  await expect(recent.getByRole("link")).toHaveCount(1);
  await snap(panel, testInfo, "panel-recent-search");
});

test("shares a collection from the panel: gets the link, copies it, turns it off", async ({ context, request, user }, testInfo) => {
  await callApi(request, user, "POST", "/collections", { name: "Trip to Japan" });
  const panel = await openPanel(context, user.email);

  await panel.getByRole("tab", { name: "Collections" }).click();
  await panel.getByRole("button", { name: "Share Trip to Japan" }).click();
  const sheet = panel.getByRole("dialog", { name: "Share “Trip to Japan”" });
  await expect(sheet.getByText("only you can see it")).toBeVisible();

  await sheet.getByRole("button", { name: "Get share link" }).click();
  await expect(sheet.getByText("Link is on")).toBeVisible();
  const [shared] = (await callApi<{ items: { token: string }[] }>(request, user, "GET", "/collections/shared")).items;
  expect(shared).toBeDefined();
  await expect(sheet.getByLabel("Share link")).toContainText(shared?.token ?? "");

  const copies = await recordCopies(panel);
  await sheet.getByRole("button", { name: "Copy", exact: true }).click();
  await expect(sheet.getByRole("button", { name: "Copied ✓" })).toBeVisible();
  expect(await copies()).toEqual([`${API_URL}/s/${shared?.token ?? ""}`]);
  await snap(panel, testInfo, "panel-share-on");

  await sheet.getByRole("button", { name: "Turn off link" }).click();
  await expect(sheet.getByText("The link stops working right away.", { exact: false })).toBeVisible();
  await sheet.getByRole("button", { name: "Tap again to turn off" }).click();
  await expect(sheet.getByRole("button", { name: "Get share link" })).toBeVisible();
  expect((await callApi<{ items: unknown[] }>(request, user, "GET", "/collections/shared")).items).toEqual([]);
});

// Chrome's permission prompt can't be answered from Playwright, so this covers the
// state before Follow the tab you're on is granted.
test("on a tab it may not read, the panel offers Follow the tab you're on and the shortcut", async ({ context, user }, testInfo) => {
  const elsewhere = "http://unlisted.test/article";
  await context.route(elsewhere, (route) => route.fulfill({ contentType: "text/html", body: "<!doctype html><title>Elsewhere</title>" }));
  const article = await context.newPage();
  await article.goto(elsewhere);
  const panel = await openPanel(context, user.email);

  await article.bringToFront();
  const card = panel.getByRole("region", { name: "This page" });
  await expect(card.getByRole("heading", { name: "linkables can't see this tab yet" })).toBeVisible();
  await expect(card.getByRole("button", { name: "Follow the tab you're on" })).toBeVisible();
  await expect(card).toContainText("Or press Alt+Shift+L to use linkables on just this page.");
  await expect(card).not.toContainText("linkables button");
  await snap(panel, testInfo, "panel-cant-see-tab");

  await panel.getByRole("button", { name: "Extension settings" }).click();
  await expect(panel.getByRole("switch", { name: "Follow the tab you're on" })).toHaveAttribute("aria-checked", "false");
});

test("the gear opens extension settings with the shortcut and the account", async ({ context, user }) => {
  const panel = await openPanel(context, user.email);
  await panel.getByRole("button", { name: "Extension settings" }).click();
  await expect(panel.getByRole("heading", { name: "Extension settings" })).toBeVisible();
  await expect(panel.getByText(user.email)).toBeVisible();
  await expect(panel.locator("kbd")).toHaveText("Alt+Shift+L");

  await panel.getByRole("button", { name: "Sign out" }).click();
  await expect(panel.getByRole("heading", { name: "Sign in to save this page" })).toBeVisible();
});
