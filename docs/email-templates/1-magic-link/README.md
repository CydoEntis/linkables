# Magic Link

**Supabase:** Authentication → Emails → Templates → **Magic Link**

**Subject:** Your linkables sign-in code

Sent to existing users. The 6-digit code is the hero, with a dark secondary "Sign in to linkables" button.

Paste the full contents of `template.html` into the template body. Placeholders: `{{ .Token }}`, `{{ .ConfirmationURL }}`, `{{ .SiteURL }}`.
