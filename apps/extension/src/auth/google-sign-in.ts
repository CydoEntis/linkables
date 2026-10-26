import { googleAnswerSchema, type GoogleAnswer } from "../connect/worker-messages";

// The worker runs the sign-in (worker-sign-in.ts): Chrome closes the pop-up as
// the Google window opens, so the answer only matters if it is still open.
export async function askWorkerForGoogle(): Promise<GoogleAnswer> {
  const answer = googleAnswerSchema.safeParse(await chrome.runtime.sendMessage({ type: "sign-in-with-google" }));
  return answer.success ? answer.data : { ok: false, problem: "failed" };
}

export const GOOGLE_MESSAGES: Record<Exclude<GoogleAnswer, { ok: true }>["problem"], string> = {
  cancelled: "Google sign-in was cancelled.",
  failed: "Couldn't sign in with Google. Try again, or use an email code.",
};
