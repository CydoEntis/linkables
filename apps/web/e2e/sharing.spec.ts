import type { BrowserContext, Page } from "@playwright/test";
import type { Db } from "../../api/src/db/client";
import { collection, collectionItem } from "../../api/src/db/schema";
import { expect, test } from "./fixtures";
import type { SeededLink } from "./seed";

const TOKEN = "Shared_Token-For-E2E-0123456789a";

async function fileInto(db: Db, userId: string, links: SeededLink[], shareToken: string | null = null) {
  const [row] = await db.insert(collection).values({ userId, name: "Trip to Japan", shareToken }).returning();
  if (row === undefined) throw new Error("no collection");
  for (const link of links) await db.insert(collectionItem).values({ collectionId: row.id, savedLinkId: link.id });
  return row;
}

const LINKS = [
  {
    url: "https://example.com/kyoto",
    resource: { title: "Kyoto temples", description: "Where to go first", fetchStatus: "fetched" as const },
    link: { note: "private note", titleOverride: "Kyoto, my pick" },
  },
  { url: "https://example.org/tokyo", resource: { title: "Tokyo food", fetchStatus: "fetched" as const } },
];

function shareDialog(page: Page) {
  return page.getByRole("dialog", { name: /^Share/ });
}

// Answers the linked pages so the tabs Open all makes have somewhere to land.
async function stubLinkedPages(context: BrowserContext) {
  await context.route(/https:\/\/example\.(com|org)\/.*/, (route) => route.fulfill({ body: "<title>stub</title>", contentType: "text/html" }));
}

// The browser lets the first pop-up of a click through and blocks the rest,
// then allows everything once the visitor has said yes.
async function blockPopUpsAfterTheFirst(page: Page) {
  await page.addInitScript(() => {
    let calls = 0;
    const open = window.open.bind(window);
    window.open = (...args) => (++calls === 2 ? null : open(...args));
  });
}

test.describe("the owner", () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test("gets a share link, opens it, and turns it off with two taps so it stops working", async ({ page, db, user, seedLinks }) => {
    const col = await fileInto(db, user.id, await seedLinks(LINKS));
    await page.goto(`/c/${col.id}`);

    await page.getByRole("button", { name: "Share", exact: true }).first().click();
    await expect(shareDialog(page).getByText("2 links · only you can see it")).toBeVisible();
    await shareDialog(page).getByRole("button", { name: "Get share link" }).click();
    await expect(shareDialog(page).getByText("Link is on")).toBeVisible();
    await expect(shareDialog(page).getByText("2 links · anyone with the link can view")).toBeVisible();
    const url = await shareDialog(page).getByRole("link", { name: "See what viewers see" }).getAttribute("href");
    expect(url).toMatch(/\/s\/[A-Za-z0-9_-]{32}$/);
    await page.keyboard.press("Escape");
    await expect(page.getByText("Shared", { exact: true })).toBeVisible();
    await expect(page.getByRole("complementary").getByRole("link", { name: /^Trip to Japan\W+shared/ })).toBeVisible();

    await page.goto(url ?? "");
    await expect(page.getByRole("heading", { level: 1, name: "Trip to Japan" })).toBeVisible();
    await expect(page.getByRole("link", { name: /Kyoto, my pick/ })).toHaveAttribute("href", "https://example.com/kyoto");

    await page.goto(`/c/${col.id}`);
    await page.getByRole("button", { name: "Share", exact: true }).first().click();
    await shareDialog(page).getByRole("button", { name: "Turn off link" }).click();
    await expect(shareDialog(page).getByText("The link stops working right away.", { exact: false })).toBeVisible();
    await shareDialog(page).getByRole("button", { name: "Tap again to turn off" }).click();
    await expect(shareDialog(page).getByRole("button", { name: "Get share link" })).toBeVisible();

    await page.goto(url ?? "");
    await expect(page.getByRole("heading", { name: "This shared collection isn't available" })).toBeVisible();
  });
});

