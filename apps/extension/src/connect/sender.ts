import type { WorkerRequest } from "./worker-messages";

type Sender = { id?: string; url?: string };
type Where = { extensionId: string; extensionPagesUrl: string; appOrigin: string };

// MessageSender.origin is missing in Firefox, and a moz-extension:// URL has no
// usable `origin` either, so the sender is judged by its `url`. A content script's
// url is the page it runs in, which the browser sets and the page cannot forge.
// The hand-off only from the content script on the app's own pages; Google only
// from the extension's own pages (the pop-up).
export function isAllowedSender(request: WorkerRequest, sender: Sender, where: Where): boolean {
  if (sender.id !== where.extensionId || sender.url === undefined) return false;
  if (request.type === "sign-in-with-google") return sender.url.startsWith(where.extensionPagesUrl);
  return URL.parse(sender.url)?.origin === where.appOrigin;
}
