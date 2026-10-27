import { successEnvelopeSchema } from "@linkables/shared/http";
import { sharedCollectionSchema } from "@linkables/shared/sharing";
import type { Page } from "@playwright/test";
import type { Db } from "../../api/src/db/client";
import { collection, collectionGroup, collectionItem } from "../../api/src/db/schema";
import { API_URL } from "./env";
import { expect, test } from "./fixtures";
import type { SeededLink } from "./seed";

// Set SHARING_SHOTS to a folder to keep a screenshot of each step.
const SHOTS = process.env.SHARING_SHOTS;

const LINKS = [
  { url: "https://example.com/map", resource: { title: "Trip map", fetchStatus: "fetched" as const } },
  { url: "https://example.com/ramen", resource: { title: "Best ramen", description: "Where to eat first", fetchStatus: "fetched" as const } },
  { url: "https://example.com/ryokan", resource: { title: "Quiet ryokan", fetchStatus: "fetched" as const } },
];

async function tripWithGroups(db: Db, userId: string, [map, ramen, ryokan]: SeededLink[]) {
  if (map === undefined || ramen === undefined || ryokan === undefined) throw new Error("seed three links");
  const [col] = await db.insert(collection).values({ userId, name: "Trip to Japan" }).returning();
  if (col === undefined) throw new Error("no collection");
  const [food, hotels] = await db
    .insert(collectionGroup)
    .values([
      { collectionId: col.id, name: "Food", position: 0 },
      { collectionId: col.id, name: "Hotels", position: 1 },
    ])
    .returning();
  if (food === undefined || hotels === undefined) throw new Error("no groups");
  await db.insert(collectionItem).values([
    { collectionId: col.id, savedLinkId: map.id },
    { collectionId: col.id, savedLinkId: ramen.id, groupId: food.id },
    { collectionId: col.id, savedLinkId: ryokan.id, groupId: hotels.id },
  ]);
  return col;
}

async function shareAndOpenMenu(page: Page, collectionId: string) {
  await page.goto(`/c/${collectionId}`);
  await page.getByRole("button", { name: "Share", exact: true }).first().click();
  await expect(page.getByText(/Link (copied|is on) · anyone with it can view/)).toBeVisible();
  await page.getByRole("button", { name: "Sharing options" }).click();
  await expect(page.getByText("What's shared")).toBeVisible();
}

for (const [label, viewport, phone] of [
  ["1280 px", { width: 1280, height: 800 }, false],
  ["390 px", { width: 390, height: 844 }, true],
] as const) {
  test.describe(`at ${label}`, () => {
    test.use({ viewport, hasTouch: phone });

    test("the owner leaves a group out and a signed-out visitor finds no trace of it", async ({ page, browser, request, db, user, seedLinks }) => {
      const shot = async (target: Page, name: string) => { if (SHOTS) await target.screenshot({ path: `${SHOTS}/${phone ? "phone" : "desktop"}-${name}.png`, fullPage: name === "public-page" }); };
      const col = await tripWithGroups(db, user.id, await seedLinks(LINKS));
      await shareAndOpenMenu(page, col.id);
      await expect(page.getByText("2 of 2 groups shared")).toBeVisible();
      await shot(page, "dialog-all-shared");

      const saved = page.waitForResponse((res) => res.url().endsWith("/share/scope") && res.request().method() === "PUT");
      await page.getByRole("menuitemcheckbox", { name: "Hotels" }).click();
      expect((await saved).ok()).toBe(true);
      await expect(page.getByText("1 of 2 groups shared")).toBeVisible();
      await expect(page.getByRole("menuitemcheckbox", { name: "Hotels" })).not.toBeChecked();
      await shot(page, "dialog-hotels-off");

      await page.getByRole("menuitem", { name: "Open shared page" }).evaluate((anchor) => { anchor.removeAttribute("target"); });
      const url = await page.getByRole("menuitem", { name: "Open shared page" }).getAttribute("href");
      if (url === null) throw new Error("no shared url");
      const token = url.split("/").pop() ?? "";

      const raw = await (await request.get(`${API_URL}/api/v1/shared/${token}`)).text();
      expect(successEnvelopeSchema(sharedCollectionSchema).parse(JSON.parse(raw)).data.groups?.map((group) => group.name)).toEqual(["Food"]);
      for (const trace of ["Hotels", "ryokan", "Ryokan"]) expect(raw).not.toContain(trace);

      const visitor = await browser.newContext({ viewport, hasTouch: phone });
      const publicPage = await visitor.newPage();
      await publicPage.goto(url);
      await expect(publicPage.getByRole("heading", { level: 1, name: "Trip to Japan" })).toBeVisible();
      await expect(publicPage.getByRole("heading", { level: 2, name: /^Food/ })).toBeVisible();
      await expect(publicPage.getByRole("link", { name: /Best ramen/ })).toBeVisible();
      await expect(publicPage.getByRole("link", { name: /Trip map/ })).toBeVisible();
      await expect(publicPage.getByRole("button", { name: "Open all 2" })).toBeVisible();
      const html = await publicPage.content();
      for (const trace of ["Hotels", "Quiet ryokan", "ryokan"]) expect(html).not.toContain(trace);
      await publicPage.waitForTimeout(700);
      await shot(publicPage, "public-page");
      expect(await publicPage.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBe(0);
      await visitor.close();
    });
  });
}
