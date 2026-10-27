import { collectionSchema } from "@linkables/shared/collections";
import { successEnvelopeSchema } from "@linkables/shared/http";
import type { APIRequestContext, Locator, Page } from "@playwright/test";
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

async function file(request: APIRequestContext, user: TestUser, collectionId: string, linkId: string) {
  const response = await request.put(`${API_URL}/api/v1/collections/${collectionId}/links/${linkId}`, {
    headers: { Authorization: `Bearer ${user.accessToken}` },
  });
  expect(response.ok()).toBe(true);
}

// Set GROUPS_SHOTS to a folder to keep a screenshot of each step.
const SHOTS = process.env.GROUPS_SHOTS;

const section = (page: Page, name: string) => page.getByRole("region", { name });
const sectionNames = (page: Page) => page.getByRole("main").getByRole("region").evaluateAll((nodes) => nodes.map((node) => node.getAttribute("aria-label")));

async function newGroup(page: Page, name: string) {
  await page.getByRole("button", { name: "New group", exact: true }).click();
  await page.getByRole("textbox", { name: "New group name" }).fill(name);
  await page.keyboard.press("Enter");
  await expect(section(page, name)).toBeVisible();
}

async function groupMenu(page: Page, group: string, item: string) {
  await page.getByRole("button", { name: `Group options for ${group}` }).click();
  await page.getByRole("menuitem", { name: item }).click();
}

// Desktop: the row's hover Add to… popover. Phone: the swipe tile's sheet, opened by keyboard focus as a swipe would.
async function openAddTo(page: Page, title: RegExp, phone: boolean): Promise<Locator> {
  if (phone) {
    const row = page.getByRole("listitem").filter({ has: page.getByRole("link", { name: title }) });
    await row.getByRole("button", { name: "Add to", exact: true }).focus();
    await page.keyboard.press("Enter");
  } else {
    await page.getByRole("link", { name: title }).hover();
    await page.getByRole("listitem").filter({ has: page.getByRole("link", { name: title }) }).getByRole("button", { name: "Add to…" }).click();
  }
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("list", { name: "Collections" })).toBeVisible();
  return dialog;
}

async function moveToGroup(page: Page, title: RegExp, group: string, phone: boolean) {
  const picker = await openAddTo(page, title, phone);
  const groups = picker.getByRole("group", { name: "Group" });
  await groups.getByRole("button", { name: group }).click();
  await expect(groups.getByRole("button", { name: group })).toHaveAttribute("aria-pressed", "true");
  await page.keyboard.press("Escape");
  await expect(picker).toBeHidden();
}

