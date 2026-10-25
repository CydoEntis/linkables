import { z } from "zod";

// Chrome closes the pop-up as soon as it loses focus, so going to the inbox for the
// code closes it. The address and send time are kept so the next open returns to the
// code step, with Resend still counting from the real send.
export const PENDING_CODE_KEY = "linkables.pending-code";

// Well inside the code's one-hour life; after this a fresh start is less confusing.
const RESUME_MS = 10 * 60 * 1000;

const pendingCodeSchema = z.object({ email: z.string(), sentAt: z.number() });

export type PendingCode = z.infer<typeof pendingCodeSchema>;

export async function rememberCodeSent(area: chrome.storage.StorageArea, pending: PendingCode): Promise<void> {
  await area.set({ [PENDING_CODE_KEY]: pending });
}

export async function pendingCode(area: chrome.storage.StorageArea, now: number): Promise<PendingCode | null> {
  const parsed = pendingCodeSchema.safeParse((await area.get(PENDING_CODE_KEY))[PENDING_CODE_KEY]);
  if (!parsed.success || now - parsed.data.sentAt > RESUME_MS) return null;
  return parsed.data;
}

export async function forgetCode(area: chrome.storage.StorageArea): Promise<void> {
  await area.remove(PENDING_CODE_KEY);
}
