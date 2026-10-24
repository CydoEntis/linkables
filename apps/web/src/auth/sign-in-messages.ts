import type { VerifyCodeProblem } from "./email-code";
import type { LinkProblem } from "./link-landing";
import type { SendLinkProblem } from "./magic-link";

// An expired link gets its own step, not a message.
export type SignInProblem = SendLinkProblem | VerifyCodeProblem | Exclude<LinkProblem, "expired">;

export const PROBLEM_MESSAGES: Record<SignInProblem, string> = {
  "invalid-email": "Enter an email address, like you@example.com",
  "rate-limited": "Too many tries. Wait a minute, then try again.",
  offline: "You're offline. Check your connection and try again.",
  "not-allowed": "This email can't sign in to linkables.",
  failed: "Something went wrong. Try again.",
  invalid: "This sign-in link didn't work. Send a new one.",
  "google-failed": "Google sign-in didn't finish. Try again.",
  "wrong-code": "That code didn't work. Check it, or send a new one.",
};
