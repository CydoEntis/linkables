import { createHash, randomBytes, randomInt, scrypt, timingSafeEqual } from "node:crypto";
import { SHARE_CODE_LENGTH } from "@linkables/shared/sharing";

const KEY_BYTES = 32;
const SALT_BYTES = 16;
const SESSION_BYTES = 24;

export type HashedCode = { salt: string; hash: string };

export function newCode(): string {
  return String(randomInt(10 ** SHARE_CODE_LENGTH)).padStart(SHARE_CODE_LENGTH, "0");
}

// A code has about 20 bits of entropy, so a plain hash would fall to a leaked row in a blink;
// scrypt with a per-row salt makes each guess cost real time on top of the expiry and the attempt cap.
function derive(code: string, salt: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(code, salt, KEY_BYTES, (error, key) => {
      if (error === null) resolve(key);
      else reject(error);
    });
  });
}

export async function hashCode(code: string): Promise<HashedCode> {
  const salt = randomBytes(SALT_BYTES).toString("base64url");
  return { salt, hash: (await derive(code, salt)).toString("base64url") };
}

export async function codeMatches(code: string, stored: HashedCode): Promise<boolean> {
  const got = await derive(code, stored.salt);
  const want = Buffer.from(stored.hash, "base64url");
  return got.length === want.length && timingSafeEqual(got, want);
}

export function newSessionToken(): string {
  return randomBytes(SESSION_BYTES).toString("base64url");
}

// The token is 192 random bits, so a fast hash is enough; the stored value cannot be replayed as a token.
export function hashSessionToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
