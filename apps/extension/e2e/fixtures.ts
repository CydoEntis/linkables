import { chromium, test as base, expect, type BrowserContext, type Page } from "@playwright/test";
import { createDb, type Db } from "../../api/src/db/client";
import { testDatabaseUrl } from "../../api/test/db-setup";
import { truncateAll } from "../../api/test/truncate";
import { createTestUser, sessionJson, type TestUser } from "../../web/e2e/session";
import { EXTENSION_ID } from "../manifest";
import { EXTENSION_DIR, SUPABASE_URL } from "./env";

type Fixtures = {
  user: TestUser;
  cleanDb: undefined;
  // Opens the pop-up's page in a tab, as Chrome would open it from the toolbar.
  openPopup: () => Promise<Page>;
};

type WorkerFixtures = { db: Db };

export const POPUP_URL = `chrome-extension://${EXTENSION_ID}/popup.html`;

// Supabase answers for the code sign-in; every other call to it fails the test.
async function fakeSupabase(context: BrowserContext, user: TestUser): Promise<string[]> {
  const unexpected: string[] = [];
  await context.route(`${SUPABASE_URL}/**`, (route) => {
    unexpected.push(route.request().url());
    return route.abort();
  });
  await context.route(`${SUPABASE_URL}/auth/v1/otp*`, (route) => route.fulfill({ status: 200, json: {} }));
  await context.route(`${SUPABASE_URL}/auth/v1/verify*`, (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: sessionJson(user) }),
  );
  await context.route(`${SUPABASE_URL}/auth/v1/logout*`, (route) => route.fulfill({ status: 204 }));
  return unexpected;
}

export const test = base.extend<Fixtures, WorkerFixtures>({
  db: [
    // eslint-disable-next-line no-empty-pattern -- Playwright reads fixture dependencies from this pattern.
    async ({}, use) => {
      const { db, close } = createDb(testDatabaseUrl());
      await use(db);
      await close();
    },
    { scope: "worker" },
  ],

  // Truncates before, not after, so a failed test leaves its rows to inspect.
  cleanDb: [
    async ({ db }, use) => {
      await truncateAll(db);
      await use(undefined);
    },
    { auto: true },
  ],

  // eslint-disable-next-line no-empty-pattern -- Playwright reads fixture dependencies from this pattern.
  user: async ({}, use) => {
    await use(await createTestUser());
  },

  // Extensions load only in a persistent context, and only in the full Chromium build.
  context: async ({ user }, use) => {
    const context = await chromium.launchPersistentContext("", {
      channel: "chromium",
      args: [`--disable-extensions-except=${EXTENSION_DIR}`, `--load-extension=${EXTENSION_DIR}`],
    });
    const unexpected = await fakeSupabase(context, user);
    await use(context);
    await context.close();
    expect(unexpected, "the extension called the fake Supabase origin unexpectedly").toEqual([]);
  },

  openPopup: async ({ context }, use) => {
    await use(async () => {
      const popup = await context.newPage();
      await popup.goto(POPUP_URL);
      return popup;
    });
  },
});

export { expect };
