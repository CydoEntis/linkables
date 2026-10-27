import { currentSession, loadSession } from "./session";

export async function readAccessToken(): Promise<string | null> {
  return peekAccessToken() ?? (await loadSession())?.token ?? null;
}

export function peekAccessToken(now = Date.now()): string | null {
  const session = currentSession();
  return session !== null && Date.parse(session.expiresAt) > now + 60_000 ? session.token : null;
}
