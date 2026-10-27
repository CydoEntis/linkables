import type { Page } from "@playwright/test";
import { collection, collectionItem } from "../../api/src/db/schema";
import type { Db } from "../../api/src/db/client";
import { expect, test } from "./fixtures";
import type { SeededLink } from "./seed";

const LINKS = ["kyoto", "tokyo", "osaka"].map((name) => ({
  url: `https://example.com/${name}`,
  resource: { title: `Trip ${name}`, fetchStatus: "fetched" as const },
}));

async function fileInto(db: Db, userId: string, links: SeededLink[]) {
  const [row] = await db.insert(collection).values({ userId, name: "Trip" }).returning();
  if (row === undefined) throw new Error("no collection");
  for (const link of links) await db.insert(collectionItem).values({ collectionId: row.id, savedLinkId: link.id });
  return row;
}

// Stands in for window.open so no real tab is made; the page records where each one was sent.
async function recordOpenedTabs(page: Page) {
  await page.addInitScript(() => {
    const tabs: { location: { href: string } }[] = [];
    Object.assign(window, { __tabs: tabs });
    window.open = () => {
      const tab = { opener: {}, location: { href: "" } };
      tabs.push(tab);
      return tab as unknown as Window;
    };
  });
}

function openedTabs(page: Page): Promise<string[]> {
  return page.evaluate(() => (window as unknown as { __tabs: { location: { href: string } }[] }).__tabs.map((tab) => tab.location.href));
}

async function openTrip(page: Page, db: Db, userId: string, seeded: SeededLink[]) {
  const row = await fileInto(db, userId, seeded);
  await recordOpenedTabs(page);
  await page.goto(`/c/${row.id}`);
  await expect(page.getByRole("link", { name: /^Trip kyoto/ })).toBeVisible();
}

test.describe("at 1280 px", () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test("opens the selected links after a confirm, and stops asking when told to", async ({ page, db, user, seedLinks }) => {
    await openTrip(page, db, user.id, await seedLinks(LINKS));

    await page.getByRole("button", { name: "Select" }).click();
    await page.getByRole("checkbox", { name: /^Trip kyoto/ }).click();
    await page.getByRole("checkbox", { name: /^Trip osaka/ }).click();
    await expect(page.getByText("2 selected")).toBeVisible();
    await page.getByRole("button", { name: "Open 2" }).click();

    const dialog = page.getByRole("dialog", { name: "Open 2 links?" });
    await expect(dialog).toContainText("They'll open in new tabs.");
    await dialog.getByRole("checkbox", { name: "Don't ask me again" }).check();
    await dialog.getByRole("button", { name: "Open" }).click();

    expect(await openedTabs(page)).toEqual(["https://example.com/kyoto", "https://example.com/osaka"]);
    await expect(page.getByRole("toolbar")).toBeHidden();

    await page.getByRole("button", { name: "Open all" }).click();
    await expect(page.getByRole("dialog")).toBeHidden();
    await expect.poll(() => openedTabs(page).then((tabs) => tabs.length)).toBe(5);
  });

  test("the setting in Settings brings the confirm back", async ({ page, db, user, seedLinks }) => {
    await openTrip(page, db, user.id, await seedLinks(LINKS));
    await page.evaluate(() => { localStorage.setItem("linkables.askBeforeOpeningMany", "off"); });
    await page.goto("/settings");

    const toggle = page.getByRole("switch", { name: "Ask before opening several links" });
    await expect(toggle).not.toBeChecked();
    await toggle.click();
    await expect(toggle).toBeChecked();

    await page.getByRole("complementary").getByRole("link", { name: /^Trip/ }).click();
    await page.getByRole("button", { name: "Open all" }).click();
    await expect(page.getByRole("dialog", { name: "Open 3 links?" })).toBeVisible();
    await page.getByRole("dialog").getByRole("button", { name: "Open" }).click();
    await expect.poll(() => openedTabs(page).then((tabs) => tabs.length)).toBe(3);
  });

  test("Escape leaves select mode", async ({ page, db, user, seedLinks }) => {
    await openTrip(page, db, user.id, await seedLinks(LINKS));
    await page.getByRole("button", { name: "Select" }).click();
    await expect(page.getByRole("toolbar")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("toolbar")).toBeHidden();
  });
});

test.describe("at 390 px", () => {
  test.use({ viewport: { width: 390, height: 800 }, hasTouch: true });

  test("taps rows to select them and opens them from the bar", async ({ page, db, user, seedLinks }) => {
    await openTrip(page, db, user.id, await seedLinks(LINKS));

    await page.getByRole("button", { name: "Select" }).tap();
    await page.getByRole("checkbox", { name: /^Trip tokyo/ }).tap();
    await page.getByRole("checkbox", { name: /^Trip osaka/ }).tap();
    await page.getByRole("button", { name: "Open 2" }).tap();
    await page.getByRole("dialog", { name: "Open 2 links?" }).getByRole("button", { name: "Open" }).tap();

    expect(await openedTabs(page)).toEqual(["https://example.com/tokyo", "https://example.com/osaka"]);
  });
});
