import { chromium, test as base, expect, type BrowserContext, type Page } from "@playwright/test";
import { createDb, type Db } from "../../api/src/db/client";
import { testTokenHash } from "../../api/src/extension-sessions/supabase-admin";
import { testDatabaseUrl } from "../../api/test/db-setup";
import { truncateAll } from "../../api/test/truncate";
import { createTestUser, sessionJson, signedInState, type TestUser } from "../../web/e2e/session";
import { EXTENSION_ID } from "../manifest";
import { APP_URL, EXTENSION_DIR, SUPABASE_URL } from "./env";

// What the fake Supabase saw: calls it had no answer for, and each token hash verified.
type SupabaseLog = { unexpected: string[]; verifiedTokenHashes: string[] };

type Fixtures = {
  user: TestUser;
  cleanDb: undefined;
  supabaseLog: SupabaseLog;
  // Signs the user in to the web app on the app origin, as if they had signed in there before.
  signInOnWeb: () => Promise<void>;
  // Opens the pop-up's page in a tab, as Chrome would open it from the toolbar.
  openPopup: () => Promise<Page>;
};

type WorkerFixtures = { db: Db };

export const POPUP_URL = `chrome-extension://${EXTENSION_ID}/popup.html`;

export const PANEL_URL = `chrome-extension://${EXTENSION_ID}/sidepanel.html`;

// The two extension APIs the badge checks call from an extension page.
type ChromeBadgeApis = {
  tabs: { query(info: { url: string }): Promise<{ id?: number }[]> };
  action: { getBadgeText(details: { tabId: number }): Promise<string> };
};

// The e2e build may read the test's own origin, so its tabs can be found by address.
export async function tabIdOf(extensionPage: Page, url: string): Promise<number> {
  const id = await extensionPage.evaluate(async (address) => {
    const { chrome } = globalThis as unknown as { chrome: ChromeBadgeApis };
    const [tab] = await chrome.tabs.query({ url: address });
    return tab?.id ?? null;
  }, url);
  if (id === null) throw new Error(`No tab at ${url}`);
  return id;
}

// What the toolbar button's badge says on that tab.
export function badgeText(extensionPage: Page, tabId: number): Promise<string> {
  return extensionPage.evaluate((id) => {
    const { chrome } = globalThis as unknown as { chrome: ChromeBadgeApis };
    return chrome.action.getBadgeText({ tabId: id });
  }, tabId);
}

type CopyLog = { copied: string[] };

// Chromium won't grant clipboard-read to an extension origin, so the page's
// writes are recorded on their way to the real clipboard.
export async function recordCopies(page: Page): Promise<() => Promise<string[]>> {
  await page.evaluate(() => {
    const log = window as unknown as CopyLog;
    const write = navigator.clipboard.writeText.bind(navigator.clipboard);
    log.copied = [];
    navigator.clipboard.writeText = (text: string) => {
      log.copied.push(text);
      return write(text);
    };
  });
  return () => page.evaluate(() => (window as unknown as CopyLog).copied);
}

// Supabase answers for the code sign-in and for the one-time token the e2e API
// mints for this user (testTokenHash); every other call to it fails the test.
async function fakeSupabase(context: BrowserContext, user: TestUser, log: SupabaseLog): Promise<void> {
  await context.route(`${SUPABASE_URL}/**`, (route) => {
    log.unexpected.push(route.request().url());
    return route.abort();
  });
  await context.route(`${SUPABASE_URL}/auth/v1/otp*`, (route) => route.fulfill({ status: 200, json: {} }));
  await context.route(`${SUPABASE_URL}/auth/v1/verify*`, (route) => {
    const { token_hash: tokenHash } = route.request().postDataJSON() as { token_hash?: string };
    if (tokenHash !== undefined) log.verifiedTokenHashes.push(tokenHash);
    if (tokenHash !== undefined && tokenHash !== testTokenHash(user.id)) {
      log.unexpected.push(`verify with token hash ${tokenHash}`);
      return route.fulfill({ status: 403, json: { code: 403, error_code: "otp_expired", msg: "Token has expired or is invalid" } });
    }
    return route.fulfill({ status: 200, contentType: "application/json", body: sessionJson(user) });
  });
  await context.route(`${SUPABASE_URL}/auth/v1/logout*`, (route) => route.fulfill({ status: 204 }));
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

  // eslint-disable-next-line no-empty-pattern -- Playwright reads fixture dependencies from this pattern.
  supabaseLog: async ({}, use) => {
    await use({ unexpected: [], verifiedTokenHashes: [] });
  },

  // Extensions load only in a persistent context, and only in the full Chromium build.
  context: async ({ user, supabaseLog }, use) => {
    const context = await chromium.launchPersistentContext("", {
      channel: "chromium",
      args: [`--disable-extensions-except=${EXTENSION_DIR}`, `--load-extension=${EXTENSION_DIR}`],
    });
    await fakeSupabase(context, user, supabaseLog);
    await use(context);
    await context.close();
    expect(supabaseLog.unexpected, "the extension called the fake Supabase origin unexpectedly").toEqual([]);
  },

  // A persistent context takes no storageState, so the session goes in before each app page loads.
  signInOnWeb: async ({ context, user }, use) => {
    await use(async () => {
      const [origin] = signedInState(user, APP_URL).origins;
      await context.addInitScript(({ appOrigin, items }) => {
        if (window.location.origin !== appOrigin) return;
        for (const { name, value } of items) window.localStorage.setItem(name, value);
      }, { appOrigin: APP_URL, items: origin?.localStorage ?? [] });
    });
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
