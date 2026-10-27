import { SHARE_CODE_EXPIRY_MINUTES } from "@linkables/shared/sharing";

// Rule 2 exception, allowlisted in eslint.config.js: this posts to Resend's fixed
// API host with our own key, never to a user-supplied URL, so it needs no SSRF guard.
const RESEND_EMAILS_URL = "https://api.resend.com/emails";
const FROM = "linkables <noreply@linkables.app>";
const TIMEOUT_MS = 10_000;

export type ViewerCodeMessage = { to: string; code: string };

export type SendViewerCode = (message: ViewerCodeMessage) => Promise<void>;

export type ViewerCodeSenderOptions = { apiKey: string; fetch?: typeof fetch };

// The subject and body name no collection, owner or link: the mail provider sees only a code.
function body(code: string): string {
  return [
    `Your linkables code is ${code}`,
    "",
    `Enter it on the page you opened to see the shared collection. It works once and expires in ${String(SHARE_CODE_EXPIRY_MINUTES)} minutes.`,
    "",
    "If you did not ask for this, ignore this email.",
    "",
  ].join("\n");
}

export function resendViewerCodeSender({ apiKey, fetch: send = fetch }: ViewerCodeSenderOptions): SendViewerCode {
  return async ({ to, code }) => {
    const res = await send(RESEND_EMAILS_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: FROM, to: [to], subject: `Your linkables code: ${code}`, text: body(code) }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    // The status alone: Resend's error body can echo the recipient's address.
    if (!res.ok) throw new Error(`Resend answered ${String(res.status)}`);
  };
}

export const skipSendViewerCode: SendViewerCode = () => Promise.resolve();
