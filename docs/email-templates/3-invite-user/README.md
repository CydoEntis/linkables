# Invite user

**Supabase:** Authentication → Emails → Templates → **Invite user**

**Subject:** You're invited to linkables

Private beta invite: one line on what linkables is, a lime "Get your sign-in code" button to the site, and a beta note telling the invitee to enter their email there to get a code.

Paste the full contents of `template.html` into the template body. Placeholders: `{{ .SiteURL }}`.

## Why there is no invite link
The web app signs in with PKCE and refuses the tokens an invite link (`{{ .ConfirmationURL }}`) puts in the URL fragment, so that button would land on an error. The invite email now only points at the site; the invitee signs in with an emailed code like anyone else. Do not use a `token_hash` link: it signs in whoever opens it.

## Verified and not verified
- Verified in the code: the sign-in screen sends the code with `signInWithOtp` and checks it with `verifyOtp({ type: "email" })` (`apps/web/src/auth/magic-link.ts`, `email-code.ts`), and the code comment there records that type `email` covers the code from both the magic-link and the confirm-signup email.
- Not verified against a live project: that an invited, not-yet-confirmed user gets a code from `signInWithOtp` (GoTrue should send its Confirm signup email, whose `{{ .Token }}` verifies as type `email`) and that the invite itself creates the user. Send yourself an invite and try it before relying on this.
