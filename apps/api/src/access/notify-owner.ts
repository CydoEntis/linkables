// Rule 2 exception, allowlisted in eslint.config.js: this posts to Resend's fixed
// API host with our own key, never to a user-supplied URL, so it needs no SSRF guard.
const RESEND_EMAILS_URL = "https://api.resend.com/emails";
const FROM = "linkables <noreply@linkables.app>";
const TO = "support@linkables.app";
const TIMEOUT_MS = 10_000;

export type OwnerNotice = { email: string; name?: string | undefined; useCase?: string | undefined; at: Date };

export type NotifyOwner = (notice: OwnerNotice) => Promise<void>;

export type DeletionNotice = { userId: string; email: string | undefined; at: Date };

export type NotifyAccountDeleted = (notice: DeletionNotice) => Promise<void>;

export type ResendNotifierOptions = { apiKey: string; fetch?: typeof fetch };

type OwnerEmail = { subject: string; text: string };

// The use case is the one answer that may span lines, so it comes last with
// every line indented: no line of it can pass for another field.
function noticeText({ email, name, useCase, at }: OwnerNotice): string {
  const indented = (useCase ?? "(none)").split("\n").map((line) => `    ${line}`).join("\n");
  return `Email: ${email}\nName: ${name ?? "(none)"}\nTime: ${at.toISOString()}\nUse case:\n${indented}\n`;
}

function deletionEmail({ userId, email, at }: DeletionNotice): OwnerEmail {
  return {
    subject: `Delete sign-in account ${email ?? userId} in Supabase`,
    text: `User id: ${userId}\nEmail: ${email ?? "(none)"}\nData deleted: ${at.toISOString()}\n`,
  };
}

function emailOwner({ apiKey, fetch: send = fetch }: ResendNotifierOptions) {
  return async ({ subject, text }: OwnerEmail) => {
    const res = await send(RESEND_EMAILS_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: FROM, to: [TO], subject, text }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    // The status alone: Resend's error body can echo the message, which holds the user's email.
    if (!res.ok) throw new Error(`Resend answered ${String(res.status)}`);
  };
}

export function resendNotifier(options: ResendNotifierOptions): NotifyOwner {
  const send = emailOwner(options);
  return (notice) => send({ subject: "New linkables access request", text: noticeText(notice) });
}

// The owner removes the sign-in record by hand. SUPABASE_SECRET_KEY, when set, is
// used only to sign the extension in, not to delete accounts.
export function resendDeletionNotifier(options: ResendNotifierOptions): NotifyAccountDeleted {
  const send = emailOwner(options);
  return (notice) => send(deletionEmail(notice));
}

export const skipNotifyOwner: NotifyOwner = () => Promise.resolve();

export const skipNotifyAccountDeleted: NotifyAccountDeleted = () => Promise.resolve();
