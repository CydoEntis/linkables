import { NONCE_HEX_LENGTH } from "@linkables/shared/extension-sessions";
import { describe, expect, it } from "vitest";
import { memoryStorageArea } from "../test/memory-storage-area";
import { isPendingNonce, pendingNonce, randomNonce, spendNonce } from "./nonce";

const AT = Date.parse("2026-10-26T10:00:00Z");
const seconds = (n: number) => AT + n * 1000;

describe("connect nonce", () => {
  it("is 128 random bits as hex", () => {
    const nonce = randomNonce();

    expect(nonce).toMatch(new RegExp(`^[0-9a-f]{${String(NONCE_HEX_LENGTH)}}$`));
    expect(randomNonce()).not.toBe(nonce);
  });

  it("stays pending until it is spent", async () => {
    const area = memoryStorageArea();
    const nonce = await pendingNonce(area, AT);

    await expect(isPendingNonce(area, nonce, seconds(5))).resolves.toBe(true);
    await spendNonce(area, nonce);
    await expect(isPendingNonce(area, nonce, seconds(6))).resolves.toBe(false);
  });

  it("is not a wrong nonce, and a wrong one leaves it pending", async () => {
    const area = memoryStorageArea();
    const nonce = await pendingNonce(area, AT);

    await expect(isPendingNonce(area, randomNonce(), seconds(5))).resolves.toBe(false);
    await spendNonce(area, randomNonce());
    await expect(isPendingNonce(area, nonce, seconds(6))).resolves.toBe(true);
  });

  it("expires after two minutes", async () => {
    const area = memoryStorageArea();
    const nonce = await pendingNonce(area, AT);

    await expect(isPendingNonce(area, nonce, seconds(120))).resolves.toBe(false);
  });

  it("is handed out again while it is pending", async () => {
    const area = memoryStorageArea();
    const nonce = await pendingNonce(area, AT);

    await expect(pendingNonce(area, seconds(30))).resolves.toBe(nonce);
  });

  it("is replaced once expired", async () => {
    const area = memoryStorageArea();
    const nonce = await pendingNonce(area, AT);

    await expect(pendingNonce(area, seconds(121))).resolves.not.toBe(nonce);
  });

  it("is never pending when none was handed out", async () => {
    await expect(isPendingNonce(memoryStorageArea(), randomNonce(), AT)).resolves.toBe(false);
  });
});
