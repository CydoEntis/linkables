import { z } from "zod";

// POST /extension-sessions: a one-time sign-in token for the caller's own account,
// which the extension spends on a session of its own.
export const extensionSessionSchema = z.object({ tokenHash: z.string().min(1) });

// 16 random bytes as hex.
export const NONCE_HEX_LENGTH = 32;
const nonceSchema = z.string().regex(new RegExp(`^[0-9a-f]{${String(NONCE_HEX_LENGTH)}}$`));

// The web app and the extension's content script talk over window.postMessage on
// the app's own page (no externally_connectable, which Firefox lacks):
// ping: the signed-in web app asks whether the extension wants a session.
// hello: the extension wants one, and only a session carrying this nonce counts.
// session: the web app's answer to that hello.
// connected: whether the extension signed in, for the page to show.
export const extensionMessageSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("linkables:extension-ping") }),
  z.object({ type: z.literal("linkables:extension-hello"), nonce: nonceSchema }),
  z.object({ type: z.literal("linkables:extension-session"), nonce: nonceSchema, tokenHash: z.string().min(1) }),
  z.object({ type: z.literal("linkables:extension-connected"), ok: z.boolean() }),
]);
