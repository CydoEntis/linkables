import { describe, expect, it, vi } from "vitest";
import { memoryStorageArea } from "../test/memory-storage-area";
import { isAutoConnectPaused, pauseAutoConnect } from "./auto-connect";
import { acceptSession, wantsSession, type HandoffDeps } from "./handoff";

const AT = Date.parse("2026-10-26T10:00:00Z");

function deps(overrides: Partial<HandoffDeps> = {}) {
  return {
    local: memoryStorageArea(),
    session: memoryStorageArea(),
    now: () => AT,
    hasSession: vi.fn(() => Promise.resolve(false)),
    verify: vi.fn<HandoffDeps["verify"]>(() => Promise.resolve(true)),
    closeTab: vi.fn<HandoffDeps["closeTab"]>(() => Promise.resolve()),
    ...overrides,
  };
}

async function helloNonce(d: HandoffDeps, explicit = false): Promise<string> {
  const answer = await wantsSession(explicit, d);
  if (answer.kind !== "hello") throw new Error(`expected a hello, got ${answer.kind}`);
  return answer.nonce;
}

describe("wantsSession", () => {
  it("asks for a session while signed out", async () => {
    await expect(wantsSession(false, deps())).resolves.toMatchObject({ kind: "hello" });
  });

  it("asks for nothing while signed in", async () => {
    await expect(wantsSession(false, deps({ hasSession: () => Promise.resolve(true) }))).resolves.toEqual({ kind: "signed-in" });
  });

  it("asks for nothing after the user signed out by hand", async () => {
    const d = deps();
    await pauseAutoConnect(d.local);

    await expect(wantsSession(false, d)).resolves.toEqual({ kind: "no" });
  });

  it("resumes on the connect page after the user signed out by hand", async () => {
    const d = deps();
    await pauseAutoConnect(d.local);

    await expect(wantsSession(true, d)).resolves.toMatchObject({ kind: "hello" });
    await expect(isAutoConnectPaused(d.local)).resolves.toBe(false);
  });
});

describe("acceptSession", () => {
  it("signs in with the token that answers the pending hello", async () => {
    const d = deps();
    const nonce = await helloNonce(d);

    await expect(acceptSession({ nonce, tokenHash: "hash", explicit: false, tabId: 7 }, d)).resolves.toEqual({ result: "signed-in" });
    expect(d.verify).toHaveBeenCalledExactlyOnceWith("hash");
    expect(d.closeTab).not.toHaveBeenCalled();
  });

  it("ignores a wrong nonce without trying the token", async () => {
    const d = deps();
    await helloNonce(d);

    await expect(acceptSession({ nonce: "f".repeat(32), tokenHash: "hash", explicit: false, tabId: 7 }, d)).resolves.toEqual({ result: "ignored" });
    expect(d.verify).not.toHaveBeenCalled();
  });

  it("ignores a nonce used once already", async () => {
    const d = deps();
    const nonce = await helloNonce(d);
    await acceptSession({ nonce, tokenHash: "hash", explicit: false, tabId: 7 }, d);

    await expect(acceptSession({ nonce, tokenHash: "hash-2", explicit: false, tabId: 7 }, d)).resolves.toEqual({ result: "ignored" });
    expect(d.verify).toHaveBeenCalledTimes(1);
  });

  it("keeps the nonce when a token fails, so a newer token for it still signs in", async () => {
    // Two app tabs answer one hello; minting the second token makes Supabase drop the first.
    const d = deps({ verify: vi.fn((tokenHash: string) => Promise.resolve(tokenHash === "second")) });
    const nonce = await helloNonce(d);

    await expect(acceptSession({ nonce, tokenHash: "first", explicit: false, tabId: 7 }, d)).resolves.toEqual({ result: "failed" });
    await expect(acceptSession({ nonce, tokenHash: "second", explicit: false, tabId: 8 }, d)).resolves.toEqual({ result: "signed-in" });
  });

  it("ignores a token that fails after another one for its nonce signed in", async () => {
    let finishFirst: (ok: boolean) => void = () => undefined;
    const verify = vi.fn((tokenHash: string) => (tokenHash === "first" ? new Promise<boolean>((resolve) => { finishFirst = resolve; }) : Promise.resolve(true)));
    const d = deps({ verify });
    const nonce = await helloNonce(d);

    const first = acceptSession({ nonce, tokenHash: "first", explicit: false, tabId: 7 }, d);
    await expect(acceptSession({ nonce, tokenHash: "second", explicit: false, tabId: 8 }, d)).resolves.toEqual({ result: "signed-in" });
    finishFirst(false);

    await expect(first).resolves.toEqual({ result: "ignored" });
  });

  it("ignores a nonce that expired", async () => {
    let at = AT;
    const d = deps({ now: () => at });
    const nonce = await helloNonce(d);
    at += 3 * 60 * 1000;

    await expect(acceptSession({ nonce, tokenHash: "hash", explicit: false, tabId: 7 }, d)).resolves.toEqual({ result: "ignored" });
    expect(d.verify).not.toHaveBeenCalled();
  });

  it("closes the connect page's tab once signed in", async () => {
    const d = deps();
    const nonce = await helloNonce(d, true);

    await acceptSession({ nonce, tokenHash: "hash", explicit: true, tabId: 7 }, d);

    expect(d.closeTab).toHaveBeenCalledExactlyOnceWith(7);
  });

  it("leaves the connect page open when the token does not sign in", async () => {
    const d = deps({ verify: () => Promise.resolve(false) });
    const nonce = await helloNonce(d, true);

    await expect(acceptSession({ nonce, tokenHash: "hash", explicit: true, tabId: 7 }, d)).resolves.toEqual({ result: "failed" });
    expect(d.closeTab).not.toHaveBeenCalled();
  });
});
