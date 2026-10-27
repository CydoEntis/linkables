import { z } from "zod";

// In chrome.storage.session, which content scripts cannot read: only the worker
// knows the nonce until it hands it to the app's page in a hello.
const NONCE_KEY = "linkables.connect-nonce";
const NONCE_TTL_MS = 2 * 60 * 1000;
const NONCE_BYTES = 16;

const storedSchema = z.object({ nonce: z.string(), expiresAt: z.number() });

export function randomNonce(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(NONCE_BYTES));
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function stored(area: chrome.storage.StorageArea, now: number) {
  const parsed = storedSchema.safeParse((await area.get(NONCE_KEY))[NONCE_KEY]);
  return parsed.success && parsed.data.expiresAt > now ? parsed.data : null;
}

// One hand-off at a time: a second ask while one is pending gets the same nonce.
// Each page that gets it may mint a token for it; acceptSession keeps the nonce
// until one of those tokens signs in.
export async function pendingNonce(area: chrome.storage.StorageArea, now: number): Promise<string> {
  const current = await stored(area, now);
  if (current) return current.nonce;
  const nonce = randomNonce();
  await area.set({ [NONCE_KEY]: { nonce, expiresAt: now + NONCE_TTL_MS } });
  return nonce;
}

export async function isPendingNonce(area: chrome.storage.StorageArea, nonce: string, now: number): Promise<boolean> {
  return (await stored(area, now))?.nonce === nonce;
}

// Spent only by a token that signed in; any other value leaves the pending one alone.
export async function spendNonce(area: chrome.storage.StorageArea, nonce: string): Promise<void> {
  if ((await stored(area, 0))?.nonce === nonce) await area.remove(NONCE_KEY);
}
