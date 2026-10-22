# Design prompt

Paste everything below the line into a design tool (Claude, v0, Figma Make, Lovable,
Stitch...). It asks for the Phase 1 web app plus the design system. The full brief,
with every surface and state, is `docs/design/BRIEF.md`.

---

Design the web app for **linkaroo**, a personal link library: save any URL in
seconds, find it later from any device. It replaces sending yourself links on
Discord and keeping hundreds of tabs open.

**Stack (design to it exactly):** React 19, Tailwind CSS v4, shadcn/ui components,
Lucide icons. Use shadcn's components and variant names (Button `default |
secondary | outline | ghost | destructive | link`, sizes `sm | default | lg |
icon`; Dialog, Sheet, DropdownMenu, Command, Popover, Checkbox, Input, Textarea,
Badge, Skeleton, Sonner toasts, Sidebar). Don't invent widgets where shadcn has one.

**Brand:** none exists; create one. The name is playful (kangaroo, pouch, hop).
Personality: friendly, calm, fast, minimal; never enterprise, no dashboards or
clutter. Avoid AI-app clichés: purple-blue gradients, cream + serif + terracotta,
Inter as the only font. Propose a small logo mark, a palette and a font pairing
(Google Fonts only).

**Tokens:** give me the theme as CSS variables in shadcn's format — `:root` for
light and `.dark` for dark, OKLCH colours — covering `background, foreground, card,
card-foreground, popover, popover-foreground, primary, primary-foreground,
secondary, secondary-foreground, muted, muted-foreground, accent,
accent-foreground, destructive, border, input, ring, radius`, plus `success` and
`warning`, and an 8-colour palette for letter tiles (each readable with white or
dark text in both themes). Dark mode is designed, not inverted. Contrast: text
4.5:1, icons/borders/focus ring 3:1.

**Screens (each at 375 px phone and 1280 px desktop, light and dark):**

1. **Sign in:** email field, "Email me a sign-in link". Then "Check your email"
   (shows the address, resend, use a different email). Error: "This link has
   expired. Send a new one." No password, no sign-up.
2. **Inbox (home):** app shell with nav (Inbox, Collections list, search) and an
   account menu (email, Export my links, Sign out). A save box always in reach:
   paste a URL, Enter to save. Newest links first. Also: empty Inbox for a new
   user, and a quiet "all filed" empty state.
3. **Link card**, the key component, in all these variants:
   - article with image; article with no image (use a letter tile: first letter of
     the domain on a palette colour); YouTube video (16:9 thumbnail, play badge,
     channel name);
   - **pending** (just saved: only URL and domain known, title loading);
   - **details not found** (title falls back to the URL; calm, not an error look);
   - pinned; with a user note; with a very long title and URL.
   Fields: image, small site icon (16–20 px), title, domain, saved date, pin mark,
   note excerpt. Prefer a compact list layout; show me a card-grid alternative too.
4. **Already saved:** toast or inline notice "Already saved on Mar 3 · in Rust"
   with Open and Add note.
5. **Link detail:** side sheet on desktop, full screen on phone. Edit title (clear
   to restore the page title), plain-text note, pin, collections (checkbox
   picker with "New collection"), delete with an Undo toast.
6. **Collections:** list (names only), create/rename dialog with a duplicate-name
   error, delete dialog ("Links stay in your library; links only here go back to
   your Inbox"), and a collection page like the Inbox.
7. **Search:** search box (`/` focuses it), sort (Newest, Oldest, Title A–Z),
   filters (Videos / Pages / Other, Pinned, date range, collection) shown as
   removable chips with "Clear all". States: results, no results.
8. **Command palette** (Ctrl/Cmd+K) and a keyboard shortcut sheet (`?`).
9. **Global states:** loading skeletons, offline banner, generic error with Retry
   and a short reference code, 404.

**Rules:** no horizontal scroll at 360 px; touch targets 44 px on phone; visible
2 px focus ring; respect reduced motion; real copy, no lorem ipsum; plain,
friendly wording ("Saved", "Moved to Rust", "Couldn't save. Try again.").

**Deliver:** the screens as React + Tailwind + shadcn code (or HTML with Tailwind
classes), the theme CSS variables block, the logo as SVG, and a short note on the
font pairing and spacing scale.
