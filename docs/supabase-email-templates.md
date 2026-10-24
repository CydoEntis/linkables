# Supabase email templates

The sign-in page asks for the 6-digit code from the email as well as offering the
link, because single-use links break on iPhone: iOS link previews and the Gmail
in-app browser can spend the link, or open the session in a different browser
from the one the user is in. The code only arrives if the templates include
`{{ .Token }}`.

Paste these in the Supabase dashboard: **Authentication → Emails → Templates**.
Both templates are needed: Supabase sends **Magic Link** to existing users and
**Confirm signup** to an address it has not seen before. Keep `{{ .ConfirmationURL }}`
in both, so clicking the link still signs in.

## Settings to check

Under **Authentication → Providers → Email** (or **Sign In / Providers → Email**):

- **Email OTP Length** must be **6**. The sign-in page accepts exactly six digits.
- **Email OTP Expiration** is 3600 seconds (one hour) by default. The sign-in page
  and these emails say "an hour". If you change it, change the copy in
  `apps/web/src/auth/CodeStep.tsx`, `apps/web/src/auth/SignInScreen.tsx` and here.

Under **Authentication → Rate Limits**:

- The gap between emails to one address is 60 seconds by default. The sign-in
  page holds **Resend** for 60 seconds to match (`RESEND_WAIT_SECONDS` in
  `apps/web/src/auth/CodeStep.tsx`). If you change one, change the other.

## Magic Link

**Subject:** `Your linkables sign-in code`

```html
<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;max-width:440px;margin:0 auto;padding:32px 24px;color:#121212">
  <p style="margin:0 0 24px;font-size:18px;font-weight:700;letter-spacing:-0.02em">linkables</p>
  <h1 style="margin:0 0 12px;font-size:24px;line-height:1.2">Your sign-in code</h1>
  <p style="margin:0 0 20px;font-size:16px;line-height:1.5;color:#444">Type this code on the sign-in page:</p>
  <p style="margin:0 0 24px;padding:16px 0;border-radius:14px;background:#f1f1ee;text-align:center;font-family:'SFMono-Regular',Menlo,Consolas,monospace;font-size:32px;font-weight:700;letter-spacing:0.3em">{{ .Token }}</p>
  <p style="margin:0 0 12px;font-size:16px;line-height:1.5;color:#444">Or sign in with this link, on the device you want to use:</p>
  <p style="margin:0 0 28px"><a href="{{ .ConfirmationURL }}" style="display:inline-block;padding:14px 22px;border-radius:12px;background:#c4f04a;color:#16200a;font-size:16px;font-weight:700;text-decoration:none">Sign in to linkables</a></p>
  <p style="margin:0;font-size:13.5px;line-height:1.5;color:#777">The code and link work once, for an hour. If you didn't ask to sign in, you can ignore this email.</p>
</div>
```

## Confirm signup

**Subject:** `Your linkables code`

```html
<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;max-width:440px;margin:0 auto;padding:32px 24px;color:#121212">
  <p style="margin:0 0 24px;font-size:18px;font-weight:700;letter-spacing:-0.02em">linkables</p>
  <h1 style="margin:0 0 12px;font-size:24px;line-height:1.2">Welcome to linkables</h1>
  <p style="margin:0 0 20px;font-size:16px;line-height:1.5;color:#444">Type this code on the sign-in page to create your free account:</p>
  <p style="margin:0 0 24px;padding:16px 0;border-radius:14px;background:#f1f1ee;text-align:center;font-family:'SFMono-Regular',Menlo,Consolas,monospace;font-size:32px;font-weight:700;letter-spacing:0.3em">{{ .Token }}</p>
  <p style="margin:0 0 12px;font-size:16px;line-height:1.5;color:#444">Or use this link, on the device you want to use:</p>
  <p style="margin:0 0 28px"><a href="{{ .ConfirmationURL }}" style="display:inline-block;padding:14px 22px;border-radius:12px;background:#c4f04a;color:#16200a;font-size:16px;font-weight:700;text-decoration:none">Sign in to linkables</a></p>
  <p style="margin:0;font-size:13.5px;line-height:1.5;color:#777">The code and link work once, for an hour. If you didn't ask for this, you can ignore this email.</p>
</div>
```

## Check it

Send yourself a sign-in email from https://linkables.app/sign-in with a new
address and with an existing one. Each email should show six digits; typing them
on the page signs in, and so does the link.
