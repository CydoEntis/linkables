# Invite user

**Supabase:** Authentication → Emails → Templates → **Invite user**

**Subject:** You're invited to linkables

Private beta invite: one line on what linkables is, a lime "Accept the invite" button, and a beta note.

Paste the full contents of `template.html` into the template body. Placeholders: `{{ .ConfirmationURL }}`, `{{ .SiteURL }}`.
