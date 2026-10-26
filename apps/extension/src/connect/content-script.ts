import { EXTENSION_CONNECT_PATH, extensionMessageSchema, type ExtensionMessage } from "@linkables/shared/extension-sessions";
import { env } from "../config/env";
import { sessionAnswerSchema, wantsSessionAnswerSchema } from "./worker-messages";

// Injected only on the app's origin, at document_start so it listens before the
// app's first ping. It carries messages between the page and the worker and
// decides nothing itself.
const APP_ORIGIN = new URL(env.VITE_APP_URL).origin;

function readPageMessage(event: MessageEvent): ExtensionMessage | null {
  if (event.source !== window || event.origin !== APP_ORIGIN) return null;
  const parsed = extensionMessageSchema.safeParse(event.data);
  return parsed.success ? parsed.data : null;
}

function postToPage(message: ExtensionMessage): void {
  window.postMessage(message, APP_ORIGIN);
}

const onConnectPage = () => window.location.pathname === EXTENSION_CONNECT_PATH;

async function answerPing(): Promise<void> {
  const explicit = onConnectPage();
  const answer = wantsSessionAnswerSchema.safeParse(await chrome.runtime.sendMessage({ type: "wants-session", explicit }));
  if (!answer.success) return;
  if (answer.data.kind === "hello") postToPage({ type: "linkables:extension-hello", nonce: answer.data.nonce });
  // Already signed in: the connect page can say so straight away.
  if (answer.data.kind === "signed-in" && explicit) postToPage({ type: "linkables:extension-connected", ok: true });
}

async function passSession(nonce: string, tokenHash: string): Promise<void> {
  const reply = await chrome.runtime.sendMessage({ type: "session", nonce, tokenHash, explicit: onConnectPage() });
  const answer = sessionAnswerSchema.safeParse(reply);
  if (answer.success && answer.data.result === "ignored") return;
  postToPage({ type: "linkables:extension-connected", ok: answer.success && answer.data.result === "signed-in" });
}

// Reloading or updating the extension leaves this script running on pages already
// open, cut off from the worker. Those pages just get no hand-off; anything else still surfaces.
function unlessExtensionReloaded(error: unknown): void {
  if (error instanceof Error && error.message.includes("Extension context invalidated")) return;
  throw error;
}

window.addEventListener("message", (event) => {
  const message = readPageMessage(event);
  if (message?.type === "linkables:extension-ping") answerPing().catch(unlessExtensionReloaded);
  if (message?.type === "linkables:extension-session") passSession(message.nonce, message.tokenHash).catch(unlessExtensionReloaded);
});
