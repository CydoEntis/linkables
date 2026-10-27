import { isAutoConnectPaused, resumeAutoConnect } from "./auto-connect";
import { isPendingNonce, pendingNonce, spendNonce } from "./nonce";
import type { SessionAnswer, WantsSessionAnswer } from "./worker-messages";

// The worker's half of the hand-off from linkables.app (content-script.ts is the page's half).
export type HandoffDeps = {
  local: chrome.storage.StorageArea;
  session: chrome.storage.StorageArea;
  now: () => number;
  hasSession: () => Promise<boolean>;
  // Spends the one-time token on the extension's own session; true once signed in.
  verify: (tokenHash: string) => Promise<boolean>;
  closeTab: (tabId: number) => Promise<void>;
};

export async function wantsSession(explicit: boolean, deps: HandoffDeps): Promise<WantsSessionAnswer> {
  if (await deps.hasSession()) return { kind: "signed-in" };
  if (explicit) await resumeAutoConnect(deps.local);
  else if (await isAutoConnectPaused(deps.local)) return { kind: "no" };
  return { kind: "hello", nonce: await pendingNonce(deps.session, deps.now()) };
}

type Offered = { nonce: string; tokenHash: string; explicit: boolean; tabId: number | undefined };

// A token counts only as an answer to the hello this worker sent: nothing posted
// unasked, or after the hand-off is done, reaches Supabase. A token that fails
// leaves the nonce pending, because two app tabs can each mint one and Supabase
// keeps only the newest; the first token that signs in spends it.
export async function acceptSession({ nonce, tokenHash, explicit, tabId }: Offered, deps: HandoffDeps): Promise<SessionAnswer> {
  if (!(await isPendingNonce(deps.session, nonce, deps.now()))) return { result: "ignored" };
  if (!(await deps.verify(tokenHash))) {
    // Another tab's token may have signed in while this one was checked.
    return (await isPendingNonce(deps.session, nonce, deps.now())) ? { result: "failed" } : { result: "ignored" };
  }
  await spendNonce(deps.session, nonce);
  // The connect page has nothing left to do once the extension is signed in.
  if (explicit && tabId !== undefined) await deps.closeTab(tabId);
  return { result: "signed-in" };
}
