import { extensionSessionSchema } from "@linkables/shared/extension-sessions";
import { useEffect } from "react";
import { api } from "../api/api";
import { postToExtension, readExtensionMessage } from "./messages";

// For the page's lifetime: a nonce the extension repeats still mints one token.
const answered = new Set<string>();

async function answerHello(nonce: string): Promise<void> {
  const session = await api.request("/extension-sessions", extensionSessionSchema, { method: "POST" }).catch(() => null);
  postToExtension(
    session
      ? { type: "linkables:extension-session", nonce, tokenHash: session.tokenHash }
      : { type: "linkables:extension-connected", ok: false },
  );
}

// Signed in, the app pings the extension, which answers with a hello only when it
// is signed out and wants a session; a token goes out only in answer to a hello.
// It asks again on arriving at the connect page, where a paused auto-connect resumes.
export function useExtensionHandoff(signedIn: boolean, onConnectPage: boolean): void {
  useEffect(() => {
    if (!signedIn) return;
    function onMessage(event: MessageEvent) {
      const message = readExtensionMessage(event);
      if (message?.type !== "linkables:extension-hello" || answered.has(message.nonce)) return;
      answered.add(message.nonce);
      void answerHello(message.nonce);
    }
    window.addEventListener("message", onMessage);
    postToExtension({ type: "linkables:extension-ping" });
    return () => { window.removeEventListener("message", onMessage); };
  }, [signedIn, onConnectPage]);
}
