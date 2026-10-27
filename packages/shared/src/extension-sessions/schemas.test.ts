import { describe, expect, it } from "vitest";
import { extensionMessageSchema, NONCE_HEX_LENGTH } from "./schemas";

const NONCE = "a".repeat(NONCE_HEX_LENGTH);

describe("extensionMessageSchema", () => {
  it.each([
    { type: "linkables:extension-ping" },
    { type: "linkables:extension-hello", nonce: NONCE },
    { type: "linkables:extension-session", nonce: NONCE, tokenHash: "hash" },
    { type: "linkables:extension-connected", ok: true },
  ])("reads $type", (message) => {
    expect(extensionMessageSchema.parse(message)).toEqual(message);
  });

  it.each([
    ["a message from something else", { type: "other-app:hello", nonce: NONCE }],
    ["a nonce shorter than 128 bits", { type: "linkables:extension-hello", nonce: "abc123" }],
    ["a nonce that is not hex", { type: "linkables:extension-hello", nonce: "z".repeat(NONCE_HEX_LENGTH) }],
    ["a session without a token hash", { type: "linkables:extension-session", nonce: NONCE, tokenHash: "" }],
    ["a string", "linkables:extension-ping"],
  ])("refuses %s", (_case, message) => {
    expect(extensionMessageSchema.safeParse(message).success).toBe(false);
  });
});
