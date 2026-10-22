import { createApp, type AppDeps } from "../src/app";
import { createLogger, type LogLevel } from "../src/log/logger";
import { mintToken, testJwks } from "./auth/tokens";

export const TEST_SUPABASE_URL = "https://test-ref.supabase.co";

export const TEST_AUTH: AppDeps["auth"] = {
  nodeEnv: "test",
  issuer: `${TEST_SUPABASE_URL}/auth/v1`,
  jwksUrl: `${TEST_SUPABASE_URL}/auth/v1/.well-known/jwks.json`,
  testJwks: JSON.stringify(testJwks),
};

export function captureLogger(level: LogLevel = "debug") {
  const lines: string[] = [];
  return { logger: createLogger(level, (line) => lines.push(line)), lines };
}

export function createTestApp(deps: Partial<AppDeps> = {}) {
  return createApp({
    logger: captureLogger().logger,
    corsOrigins: ["http://localhost:5173"],
    auth: TEST_AUTH,
    ...deps,
  });
}

export type TestUser = { id: string; token: string; headers: { Authorization: string } };

async function signIn(id: string): Promise<TestUser> {
  const token = await mintToken({ sub: id, supabaseUrl: TEST_SUPABASE_URL });
  return { id, token, headers: { Authorization: `Bearer ${token}` } };
}

export async function testUsers(): Promise<{ a: TestUser; b: TestUser }> {
  const [a, b] = await Promise.all([
    signIn("0b6e2f3a-5c1d-4e8f-9a2b-3c4d5e6f7a81"),
    signIn("7d9c1b2a-3e4f-4a5b-8c6d-7e8f9a0b1c22"),
  ]);
  return { a, b };
}
