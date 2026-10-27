import { skipNotifyAccountDeleted } from "../src/access/notify-owner";
import { createApp, type AppDeps } from "../src/app";
import { createDb } from "../src/db/client";
import { createLogger, type LogLevel } from "../src/log/logger";
import { FetchError } from "../src/metadata/fetcher";
import { skipSendViewerCode } from "../src/sharing/send-viewer-code";
import { authFixture, createFixtureUser, TEST_AUTH } from "./auth/local";
export { TEST_AUTH } from "./auth/local";

const defaultFixture = await authFixture();
const unreachableDb = createDb("file::memory:").db;

// Tests never reach the network; a test that reads a page passes its own fetchPage.
const offlineFetchPage: AppDeps["fetchPage"] = () => Promise.reject(new FetchError("network", "tests are offline"));

export function captureLogger(level: LogLevel = "debug") {
  const lines: string[] = [];
  return { logger: createLogger(level, (line) => lines.push(line)), lines };
}

export function createTestApp(deps: Partial<AppDeps> = {}) {
  return createApp({
    logger: captureLogger().logger,
    corsOrigins: ["http://localhost:5173"],
    auth: TEST_AUTH,
    db: unreachableDb,
    notifyAccountDeleted: skipNotifyAccountDeleted,
    localAuth: defaultFixture.auth,
    sendViewerCode: skipSendViewerCode,
    fetchPage: offlineFetchPage,
    ...deps,
  });
}

export type TestUser = { id: string; token: string; headers: { Authorization: string } };

let users: Promise<{ a: TestUser; b: TestUser }> | undefined;

export function testUsers(): Promise<{ a: TestUser; b: TestUser }> {
  users ??= (async () => ({
    a: await createFixtureUser(defaultFixture, "0b6e2f3a-5c1d-4e8f-9a2b-3c4d5e6f7a81", "a@example.com"),
    b: await createFixtureUser(defaultFixture, "7d9c1b2a-3e4f-4a5b-8c6d-7e8f9a0b1c22", "b@example.com"),
  }))();
  return users;
}
