import { test as base, expect } from "@playwright/test";
import { createDb, type Db } from "../../api/src/db/client";
import { testDatabaseUrl } from "../../api/test/db-setup";
import { truncateAll } from "../../api/test/truncate";
import { WEB_URL } from "./env";
import { seedLinks, type SeedLink, type SeededLink } from "./seed";
import { createTestUser, signedInState, type TestUser } from "./session";

type Fixtures = {
  signedIn: boolean;
  welcomed: boolean;
  user: TestUser;
  seedLinks: (links: SeedLink[]) => Promise<SeededLink[]>;
  cleanDb: undefined;
};

type WorkerFixtures = { db: Db };

export const test = base.extend<Fixtures, WorkerFixtures>({
  db: [
    // eslint-disable-next-line no-empty-pattern -- Playwright reads fixture dependencies from this pattern.
    async ({}, use) => {
      const { db, ready, close } = createDb(testDatabaseUrl());
      await ready;
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

  signedIn: [true, { option: true }],
  welcomed: [true, { option: true }],

  // eslint-disable-next-line no-empty-pattern -- Playwright reads fixture dependencies from this pattern.
  user: async ({ cleanDb }, use) => {
    void cleanDb;
    await use(await createTestUser());
  },

  storageState: async ({ signedIn, welcomed, user }, use) => {
    await use(signedIn ? signedInState(user, WEB_URL, { welcomed }) : undefined);
  },

  seedLinks: async ({ db, user }, use) => {
    await use((links) => seedLinks(db, user.id, links));
  },
});

export { expect };

