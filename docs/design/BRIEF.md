# linkaroo — Design brief

For the product designer. This brief covers every surface linkaroo will have, so
the design system is built once and scales. The designs will be implemented by AI
coding agents (Claude Code) reading the Figma file through the Figma MCP server, so
the handoff rules in section 8 matter as much as the visuals.

Sources: `docs/PLANNING.md` (scope and phases), `CONTEXT.md` (terms), `docs/adr/`
(decisions), the Plane tickets (project `linkaroo`, LNK-1 onward), and research on
competitors and platform limits done 2026-10-22.

## 1. The product in one paragraph

Save any URL in seconds, find it later from any device, share it when needed. The
owner today sends themselves YouTube links and articles in Discord and keeps
hundreds of tabs open. Success for Phase 1: save a video at home, find it at work,
with no Discord message and no open tab. The product principles, from the brief:
**save now, organize later; simple before powerful; fast and lightweight; private
by default; useful without AI; your data is portable.** Saving should feel "as easy
as sending a message to yourself."

## 2. Tone and look

- Modern, minimal, fast. Friendly, not enterprise. No dashboards, gimmicks or
  clutter. Approachable for casual users, quick for power users (keyboard-first).
- The name is playful (kangaroo, pouch, hop). There is no logo, palette or type yet;
  the designer proposes the brand. A light, friendly personality on a calm, fast UI
  fits. Avoid the current AI-app clichés (purple-blue gradients, cream + serif +
  terracotta, Inter-by-default).
- Honest voice. Errors say what happened and what to do. AI features (later) always
  say whether they read the page or only its title.

## 3. Words to use

Use these names in the UI and in Figma layer names; the code uses the same ones.

| Term | Meaning |
|---|---|
| Link (saved link) | One user's save of a URL, with their own title, note and pin. |
| Inbox | Saved links that are in no collection. Derived, not a folder. Home view. |
| Collection | A flat, named group of links. A link can be in many collections. |
| Pin | "Keep this handy." A pinned flag and filter. |
| Note | The user's private plain-text note on a link. |
| Kind | `video`, `page` or `other` (files such as PDFs). |

## 4. Scope and fidelity

| Tier | What | Fidelity |
|---|---|---|
| **A** | Phase 1 web app (all of section 5) | Full: every state, 3 breakpoints, light + dark, prototype |
| **A** | Brand basics: logo, favicon set, sign-in email | Full |
| **B** | Phase 2: Chrome extension (popup, side panel), PWA install, phone save | Full screens + key states |
| **C** | Phase 3 sharing, Phase 4 AI, Phase 5 billing | Key screens only, to prove the system scales |
| **D** | Phase 6: marketing site, nested collections, import | One concept each, optional |

Not in Phase 1, so not drawn in Tier A: tags, archive, bulk select, read/unread,
favourites, a grid/list toggle, import, settings page, account deletion, sign-up
page, password or social sign-in, any sharing or AI.

## 5. Tier A — Phase 1 web app

Responsive React web app. **Hard rule: no horizontal scroll at 360 px wide.**
Web routes are not fixed yet; the designer may propose them (e.g. `/`, `/c/:id`,
`/link/:id`, `/sign-in`).

### 5.1 Sign-in
- **Email screen:** one email field, "Email me a sign-in link". No password, no
  sign-up (only the owner can sign in in Phase 1).
- **Check your email:** shows the address, "Use a different email", resend.
- **Link landing:** brief "Signing you in…", then the Inbox.
- States: invalid email; sending; too many emails (the email service allows very
  few per hour — say "Wait a bit and try again"); expired or already-used link
  ("This link has expired. Send a new one."); unknown email; offline.
- Also draw a **code-entry variant** (6–8 digit code, one field, paste-friendly,
  resend with a 60 s countdown). Phase 1 ships the link only, but the extension and
  iPhone home-screen app will need a code, because a link opened from Mail lands in
  a different browser. See decision D3.

