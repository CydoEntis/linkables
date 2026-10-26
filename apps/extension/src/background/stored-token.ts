import { z } from "zod";

// The part of supabase-js's stored session the worker needs; expires_at is in seconds.
const storedSessionSchema = z.object({ access_token: z.string().min(1), expires_at: z.number() });

// A token this close to expiry could lapse on its way to the API.
const MARGIN_MS = 60_000;

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch (error) {
    if (error instanceof SyntaxError) return null;
    throw error;
  }
}

// The worker never refreshes the session (see auth/worker-sign-in.ts): it uses the
// stored access token only while it is still good, and otherwise has none.
export function usableAccessToken(raw: unknown, now: number): string | null {
  if (typeof raw !== "string") return null;
  const session = storedSessionSchema.safeParse(parseJson(raw));
  if (!session.success) return null;
  return session.data.expires_at * 1000 - MARGIN_MS > now ? session.data.access_token : null;
}