test.describe("a visitor who is not signed in", () => {
  test.use({ signedIn: false });

  async function shareSeeded(db: Db, userId: string, links: SeededLink[]) {
    await fileInto(db, userId, links, TOKEN);
  }

  test("sees the collection's links, each opening the original page in a new tab, and nothing private", async ({ page, db, user, seedLinks }) => {
    await shareSeeded(db, user.id, await seedLinks(LINKS));

    await page.goto(`/s/${TOKEN}`);

    await expect(page.getByRole("heading", { level: 1, name: "Trip to Japan" })).toBeVisible();
    await expect(page.getByText(/^2 links · updated \w{3} \d{1,2}$/)).toBeVisible();
    const kyoto = page.getByRole("link", { name: /Kyoto, my pick/ });
    await expect(kyoto).toHaveAttribute("href", "https://example.com/kyoto");
    await expect(kyoto).toHaveAttribute("target", "_blank");
    await expect(kyoto).toHaveAttribute("rel", "noopener noreferrer");
    await expect(kyoto).toContainText("Where to go first");
    await expect(page.getByRole("link", { name: /Tokyo food/ })).toContainText("example.org");
    await expect(page.getByText("private note")).toHaveCount(0);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", "noindex, nofollow");
    await expect(page.getByRole("region", { name: "Made with linkables" }).getByRole("link", { name: "Request access" })).toHaveAttribute(
      "href",
      "/request-access",
    );
  });

  test("switches to a list and back", async ({ page, db, user, seedLinks }) => {
    await shareSeeded(db, user.id, await seedLinks(LINKS));
    await page.goto(`/s/${TOKEN}`);

    await page.getByRole("button", { name: "List" }).click();

    await expect(page.getByRole("button", { name: "List" })).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByRole("link", { name: /Kyoto, my pick/ })).toBeVisible();
  });

  test("opens every link with Open all and ticks each one", async ({ page, context, db, user, seedLinks }) => {
    await shareSeeded(db, user.id, await seedLinks(LINKS));
    await stubLinkedPages(context);
    await page.goto(`/s/${TOKEN}`);

    await page.getByRole("button", { name: "Open all 2" }).click();

    const opened = () => context.pages().slice(1).map((tab) => tab.url()).sort();
    await expect.poll(opened).toEqual(["https://example.com/kyoto", "https://example.org/tokyo"]);
    expect(await Promise.all(context.pages().slice(1).map((tab) => tab.evaluate(() => window.opener as unknown)))).toEqual([null, null]);
    await expect(page.getByText("Opened", { exact: true })).toHaveCount(2);
    await expect(page.getByRole("status")).toHaveCount(0);
  });

  test("is shown how to allow pop-ups when the browser blocks them, then opens the rest", async ({ page, context, db, user, seedLinks }) => {
    await shareSeeded(db, user.id, await seedLinks(LINKS));
    await stubLinkedPages(context);
    await blockPopUpsAfterTheFirst(page);
    await page.goto(`/s/${TOKEN}`);

    await page.getByRole("button", { name: "Open all 2" }).click();

    await expect(page.getByRole("status")).toContainText("Your browser blocked 1 of the 2 links");
    await page.getByRole("button", { name: "Open the other 1" }).click();
    await expect(page.getByRole("status")).toHaveCount(0);
    await expect(page.getByText("Opened", { exact: true })).toHaveCount(2);
  });

  test("on a phone, is asked to tap the links the browser didn't open", async ({ page, context, db, user, seedLinks }) => {
    await shareSeeded(db, user.id, await seedLinks(LINKS));
    await stubLinkedPages(context);
    await blockPopUpsAfterTheFirst(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`/s/${TOKEN}`);

    await page.getByRole("button", { name: "Open all 2" }).click();

    await expect(page.getByRole("status")).toContainText("Your browser opened 1 link");
    await expect(page.getByRole("button", { name: /Open the other/ })).toHaveCount(0);
    await page.getByRole("link", { name: /Kyoto, my pick/ }).click();
    await expect(page.getByRole("status")).toHaveCount(0);
    await expect(page.getByText("Opened", { exact: true })).toHaveCount(2);
  });

  test("gets a friendly page for a link that does not work", async ({ page }) => {
    await page.goto(`/s/${TOKEN}`);

    await expect(page.getByRole("heading", { name: "This shared collection isn't available" })).toBeVisible();
    await expect(page.getByRole("link", { name: "What is linkables?" })).toHaveAttribute("href", "/");
  });

  test("can try again after the collection fails to load, with a reference to quote", async ({ page, db, user, seedLinks }) => {
    await shareSeeded(db, user.id, await seedLinks(LINKS));
    const requestId = "0b6f2c52-6a3e-4a0b-9d4f-2f1c7a1e9e11";
    let failed = false;
    await page.route(`**/api/v1/shared/${TOKEN}`, async (route) => {
      if (failed) return route.continue();
      failed = true;
      await route.fulfill({
        status: 500,
        json: { ok: false, error: { code: "INTERNAL", message: "Something went wrong" }, meta: { requestId, ms: 1, version: "v1" } },
      });
    });
    await page.goto(`/s/${TOKEN}`);

    await expect(page.getByRole("heading", { name: "Couldn't load this collection" })).toBeVisible();
    await expect(page.getByText(`Ref ${requestId}`)).toBeVisible();
    await page.getByRole("button", { name: "Try again" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Trip to Japan" })).toBeVisible();
  });

  test("has no horizontal scroll on a 360 px phone", async ({ page, db, user, seedLinks }) => {
    await shareSeeded(db, user.id, await seedLinks(LINKS));
    await page.setViewportSize({ width: 360, height: 780 });
    await page.goto(`/s/${TOKEN}`);
    await expect(page.getByRole("heading", { level: 1, name: "Trip to Japan" })).toBeVisible();

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBe(0);
  });
});