### 5.2 App shell
- Nav: Inbox, Collections (with the user's collections listed), search, account
  menu (email, Export my links, Sign out).
- Save box always reachable; focused on page load; submits on Enter; visible Save
  button for touch.
- Mobile: propose the pattern (bottom bar, drawer, or top bar + sheet). The save
  box must be one tap away.

### 5.3 Save a link
- Paste a URL, press Enter. The save returns instantly; the card appears at the top
  in a **pending** state and fills in title, image and icon a few seconds later.
- **Already saved:** not an error. Show "Already saved on Mar 3 · in Rust" with
  Open and Add note actions, and point at the existing card.
- Errors: not a web address / too long ("Links must start with http:// or
  https://"); too many saves in a minute; collection not found; offline; generic
  failure with Retry.

### 5.4 Inbox (home)
- Newest first. Loads 50 at a time (propose infinite scroll or "Load more").
- States: first-load skeleton; **empty** (a new user: invite the first save;
  Inbox zero after filing everything: celebrate quietly); error; cards still
  pending; a link leaves the Inbox when filed into a collection.

### 5.5 Link card — the most important component
Fields: thumbnail, favicon, title (user's title, else fetched title, else URL),
domain, saved date, pinned mark, note excerpt, kind, author (video channel).
Clicking the card opens the original URL; actions open the detail or a menu.

Variants to draw:
- **Article / page** with image; without image; without favicon.
- **YouTube video**: 16:9 crop (YouTube's reliable thumbnail is 4:3 with black
  bars), play badge, channel name. Usually no favicon.
- **Other / file** (e.g. PDF): no title fetched; shows the file name or URL.
- **Pending**: only the URL and domain are known. Can last seconds, sometimes
  minutes.
- **Fetch failed**: title falls back to the URL; no image. The link is still saved
  and editable. Make it calm, not alarming.
- With a user title, with a long note, pinned, very long title or URL (2048 chars).
- In dark mode, images and favicons sit on a neutral tile.

Image fallbacks, in order: page image, then favicon on a soft tile, then a **letter
tile** (first letter of the domain on a colour picked from the domain, from a fixed
8–12 colour palette checked for contrast in both themes), then a generic link icon.
Always show the domain as text. Favicons only at 16–20 px; they are often blurry.

Propose a default density. Research says a dense list (favicon, title, domain,
date, note) beats a thumbnail grid for power users; thumbnails help with videos.

### 5.6 Link detail / edit
Page, side sheet or modal (designer's call). Shows the fetched title, description,
image, author, kind, saved date, original URL and which collections it is in.
Edit: title (clear it to go back to the fetched one), note (plain text), pin,
collections, delete. States: loading, saving, saved, not found ("This link isn't
in your library"), pending or failed fetch shown in the header.

### 5.7 Delete
Delete removes it from your library only. Propose a confirm dialog or an undo
toast (undo preferred).

### 5.8 Collections
- **List:** names only (no counts, covers or colours in Phase 1, but leave room).
  Create, rename, delete, open. Empty state.
- **Create / rename:** name field. Duplicate name error ("You already have a
  collection called Rust").
- **Delete:** "Links in it stay in your library. Links that were only here go back
  to your Inbox."
- **Add to collection:** a picker with checkboxes (a link can be in several), and
  "New collection" inside the picker. Filing a link moves it out of the Inbox.
- **Collection view:** like the Inbox but scoped; rename/delete in the header;
  "Remove from this collection" on cards; empty state.

### 5.9 Search, sort and filter
- Search across **all** links (not just the Inbox), by title, description, URL and
  domain. Not notes yet. Results follow the chosen sort (no relevance ranking).
- Sort: Newest (default), Oldest, Title A–Z.
- Filters: Kind (Videos, Pages, Other), Pinned, Saved between two dates, Collection.
  All combine. Show active filters as chips with "Clear all".
- States: searching; results; **no results** (different from an empty Inbox);
  invalid date range.
- Keyboard: `/` focuses search. Propose a Cmd/Ctrl+K command palette and single-key
  actions on the selected card (e.g. `p` pin, `c` collection, `e` edit) with a `?`
  cheat sheet.

### 5.10 Export
"Export my links" downloads a JSON file. States: preparing, done (toast), failed.

### 5.11 Global
- 404 page; "link or collection not found" (never hint that it exists for someone
  else).
- Signed out mid-session: back to sign-in, then return to where they were.
- Offline / server unreachable banner. Generic error with Retry and a short
  reference code.
- Toasts: saved, already saved, filed, removed, deleted (with Undo), collection
  created/renamed/deleted, export ready, errors.

### 5.12 Error codes the UI must cover
Every API error carries one of these codes; draw a treatment for each that applies.

| Code | Where | UI |
|---|---|---|
| `VALIDATION` | save box, forms | inline field message |
| `UNAUTHENTICATED` | anywhere | send to sign-in |
| `NOT_FOUND` | detail, collection | not-found state |
| `CONFLICT` | collection name | inline message |
| `RATE_LIMIT` | save, sign-in | "Too many tries. Wait a minute." |
| `INTERNAL` | anywhere | generic error + Retry + reference code |
| `NETWORK_ERROR` | anywhere | offline banner / Retry |

## 6. Tier B — Phase 2: extension and phone

### 6.1 Chrome extension
- **Popup** (fixed 360 px wide, height to fit, max 600; closes when focus leaves):
  current tab's title, icon and URL; one-click Save to Inbox; optional collection
  and note after saving. States: saving, saved (with "View"), already saved (where
  and when; add to another collection), page can't be saved (`chrome://`, files),
  signed out, session expired, error with Retry.
- **Save many tabs:** list of tabs with checkboxes, "already saved" badges, a
  destination, and an opt-in "Close tabs after they're saved". Progress ("Saving
  23 of 50…"). **Partial success**: "48 of 50 saved" — the 2 failures stay open and
  are listed with Retry; only confirmed tabs close. Note that this saves links, not
  logins or form state.
- **Side panel** (fluid 320–600 px, left or right): browse and search the library
  beside the page.
- **Options page** (full tab): account, default destination, close-after-save
  default, shortcuts (always show the user's current binding).
- **Toolbar icon states** (saved / not saved / error) and **badge** colours.
- Extension sign-in: code entry inside the popup, or hand-off to the web app.

### 6.2 Phone
- **PWA install**: Android install button; iPhone "Share → Add to Home Screen"
  hint sheet (iPhone has no install prompt).
- **Android share target**: share a link from any app → a small "Saved to Inbox"
  screen with optional collection. The URL may arrive inside free text.
- **iPhone**: Safari does not support share targets (checked Oct 2026). Design a
  **paste-first save screen** (big "Paste link" button) and an install guide for an
  Apple Shortcut "Save to linkaroo" that appears in the share sheet.
- Home-screen app has no browser back or reload: every screen needs its own back
  control and a refresh affordance. Respect notch and home-indicator safe areas.

## 7. Tier C and D — later phases (key screens only)

- **Sharing (Phase 3):** share dialog for a collection (invite by email, roles
  owner/editor/viewer, visibility private/unlisted/public, copy link, revoke);
  accept-invite page; shared collection with "added by" on each card; public
  read-only collection page for signed-out visitors with "Save to my linkaroo";
  "Shared with me / Following" list; invitation email. Viewer sees disabled edit
  controls with a reason.
- **AI (Phase 4):** summary panel on a link with a required source label ("From
  the page text" vs "Only from the title and description"); "Ask your library"
  answer with citations to saved links; semantic search results; usage meter,
  near-limit and limit-reached states; AI consent setting.
- **Billing (Phase 5):** plans page (Free / Pro / Team), upgrade flow and result
  states, billing page (plan, renewal, card, invoices, past-due), credits page.
  Upgrade prompts must stay calm and never block saving.
- **Phase 6 concepts:** marketing landing page, nested collections in the sidebar,
  an import wizard with a "1,203 of 1,250 imported" result.

Shared patterns these need, worth designing once: destination picker, "N of M
succeeded" result, permission-denied state, limit/paywall state, role and
visibility badges.

## 8. Handoff rules (so agents can build it faithfully)

The app will use **React 19 + Tailwind CSS v4 + shadcn/ui** (on its default Base UI
primitives) — see decision D1. Design to that kit.

- **Start from a shadcn/ui Figma kit** and keep its component names, anatomy and
  variant names (`default | secondary | outline | ghost | destructive | link`;
  sizes `sm | default | lg | icon`). Restyle freely through tokens. Don't invent a
  new interaction where a primitive exists (Dialog, Sheet, Popover, DropdownMenu,
  Command, Combobox, Tabs, Toast, Tooltip, Skeleton, Sidebar…).
- **Component properties mirror React props exactly** (same names, casing and
  values): `variant`, `size`, `disabled`, `label`, icon slots. The link card's
  props follow the data: `kind`, `fetchStatus` (`pending | fetched | fetch_failed`),
  `pinned`, `hasThumbnail`, `hasNote`.
- **Tokens in three tiers:** primitives (no modes) → semantic (Light and Dark modes)
  → component (only where needed). Components bind to semantic tokens, never
  primitives. Semantic colour names match shadcn's: `background`, `foreground`,
  `card`, `popover`, `primary`, `secondary`, `muted`, `accent` (each with
  `-foreground`), `destructive`, `border`, `input`, `ring`; add `success`,
  `warning` if needed. Spacing, type, radius, shadow and motion are tokens too and
  don't change between modes. OKLCH colours are welcome.
- **Every value bound to a variable or style.** No raw hex or px in ready sections.
- **Export tokens as DTCG 2025.10 JSON** (Figma's native export or Tokens Studio)
  at each milestone. That JSON is committed to the repo and turned into CSS.
- **Auto layout everywhere**, resizing set on purpose. **Layers named by purpose**
  (`LinkCard/Thumbnail`, not `Frame 1268`).
- **Every state drawn as a variant**, not described in a note.
- **Annotations** for behaviour you can't draw: focus order, keyboard shortcuts,
  what happens on submit and error, motion, truncation rules, breakpoint changes.
- One Figma page per feature, matching the code: Cover · Foundations · Components ·
  Auth · Save · Inbox · Link detail · Collections · Search · Account/Export ·
  Extension · Phone · Later phases · Brand assets · Changelog.
- Mark sections **Ready for dev** only when complete. Link each section to its
  Plane ticket as a Dev resource.
- Icons from one set, referenced by name (Lucide suggested; it ships with shadcn).

## 9. Accessibility and responsive

- WCAG 2.2 AA. Text contrast 4.5:1; large text, icons, control edges and focus ring
  3:1 — in both themes.
- Focus ring at least 2 px, visible on every control, never hidden under a sticky
  header.
- Touch targets 44×44 on touch layouts; 24×24 is the floor in dense desktop lists
  and the popup.
- Reduced motion: replace slides and springs with fades or nothing.
- Theme: Light, Dark, and System (default). Dark is designed, not inverted.
- Frames: **360/375** (phone), **768** (tablet), **1280** (desktop), plus a check at
  1440+ and at 320. Extension popup at 360; side panel at 320 / 400 / 600.
- Every screen in Tier A in both themes.

## 10. Asset checklist

- Logo (full and mark), on light and dark.
- `favicon.ico` (16/32/48), `favicon.svg` (with dark-mode handling),
  `apple-touch-icon.png` 180×180 (opaque, square corners).
- PWA: `icon-192/512.png` and **separate** `maskable-192/512.png` (logo inside the
  central 80% circle, full-bleed background); `theme_color` and `background_color`
  for light and dark.
- Extension: toolbar icons 16/24/32 (hand-tuned, readable on light and dark
  toolbars); manifest icons 16/32/48/128 PNG; store icon 128 (96 art + 16 padding);
  5 store screenshots 1280×800; optional promo tile 440×280 and marquee 1400×560;
  badge colours.
- Social: default OG image 1200×630 (key content in the centre 1080×560); a
  template for shared-collection OG images.
- Email: sign-in email (600 px, single column, PNG logo at 2×, works with images
  off and in dark mode; code large as live text with the link under it); invite
  email (Tier C).
- Letter-tile palette, generic link icon, video play badge, empty-state
  illustrations (optional, keep light).

## 11. Milestones

| Milestone | Content | Gate |
|---|---|---|
| M0 | Flows, nav and layout wireframes (Tier A) | Owner sign-off on nav and card density |
| M1 | Brand direction + tokens (light/dark), type and spacing scale | Token JSON exports cleanly |
| M2 | Component library with all states | Every component covers the state matrix |
| M3 | Tier A screens, all breakpoints, both themes, prototype | Core flow clickable |
| M4 | Handoff + Tier B | An agent builds one screen from Figma alone; gaps fixed |
| M5 | Tier C and D key screens | Owner review |

Up to two revision rounds per milestone; comments in Figma.

**Core prototype flow:** sign in → save first link → watch it fill in → find it by
search → add it to a collection → open it.

## 12. Questions for the designer to answer in M0

1. Mobile nav pattern and where the save box lives.
2. Card density default (dense list vs cards) and whether to offer a toggle later.
3. Link detail as page, sheet or modal.
4. Infinite scroll or "Load more".
5. Delete: confirm or undo.
6. How "already saved" points at the existing link when it isn't on screen.
7. Should pinned links float to the top of the Inbox? (Today pin is a filter only.)
8. Show which collections a link is in on the card?
9. Failed fetch: show the reason or not?
10. Inbox grouped by day ("Today", "Yesterday") or a flat list?

## 13. Owner decisions this brief assumes

| # | Decision | Assumed here | Status |
|---|---|---|---|
| D1 | UI kit | Tailwind v4 + shadcn/ui (Base UI) + Lucide icons | Assumed; record as an ADR before M2 |
| D2 | Figma plan | A paid seat with Dev Mode, so the Figma MCP server and Code Connect work | Confirm with the designer |
| D3 | Sign-in | Phase 1 ships the magic link only; the code-entry screen is drawn now for Phase 2 | Revisit when the extension or iPhone app starts |
| D4 | Brand | No existing logo, colours or fonts; the designer proposes them in M1 | Owner to confirm or supply |
| D5 | Scope | Tiers A–D as in section 4 | Owner to confirm budget and dates |
