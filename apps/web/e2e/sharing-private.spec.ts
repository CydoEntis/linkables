import { sql } from "drizzle-orm";
import type { Db } from "../../api/src/db/client";
import { collection, collectionItem, shareAllowedEmail } from "../../api/src/db/schema";
import { hashCode } from "../../api/src/sharing/viewer-code";
import { expect, test } from "./fixtures";
import type { SeededLink } from "./seed";

const TOKEN = "Private_Token-For-E2E-0123456789";
const LISTED = "sam@example.com";
const OUTSIDER = "outsider@example.com";
const KNOWN_CODE = "246810";

const LINKS = [{ url: "https://example.com/kyoto", resource: { title: "Kyoto temples", fetchStatus: "fetched" as const } }];

async function privateTrip(db: Db, userId: string, links: SeededLink[]) {
  const [col] = await db.insert(collection).values({ userId, name: "Trip to Japan", shareToken: TOKEN, sharePrivate: true }).returning();
  if (col === undefined) throw new Error("no collection");
  await db.insert(shareAllowedEmail).values({ collectionId: col.id, email: LISTED });
  for (const link of links) await db.insert(collectionItem).values({ collectionId: col.id, savedLinkId: link.id });
  return col;
}

// The mail is not sent under test, so the code the page asked for is swapped for one the test knows.
async function plantCode(db: Db, collectionId: string, email: string) {
  const { salt, hash } = await hashCode(KNOWN_CODE);
  const updated = await db.all(sql`
    update share_code set salt = ${salt}, code_hash = ${hash}
    where collection_id = ${collectionId} and email = ${email}
    returning id`);
  expect(updated, "the page asked for a code").toHaveLength(1);
}

async function isPrivate(db: Db, collectionId: string) {
  const [row] = await db.all(sql`select share_private from collection where id = ${collectionId}`);
  return row?.share_private === 1;
}

test.describe("the owner", () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test("limits a share to listed emails and back to anyone with the link", async ({ page, db, user, seedLinks }) => {
    const [col] = await db.insert(collection).values({ userId: user.id, name: "Trip to Japan", shareToken: TOKEN }).returning();
    if (col === undefined) throw new Error("no collection");
    await seedLinks(LINKS);
    await page.goto(`/c/${col.id}`);

    await page.getByRole("button", { name: "Sharing options" }).click();
    await page.getByRole("menuitem", { name: "Who can see this…" }).click();
    const dialog = page.getByRole("dialog", { name: "Who can see this" });
    await expect(dialog.getByRole("radio", { name: "Anyone with the link" })).toBeChecked();
    await dialog.getByRole("radio", { name: "Only these emails" }).check();
    await dialog.getByRole("button", { name: "Save" }).click();
    await expect(dialog.getByText("Add at least one email, or let anyone with the link in")).toBeVisible();

    await dialog.getByLabel("Emails that can open it").fill(`${LISTED}, Kim@Example.com`);
    await dialog.getByRole("button", { name: "Save" }).click();
    await expect(page.getByText("Only 2 listed emails can open this")).toBeVisible();
    await expect(dialog).toBeHidden();
    expect(await isPrivate(db, col.id)).toBe(true);

    await page.getByRole("button", { name: "Sharing options" }).click();
    await page.getByRole("menuitem", { name: "Who can see this…" }).click();
    await expect(dialog.getByLabel("Emails that can open it")).toHaveValue(`kim@example.com\n${LISTED}`);
    await dialog.getByRole("radio", { name: "Anyone with the link" }).check();
    await dialog.getByRole("button", { name: "Save" }).click();
    await expect(page.getByText("Anyone with the link can open this")).toBeVisible();
    expect(await isPrivate(db, col.id)).toBe(false);
  });
});

test.describe("a viewer", () => {
  test.use({ signedIn: false });

  test("opens a private share with the emailed code, and an unlisted email gets the same screens but no way in", async ({ page, db, user, seedLinks }) => {
    const col = await privateTrip(db, user.id, await seedLinks(LINKS));
    await page.goto(`/s/${TOKEN}`);
    await expect(page.getByRole("heading", { name: "This collection is private" })).toBeVisible();
    await expect(page.getByText("Trip to Japan")).toHaveCount(0);

    await page.getByLabel("Email").fill(OUTSIDER);
    await page.getByRole("button", { name: "Email me a code" }).click();
    await expect(page.getByRole("heading", { name: "Check your email" })).toBeVisible();
    await expect(page.getByText(`If ${OUTSIDER} is on the list`)).toBeVisible();
    await page.getByLabel("6-digit code").fill(KNOWN_CODE);
    await page.getByRole("button", { name: "Open collection" }).click();
    await expect(page.getByText("That code didn't work. Ask for a new one.")).toBeVisible();
    await expect(page.getByText("Kyoto temples")).toHaveCount(0);

    await page.getByRole("button", { name: "Use a different email" }).click();
    await page.getByLabel("Email").fill(LISTED);
    await page.getByRole("button", { name: "Email me a code" }).click();
    await expect(page.getByRole("heading", { name: "Check your email" })).toBeVisible();
    await plantCode(db, col.id, LISTED);
    await page.getByLabel("6-digit code").fill("000000");
    await page.getByRole("button", { name: "Open collection" }).click();
    await expect(page.getByText("That code didn't work. Ask for a new one.")).toBeVisible();

    await page.getByLabel("6-digit code").fill(KNOWN_CODE);
    await page.getByRole("button", { name: "Open collection" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Trip to Japan" })).toBeVisible();
    await expect(page.getByRole("link", { name: /Kyoto temples/ })).toHaveAttribute("href", "https://example.com/kyoto");

    await page.reload();
    await expect(page.getByRole("heading", { level: 1, name: "Trip to Japan" })).toBeVisible();
  });

  test("asks again once the owner removes that address", async ({ page, db, user, seedLinks }) => {
    const col = await privateTrip(db, user.id, await seedLinks(LINKS));
    await page.goto(`/s/${TOKEN}`);
    await page.getByLabel("Email").fill(LISTED);
    await page.getByRole("button", { name: "Email me a code" }).click();
    await expect(page.getByRole("heading", { name: "Check your email" })).toBeVisible();
    await plantCode(db, col.id, LISTED);
    await page.getByLabel("6-digit code").fill(KNOWN_CODE);
    await page.getByRole("button", { name: "Open collection" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Trip to Japan" })).toBeVisible();

    await db.all(sql`delete from share_allowed_email where collection_id = ${col.id}`);
    await db.all(sql`delete from share_viewer_session where collection_id = ${col.id}`);
    await page.reload();

    await expect(page.getByRole("heading", { name: "This collection is private" })).toBeVisible();
  });
});
