import { NONCE_HEX_LENGTH } from "@linkables/shared/extension-sessions";
import { describe, expect, it } from "vitest";
import { memoryStorageArea } from "../test/memory-storage-area";
import { pendingNonce, randomNonce, takeNonce } from "./nonce";

const AT = Date.parse("2026-10-26T10:00:00Z");
const seconds = (n: number) => AT + n * 1000;

describe("connect nonce", () => {
  it("is 128 random bits as hex", () => {
    const nonce = randomNonce();

    expect(nonce).toMatch(new RegExp(`^[0-9a-f]{${String(NONCE_HEX_LENGTH)}}$`));
    expect(randomNonce()).not.toBe(nonce);
  });

  it("is taken once", async () => {
    const area = memoryStorageArea();
    const nonce = await pendingNonce(area, AT);

    await expect(takeNonce(area, nonce, seconds(5))).resolves.toBe(true);
    await expect(takeNonce(area, nonce, seconds(6))).resolves.toBe(false);
  });

  it("refuses a wrong nonce and keeps the right one", async () => {
    const area = memoryStorageArea();
    const nonce = await pendingNonce(area, AT);

    await expect(takeNonce(area, randomNonce(), seconds(5))).resolves.toBe(false);
    await expect(takeNonce(area, nonce, seconds(6))).resolves.toBe(true);
  });

  it("expires after two minutes", async () => {
    const area = memoryStorageArea();
    const nonce = await pendingNonce(area, AT);

    await expect(takeNonce(area, nonce, seconds(120))).resolves.toBe(false);
  });

  it("is handed out again while it is pending, so two asks share one hand-off", async () => {
    const area = memoryStorageArea();
    const nonce = await pendingNonce(area, AT);

    await expect(pendingNonce(area, seconds(30))).resolves.toBe(nonce);
  });

  it("is replaced once expired", async () => {
    const area = memoryStorageArea();
    const nonce = await pendingNonce(area, AT);

    await expect(pendingNonce(area, seconds(121))).resolves.not.toBe(nonce);
  });

  it("refuses everything when none was handed out", async () => {
    await expect(takeNonce(memoryStorageArea(), randomNonce(), AT)).resolves.toBe(false);
  });
});
