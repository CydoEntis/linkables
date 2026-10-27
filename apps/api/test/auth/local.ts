import { readFile } from "node:fs/promises";
import { createClient } from "@libsql/client";
import { createLocalAuth, type AuthConfig } from "../../src/auth/local-auth";
import { provisionUser } from "../../src/auth/provision";

export const TEST_AUTH: AuthConfig & { nodeEnv: "test" | "production" | "development" } = {
  nodeEnv: "test",
  appOrigin: "http://localhost:5173",
  secret: "local-test-auth-secret-at-least-32-characters",
  trustedOrigins: ["http://localhost:5173", "chrome-extension://ekgbmopoceccloaibfknnbnohkpbkili"],
};

export async function authFixture() {
  const client = createClient({ url: "file::memory:" });
  await client.executeMultiple(await readFile(new URL("../../sqlite/0002_auth.sql", import.meta.url), "utf8"));
  const auth = createLocalAuth(client, TEST_AUTH);
  return { client, auth, config: TEST_AUTH, close: () => { client.close(); } };
}

export const PASSWORD = "a-strong-test-password-123";

export async function createFixtureUser(fixture: Awaited<ReturnType<typeof authFixture>>, id: string, email: string) {
  await provisionUser(fixture.client, TEST_AUTH, { id, email, name: email, password: PASSWORD });
  const result = await fixture.auth.api.signInEmail({ body: { email, password: PASSWORD } });
  return { id, token: result.token, headers: { Authorization: `Bearer ${result.token}` } };
}
