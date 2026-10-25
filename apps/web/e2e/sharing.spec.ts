import type { Page } from "@playwright/test";
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

test.describe("the owner", () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test("turns a view-only link on, opens it, and turns it off so it stops working", async ({ page, db, user, seedLinks }) => {
    const col = await fileInto(db, user.id, await seedLinks(LINKS));
    await page.goto(`/c/${col.id}`);

    await page.getByRole("button", { name: "Share", exact: true }).first().click();
    await expect(shareDialog(page).getByText("2 links · link sharing is off")).toBeVisible();
    await shareDialog(page).getByRole("button", { name: "Turn on link" }).click();
    const field = shareDialog(page).getByRole("textbox", { name: "Share link" });
    await expect(field).toHaveValue(/\/s\/[A-Za-z0-9_-]{32}$/);
    await expect(shareDialog(page).getByText("2 links · anyone with the link can view")).toBeVisible();
    const url = await field.inputValue();

    await page.goto(url);
    await expect(page.getByRole("heading", { level: 1, name: "Trip to Japan" })).toBeVisible();
    await expect(page.getByRole("link", { name: /Kyoto, my pick/ })).toHaveAttribute("href", "https://example.com/kyoto");

    await page.goto(`/c/${col.id}`);
    await page.getByRole("button", { name: "Share", exact: true }).first().click();
    await shareDialog(page).getByRole("button", { name: "Turn off link" }).click();
    await expect(shareDialog(page).getByRole("button", { name: "Turn on link" })).toBeVisible();

    await page.goto(url);
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
    await expect(page.getByText("2 links", { exact: true })).toBeVisible();
    const kyoto = page.getByRole("link", { name: /Kyoto, my pick/ });
    await expect(kyoto).toHaveAttribute("href", "https://example.com/kyoto");
    await expect(kyoto).toHaveAttribute("target", "_blank");
    await expect(kyoto).toHaveAttribute("rel", "noopener noreferrer");
    await expect(kyoto).toContainText("Where to go first");
    await expect(page.getByRole("link", { name: /Tokyo food/ })).toContainText("example.org");
    await expect(page.getByText("private note")).toHaveCount(0);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", "noindex, nofollow");
    await expect(page.getByRole("link", { name: "Made with linkables" })).toHaveAttribute("href", "/");
  });

  test("opens every link with Open all", async ({ page, context, db, user, seedLinks }) => {
    await shareSeeded(db, user.id, await seedLinks(LINKS));
    await context.route(/https:\/\/example\.(com|org)\/.*/, (route) => route.fulfill({ body: "<title>stub</title>", contentType: "text/html" }));
    await page.goto(`/s/${TOKEN}`);

    await page.getByRole("button", { name: "Open all" }).click();

    const opened = () => context.pages().slice(1).map((tab) => tab.url()).sort();
    await expect.poll(opened).toEqual(["https://example.com/kyoto", "https://example.org/tokyo"]);
    expect(await Promise.all(context.pages().slice(1).map((tab) => tab.evaluate(() => window.opener as unknown)))).toEqual([null, null]);
    await expect(page.getByRole("status")).toHaveText("");
  });

  test("is told to allow pop-ups when the browser blocks them", async ({ page, db, user, seedLinks }) => {
    await shareSeeded(db, user.id, await seedLinks(LINKS));
    await page.addInitScript(() => {
      let allowed = 1;
      const open = window.open.bind(window);
      window.open = (...args) => (allowed-- > 0 ? open(...args) : null);
    });
    await page.goto(`/s/${TOKEN}`);

    await page.getByRole("button", { name: "Open all" }).click();

    await expect(page.getByRole("status")).toHaveText(
      "Your browser blocked 1 link. Allow pop-ups for linkables.app, then press Open all again.",
    );
  });

  test("gets a friendly page for a link that does not work", async ({ page }) => {
    await page.goto(`/s/${TOKEN}`);

    await expect(page.getByRole("heading", { name: "This shared collection isn't available" })).toBeVisible();
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
