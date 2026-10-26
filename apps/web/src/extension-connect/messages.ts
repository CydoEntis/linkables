import { extensionMessageSchema, type ExtensionMessage } from "@linkables/shared/extension-sessions";

// The extension's content script posts on this window itself, so a message from
// any other window or origin is not the extension.
export function readExtensionMessage(event: MessageEvent): ExtensionMessage | null {
  if (event.source !== window || event.origin !== window.location.origin) return null;
  const parsed = extensionMessageSchema.safeParse(event.data);
  return parsed.success ? parsed.data : null;
}

export function postToExtension(message: ExtensionMessage): void {
  window.postMessage(message, window.location.origin);
}
