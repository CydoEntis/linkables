export const SUPPORT_EMAIL = "support@linkables.app";

// Private beta: sign-ups are off in Supabase and the owner adds people by hand.
// Turning this off is the one change that switches the landing and sign-in
// pages back to open sign-up.
export const INVITE_ONLY: boolean = true;

export const REQUEST_ACCESS_HREF = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent("linkables beta access")}`;

export type AccessCta = { label: string; longLabel: string; href: string };

export function primaryCta(inviteOnly: boolean): AccessCta {
  return inviteOnly
    ? { label: "Request access", longLabel: "Request access", href: REQUEST_ACCESS_HREF }
    : { label: "Get started", longLabel: "Get started, it's free", href: "/sign-in" };
}