for (const [label, viewport, phone] of [
  ["1280 px", { width: 1280, height: 800 }, false],
  ["390 px", { width: 390, height: 844 }, true],
] as const) {
  test.describe(`at ${label}`, () => {
    test.use({ viewport, hasTouch: phone });

    test("create a group, move a link in, rename it, move it up, delete it", async ({ page, seedLinks, request, user }) => {
      const collection = await createCollection(request, user, "Rust");
      const seeded = await seedLinks([
        { url: "https://example.com/alpha", resource: { title: "Alpha post", fetchStatus: "fetched" } },
        { url: "https://example.com/beta", resource: { title: "Beta post", fetchStatus: "fetched" } },
      ]);
      for (const { id } of seeded) await file(request, user, collection.id, id);
      const shot = async (name: string) => { if (SHOTS) await page.screenshot({ path: `${SHOTS}/${phone ? "phone" : "desktop"}-${name}.png` }); };

      await page.goto(`/c/${collection.id}`);
      await expect(page.getByRole("link", { name: /^Alpha post/ })).toBeVisible();
      await expect(page.getByRole("heading", { level: 2, name: "Today" })).toBeVisible();

      await newGroup(page, "Reading");
      await expect(section(page, "Ungrouped").locator("[data-row-link]")).toHaveCount(2);
      await expect(section(page, "Reading").getByText("No links yet. Move links here with Add to….")).toBeVisible();
      await expect(page.getByRole("heading", { level: 2, name: "Today" })).toHaveCount(0);

      await page.getByRole("button", { name: "New group", exact: true }).click();
      await page.getByRole("textbox", { name: "New group name" }).fill("reading");
      await page.keyboard.press("Enter");
      await expect(page.getByRole("alert")).toHaveText("You already have a group with that name");
      await shot("new-group-error");
      await page.keyboard.press("Escape");

      const picker = await openAddTo(page, /^Alpha post/, phone);
      await expect(picker.getByRole("group", { name: "Group" })).toBeVisible();
      await page.waitForTimeout(500);
      await shot("move-sheet");
      await picker.getByRole("group", { name: "Group" }).getByRole("button", { name: "Reading" }).click();
      await page.keyboard.press("Escape");
      await expect(picker).toBeHidden();
      await expect(section(page, "Reading").getByRole("link", { name: /^Alpha post/ })).toBeVisible();
      await expect(section(page, "Ungrouped").getByRole("link", { name: /^Alpha post/ })).toHaveCount(0);
      await expect(section(page, "Ungrouped").getByRole("link", { name: /^Beta post/ })).toBeVisible();
      await shot("grouped");

      await groupMenu(page, "Reading", "Rename");
      await page.getByRole("textbox", { name: "Group name" }).fill("To read");
      await page.keyboard.press("Enter");
      await expect(section(page, "To read")).toBeVisible();

      await newGroup(page, "Tools");
      expect(await sectionNames(page)).toEqual(["Ungrouped", "To read", "Tools"]);
      await groupMenu(page, "Tools", "Move up");
      await expect.poll(() => sectionNames(page)).toEqual(["Ungrouped", "Tools", "To read"]);

      await page.reload();
      await expect.poll(() => sectionNames(page)).toEqual(["Ungrouped", "Tools", "To read"]);
      await expect(section(page, "To read").getByRole("link", { name: /^Alpha post/ })).toBeVisible();

      await groupMenu(page, "To read", "Delete");
      await expect(page.getByRole("dialog")).toContainText("Its links stay in the collection.");
      await page.getByRole("dialog").getByRole("button", { name: "Delete group" }).click();
      await expect(section(page, "To read")).toHaveCount(0);
      await expect(section(page, "Ungrouped").getByRole("link", { name: /^Alpha post/ })).toBeVisible();
      await expect(section(page, "Ungrouped").getByRole("link", { name: /^Beta post/ })).toBeVisible();

      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow).toBe(0);
    });

    test("a collection without groups shows no sections", async ({ page, seedLinks, request, user }) => {
      const collection = await createCollection(request, user, "Plain");
      const seeded = await seedLinks([{ url: "https://example.com/only", resource: { title: "Only link", fetchStatus: "fetched" } }]);
      for (const { id } of seeded) await file(request, user, collection.id, id);
      await page.goto(`/c/${collection.id}`);
      await expect(page.getByRole("link", { name: /^Only link/ })).toBeVisible();
      await expect(page.getByRole("heading", { level: 2, name: "Today" })).toBeVisible();
      await expect(section(page, "Ungrouped")).toHaveCount(0);
      await moveToGroupAbsent(page, phone);
    });
  });
}

// With no groups, the Add to… picker has no Group part.
async function moveToGroupAbsent(page: Page, phone: boolean) {
  const picker = await openAddTo(page, /^Only link/, phone);
  await expect(picker.getByRole("group", { name: "Group" })).toHaveCount(0);
}

test.describe("at 1280 px", () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test("collapsing a section hides its links until opened again", async ({ page, seedLinks, request, user }) => {
    const collection = await createCollection(request, user, "Rust");
    const seeded = await seedLinks([{ url: "https://example.com/alpha", resource: { title: "Alpha post", fetchStatus: "fetched" } }]);
    for (const { id } of seeded) await file(request, user, collection.id, id);
    await page.goto(`/c/${collection.id}`);
    await newGroup(page, "Reading");
    await moveToGroup(page, /^Alpha post/, "Reading", false);
    await section(page, "Reading").getByRole("button", { name: /^Reading/ }).click();
    await expect(page.getByRole("link", { name: /^Alpha post/ })).toHaveCount(0);
    await section(page, "Reading").getByRole("button", { name: /^Reading/ }).click();
    await expect(page.getByRole("link", { name: /^Alpha post/ })).toBeVisible();
  });
});
