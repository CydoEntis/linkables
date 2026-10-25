# Handoff: linkables Supabase email templates

Each template has its own folder with `template.html` (paste into Supabase) and a short README with its subject line. Upload `images/linkables-logo-2x.png` to `https://linkables.app/email/linkables-logo-2x.png` before sending anything.

Paste each file's HTML into **Supabase → Authentication → Emails → Templates**.

| Template | File | Subject |
|---|---|---|
| Magic Link | `1-magic-link/template.html` | Your linkables sign-in code |
| Confirm signup | `2-confirm-signup/template.html` | Your linkables code |
| Invite user | `3-invite-user/template.html` | You're invited to linkables |
| Change Email Address | `4-change-email-address/template.html` | Confirm your new email address |

Placeholders used: `{{ .Token }}`, `{{ .ConfirmationURL }}`, `{{ .SiteURL }}`. No `{{ .Email }}` or other user-supplied values.

## Image
- `linkables-logo-2x.png`: 64×64 PNG, the app logo (white and lime squares) on a dark rounded tile, so it reads on light and dark backgrounds. **Display size 32×32.** Host at `https://linkables.app/email/linkables-logo-2x.png`.
- With images off, the alt text "linkables" shows, and the wordmark next to it is live text, so the header still reads "linkables".

## Dark mode: light email, built to survive inversion
- `color-scheme: light` / `supported-color-schemes: light` tell Apple Mail and Outlook.com to keep it light.
- Gmail (iOS and Android) and Outlook (Windows) may still force-invert. Every colour pair stays readable inverted: near-black text on white turns near-white on dark grey, the code box stays a darker panel, and the lime button keeps its dark text. 

## Rules followed
- Table layout, inline CSS only, 560px column (fits 600), reads at 320px.
- Font stacks fall back to -apple-system / Segoe UI / Helvetica / Arial. The code uses Menlo / Consolas.
- The code is one text node with no spaces, so long-press selects only the digits.
- The buttons match the landing page:
  - **Primary** is lime, with a 3px darker bottom edge and a dark round arrow chip.
  - **Secondary** is dark #262626 with light text.
  - Both are bulletproof table cells, at least 50px tall, with no images.
  - Outlook for Windows shows square corners.
- All text passes WCAG AA: body #3d3d39 on #fff (10.6:1) · small #5c5c57 on #fff (6.9:1) · footer #66665f on #f4f4f1 (5.4:1) · #16200a on #bef050 (13:1) · #ecebe8 on #262626 (13:1).

## Before launch
- **Upload the logo** to the URL above.
- **Send each template to yourself** in Gmail (web and iPhone), Apple Mail and Outlook, in light and dark mode. The dark previews in the design file are simulated, not real client renders.
