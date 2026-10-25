// Rule 2 exception, allowlisted in eslint.config.js: this posts to Resend's fixed
// API host with our own key, never to a user-supplied URL, so it needs no SSRF guard.
const RESEND_EMAILS_URL = "https://api.resend.com/emails";
const FROM = "linkables <noreply@linkables.app>";
const TO = "support@linkables.app";
const TIMEOUT_MS = 10_000;

export type OwnerNotice = { email: string; name?: string | undefined; useCase?: string | undefined; at: Date };

export type NotifyOwner = (notice: OwnerNotice) => Promise<void>;

export type ResendNotifierOptions = { apiKey: string; fetch?: typeof fetch };

// The use case is the one answer that may span lines, so it comes last with
// every line indented: no line of it can pass for another field.
function noticeText({ email, name, useCase, at }: OwnerNotice): string {
  const indented = (useCase ?? "(none)").split("\n").map((line) => `    ${line}`).join("\n");
  return `Email: ${email}\nName: ${name ?? "(none)"}\nTime: ${at.toISOString()}\nUse case:\n${indented}\n`;
}

export function resendNotifier({ apiKey, fetch: send = fetch }: ResendNotifierOptions): NotifyOwner {
  return async (notice) => {
    const res = await send(RESEND_EMAILS_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: FROM, to: [TO], subject: "New linkables access request", text: noticeText(notice) }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    // The status alone: Resend's error body can echo the message, which holds the requester's email.
    if (!res.ok) throw new Error(`Resend answered ${String(res.status)}`);
  };
}

export const skipNotifyOwner: NotifyOwner = () => Promise.resolve();
