import { chromium, test as base, expect, type Page } from "@playwright/test";
import { createDb, type Db } from "../../api/src/db/client";
import { testDatabaseUrl } from "../../web/e2e/database";
import { truncateAll } from "../../api/test/truncate";
import { createTestUser, type TestUser } from "../../web/e2e/session";
import { EXTENSION_ID } from "../manifest";
import { API_URL, APP_URL, EXTENSION_DIR } from "./env";

type Fixtures = { user: TestUser; cleanDb: undefined; openPopup: () => Promise<Page> };
type WorkerFixtures = { db: Db };
export const POPUP_URL = `chrome-extension://${EXTENSION_ID}/popup.html`;
export const PANEL_URL = `chrome-extension://${EXTENSION_ID}/sidepanel.html`;

type ChromeBadgeApis = {
  tabs: { query(info: { url: string }): Promise<{ id?: number }[]> };
  action: { getBadgeText(details: { tabId: number }): Promise<string> };
};
export async function tabIdOf(extensionPage: Page, url: string): Promise<number> {
  const id = await extensionPage.evaluate(async (address) => {
    const { chrome } = globalThis as unknown as { chrome: ChromeBadgeApis };
    const [tab] = await chrome.tabs.query({ url: address });
    return tab?.id ?? null;
  }, url);
  if (id === null) throw new Error(`No tab at ${url}`);
  return id;
}
export function badgeText(extensionPage: Page, tabId: number): Promise<string> {
  return extensionPage.evaluate((id) => {
    const { chrome } = globalThis as unknown as { chrome: ChromeBadgeApis };
    return chrome.action.getBadgeText({ tabId: id });
  }, tabId);
}
type CopyLog = { copied: string[] };
export async function recordCopies(page: Page): Promise<() => Promise<string[]>> {
  await page.evaluate(() => {
    const log = window as unknown as CopyLog;
    const write = navigator.clipboard.writeText.bind(navigator.clipboard);
    log.copied = [];
    navigator.clipboard.writeText = (text: string) => { log.copied.push(text); return write(text); };
  });
  return () => page.evaluate(() => (window as unknown as CopyLog).copied);
}

export const test = base.extend<Fixtures, WorkerFixtures>({
  db: [
    // eslint-disable-next-line no-empty-pattern -- Playwright reads fixture dependencies from this pattern.
    async ({}, use) => {
      const { db, ready, close } = createDb(testDatabaseUrl());
      await ready;
      await use(db);
      await close();
    }, { scope: "worker" },
  ],
  cleanDb: [async ({ db }, use) => { await truncateAll(db); await use(undefined); }, { auto: true }],
  // eslint-disable-next-line no-empty-pattern -- Playwright parses fixture dependencies.
  user: async ({}, use) => {
    await use(await createTestUser({ apiUrl: API_URL, appOrigin: APP_URL }));
  },
  context: async ({ user }, use) => {
    expect(user.email).toContain("@e2e.test");
    const context = await chromium.launchPersistentContext("", {
      channel: "chromium",
      args: [`--disable-extensions-except=${EXTENSION_DIR}`, `--load-extension=${EXTENSION_DIR}`],
    });
    await use(context);
    await context.close();
  },
  openPopup: async ({ context }, use) => {
    let initialized = false;
    await use(async () => {
      const popup = await context.newPage();
      await popup.goto(POPUP_URL);
      if (!initialized) {
        // The e2e manifest pregrants loopback host access. Authentication remains real.
        await popup.evaluate(async (origin) => {
          await chrome.storage.local.set({ "linkables.connection": { origin, session: null } });
        }, APP_URL);
        initialized = true;
        await popup.reload();
      }
      return popup;
    });
  },
});
export { expect };
