import { describe, expect, it } from "vitest";
import { memoryStorageArea } from "../test/memory-storage-area";
import { forgetCode, PENDING_CODE_KEY, pendingCode, rememberCodeSent } from "./pending-code";

const SENT_AT = Date.parse("2026-10-26T10:00:00Z");
const minutes = (n: number) => SENT_AT + n * 60_000;

describe("pending code", () => {
  it("resumes a code sent a few minutes ago, for the same address", async () => {
    const area = memoryStorageArea();
    await rememberCodeSent(area, { email: "friend@example.com", sentAt: SENT_AT });
    await expect(pendingCode(area, minutes(4))).resolves.toEqual({ email: "friend@example.com", sentAt: SENT_AT });
  });

  it("does not resume a code sent more than ten minutes ago", async () => {
    const area = memoryStorageArea();
    await rememberCodeSent(area, { email: "friend@example.com", sentAt: SENT_AT });
    await expect(pendingCode(area, minutes(11))).resolves.toBeNull();
  });

  it("has nothing to resume when no code was sent", async () => {
    await expect(pendingCode(memoryStorageArea(), SENT_AT)).resolves.toBeNull();
  });

  it("has nothing to resume once forgotten", async () => {
    const area = memoryStorageArea();
    await rememberCodeSent(area, { email: "friend@example.com", sentAt: SENT_AT });
    await forgetCode(area);
    await expect(pendingCode(area, minutes(1))).resolves.toBeNull();
  });

  it("ignores a stored value it does not recognise", async () => {
    const area = memoryStorageArea();
    await area.set({ [PENDING_CODE_KEY]: { email: 42 } });
    await expect(pendingCode(area, minutes(1))).resolves.toBeNull();
  });
});
