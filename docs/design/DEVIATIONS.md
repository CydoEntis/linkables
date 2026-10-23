# Where the build departs from the design handoff

The handoff (`docs/design/handoff/`) is the designer's file and stays as delivered.
This page lists every place the web app deliberately differs from it, and why.
Update it when a difference is added or closed.

## Accessibility (brief section 9: WCAG 2.2 AA)

Contrast was measured in headless Chrome with the WCAG formula.

| What | Handoff | Build | Why |
|---|---|---|---|
| `--mut2` / `subtle-foreground` text (day labels, time column, empty-state hints) | `#6f6f69`: 3.71:1 on `#121212`, 3.41:1 on row hover `#1b1b1b`, 3.26:1 on `#1f1f1f` | `#88887f`: 5.24:1, 4.82:1, 4.61:1 (4.87:1 on the bar's `#1a1a1a`) | Body text needs 4.5:1. |
| Input placeholders | `#77776f`: 3.86:1 on the bar `#1a1a1a`, 3.65:1 on the sheet field `#1f1f1f` | `subtle-foreground` (`#88887f`): 4.87:1, 4.61:1 | Same rule. |
| Save bar focus | 1.5 px `#3a3a3a` ring (1.53:1 on `#1a1a1a`) | 2 px lime ring (13.07:1); a valid link adds the soft lime halo on top | Focus rings need 2 px and 3:1; the brief and ADR-0006 make the ring lime. |
| Menu items (account menu) | Highlight is `--raise` on `--card` (1.06:1) | Highlight keeps `--raise` and adds a 2 px lime ring (12.38:1 on the highlight) | A keyboard user must see which item is active. |
| Phone view chips | 38 px pills | 38 px pill inside a 44 px tap target | Touch targets are 44 × 44 on phones. |

## Not built yet (each is a later ticket)

- **Sidebar counts** on All links, Pinned and To sort: there is no count endpoint.
- **Collections** in the sidebar, the Add to… popover, drag to file, and drop on the window to save.
- **Get the extension** button: the extension is Phase 2.
- **Hover actions** (Add to… · Share · Pin), **swipe actions** on phones, and the first-run swipe hint.
- **Link details panel**: clicking a row opens the saved URL in a new tab instead.
- **Search**: the web bar only saves (Enter on text that is not a link explains why), and phones have no search field yet.
- **⌘K hint** in the bar: hidden until the command palette exists, so it promises nothing that does not work.
- **"In X" / "To sort" in row meta, and the lime To sort dot outside the To sort view**: the API reports no per-link collections yet, so only the To sort view knows its links are unsorted.
- **"Saved · Add to…" toast** after a new save, and **"Already saved in X"**: both need collections. A duplicate says "Already saved" and flashes the existing row.
- **iPhone saving from Share**: the shortcut and its setup guide are a later ticket. Until then the sheet tip and empty state on iPhone say "Saving from Share on iPhone is coming soon" instead of the handoff's "tap Share, then linkables".
- **"Save from anywhere" welcome, desktop bookmark button, drag and drop, and "See other ways"** (save-anywhere prompt screens 1, 4, 5 and 7): later tickets.
- **New collection on the share card**: the card ticks existing collections only; creating one comes with the collections UI.
- **App icons are placeholders**: rendered from `assets/linkables-logo.png` (the 3D render) on the `--bg` colour. The designer's flat SVG logo is still pending; the icons are redrawn from it when it lands.

## Share flow (`/save`)

- **A full page, not a sheet over the other app.** Android opens a share target as the installed app, so the "Saved to linkables" card fills the screen instead of rising over YouTube. The card's content follows the handoff: lime ✓ with confetti, title, up to four collections to tick, "All collections ›", Undo.
- **"Open linkables" instead of "Done"**, and the page does not close itself on Android: a web page cannot close an app window it did not open. Only the desktop bookmark popup (`?popup=1`) closes itself, 4 s after a save unless it is touched.
- **Share copy follows the device.** Android shows "add linkables to your home screen, then … Share → linkables" until installed, then "in any app, tap Share, then linkables". Desktop shows no tip, since it has no share target.
- **One theme colour** (`#121212`) for light and dark in the manifest and `theme-color`: only the dark theme is drawn.

## Added where the handoff is silent

- **Account menu** (avatar, email, Sign out) at the foot of the sidebar and in the phone header. The handoff draws the avatar with no menu; the brief (5.2) asks for an account menu.
- **Load more** button at the end of the list (brief 5.4 left infinite scroll vs. Load more open).
- **Pending rows stop polling** two minutes after this device first sees the newest pending row (2 s, then 5 s, then 15 s); a row still pending after that keeps "Getting details…" until the list next loads.
- **Phone save button** stays enabled while grey; pressing it with an invalid link shows the reason instead of doing nothing.
- **Fonts are self-hosted** (Fontsource packages) instead of loaded from Google Fonts, so a page view does not tell a font CDN who uses linkables.
- **Sign-in screens** keep their earlier look; the handoff does not cover them. Arriving from a share while signed out, the heading reads "Sign in to save this link", and the save finishes after sign-in.
- **Removed state** on `/save` after Undo ("Removed"), and an error state with Retry: the prompt lists neither.
