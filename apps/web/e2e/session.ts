import { request, type Cookie } from "@playwright/test";
import { sessionSchema } from "@linkables/shared/auth";
import { createDb } from "../../api/src/db/client";
import { provisionUser } from "../../api/src/auth/provision";
import { testDatabaseUrl } from "./database";
import { WELCOME_SEEN_KEY } from "../src/save-anywhere/welcome";
import { API_URL, WEB_URL, AUTH_SECRET } from "./env";

export type TestUser = { id: string; email: string; password: string; accessToken: string; cookies: Cookie[] };
export const TEST_PASSWORD = "local-e2e-password-1234";

export async function createTestUser({ apiUrl = API_URL, appOrigin = WEB_URL } = {}): Promise<TestUser> {
  const id = crypto.randomUUID();
  const email = `${id}@e2e.test`;
  const connection = createDb(testDatabaseUrl());
  await connection.ready;
  try {
    await provisionUser(connection.db.$client, { appOrigin: apiUrl, secret: AUTH_SECRET, trustedOrigins: [appOrigin] }, { id, email, password: TEST_PASSWORD, name: "Test user" });
  } finally {
    await connection.close();
  }
  const client = await request.newContext();
  try {
    const response = await client.post(apiUrl + "/api/v1/auth/sign-in", { data: { email, password: TEST_PASSWORD }, headers: { Origin: appOrigin } });
    if (!response.ok()) throw new Error(`E2E sign-in failed: ${String(response.status())} ${await response.text()}`);
    const body = await response.json() as { data: unknown };
    const session = sessionSchema.parse(body.data);
    return { id, email, password: TEST_PASSWORD, accessToken: session.token, cookies: (await client.storageState()).cookies };
  } finally {
    await client.dispose();
  }
}

export function signedInState(user: TestUser, origin: string, { welcomed = true } = {}) {
  return {
    cookies: user.cookies,
    origins: [{ origin, localStorage: welcomed ? [{ name: WELCOME_SEEN_KEY, value: "1" }] : [] }],
  };
}
