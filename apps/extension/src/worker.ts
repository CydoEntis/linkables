import { hasSession, signInWithGoogle, verifyTokenHash } from "./auth/worker-sign-in";
import { env } from "./config/env";
import { acceptSession, wantsSession, type HandoffDeps } from "./connect/handoff";
import { workerRequestSchema, type WorkerRequest } from "./connect/worker-messages";

const APP_ORIGIN = new URL(env.VITE_APP_URL).origin;
const EXTENSION_ORIGIN = `chrome-extension://${chrome.runtime.id}`;

const handoff: HandoffDeps = {
  local: chrome.storage.local,
  session: chrome.storage.session,
  now: Date.now,
  hasSession,
  verify: verifyTokenHash,
  closeTab: (tabId) => chrome.tabs.remove(tabId),
};

// The hand-off only from the content script on the app's own pages; Google only
// from the extension's own pages (the pop-up).
function allowed(request: WorkerRequest, sender: chrome.runtime.MessageSender): boolean {
  if (sender.id !== chrome.runtime.id) return false;
  return sender.origin === (request.type === "sign-in-with-google" ? EXTENSION_ORIGIN : APP_ORIGIN);
}

function answer(request: WorkerRequest, sender: chrome.runtime.MessageSender): Promise<unknown> {
  switch (request.type) {
    case "wants-session":
      return wantsSession(request.explicit, handoff);
    case "session":
      return acceptSession({ ...request, tabId: sender.tab?.id }, handoff);
    case "sign-in-with-google":
      return signInWithGoogle();
  }
}

// Registered at the top level, as MV3 requires, so a message can wake the worker.
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const request = workerRequestSchema.safeParse(message);
  if (!request.success || !allowed(request.data, sender)) return undefined;
  answer(request.data, sender).then(sendResponse, (error: unknown) => {
    console.error("linkables worker: request failed", request.data.type, error);
    // The sender reads an answer it cannot parse as a failure.
    sendResponse(null);
  });
  return true;
});
