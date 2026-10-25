# Confirm signup

**Supabase:** Authentication → Emails → Templates → **Confirm signup**

**Subject:** Your linkables code

Sent the first time an address signs in. Same layout as Magic Link, with the heading "Welcome to linkables".

Paste the full contents of `template.html` into the template body. Placeholders: `{{ .Token }}`, `{{ .ConfirmationURL }}`, `{{ .SiteURL }}`.
