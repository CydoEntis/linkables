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
| Solid delete red (swipe Delete tile, details Delete on hover) | `oklch(0.62 0.18 25)`: 3.97:1 under white text | `--destructive-solid` `oklch(0.58 0.18 25)`: 4.69:1 | Body text needs 4.5:1. |
| Details panel resize grip | `--line2` `#2c2c2c` bar (1.3:1 on the panel's `#1a1a1a`) | `subtle-foreground` bar (about 5:1), white on hover, lime while dragging; a focusable separator that the arrow keys move | The grip is the only sign of a control: 3:1 for control edges. |
| Phone link details: Back, Open ↗ and collection tags | 36 px buttons, 28 px pills | Same look inside 44 px tap targets | Touch targets are 44 × 44 on phones. |

## Not built yet (each is a later ticket)

- **Sidebar counts** on All links, Pinned and To sort: there is no count endpoint.
- **Get the extension** button: the extension is Phase 2.
- **Delete in a row's Add to… popover**: a link is deleted from its details or, on phones, the swipe Delete tile.
- **First-run swipe hint** ("Swipe a link left for actions") and the first row's nudge.
- **Pin confetti on rows**: a row's Pin pops the pin icon and holds the list still for 1.5 s, but plays no confetti. The Pin in link details plays it.
- **Export design**: the handoff lists export as not designed. "Export my links" in the account menu downloads the file with a "Preparing your export…" toast, then "Export downloaded" or "Couldn't export your links. Try again."
- **"Saved · Add to…" toast** after a new save, and **"Already saved in X"**. A duplicate says "Already saved" and flashes the existing row.
- **Saving into the open collection**: a link saved on a collection's page lands in To sort, as in the prototype.
- **Demoted paste box and the "Save from anywhere" header hint** (save-anywhere screen 8): the bar keeps its size, and there is no hint in the header.
- **New collection on the share card**: the card ticks existing collections only; creating one comes with the collections UI.
- **App icons are placeholders**: rendered from `assets/linkables-logo.png` (the 3D render) on the `--bg` colour. The designer's flat SVG logo is still pending; the icons are redrawn from it when it lands.

## Search, sort and filter

The handoff draws the search/paste bar, the phone search field and lime matches; sort, filters, the command palette and the shortcut list are not drawn (brief 5.9).

- **Where a search looks.** From All links, Pinned or To sort it covers every link, as in the prototype: the heading reads "Search" and All links is the active view. On a collection's page it stays inside that collection, which keeps the page's header and Share (brief 4.3: collection search).
- **Matches are marked in titles and domains**, each word of the search on its own. The prototype marks the whole query in titles only.
- **The phone field only searches.** Saving on a phone stays with the + button and its sheet, so the field never turns into a Save button.
- **Sort and Filter** sit under the heading as two quiet buttons. Filter opens a panel with Kind (Any, Videos, Pages, Other), Pinned only, Saved between (two date fields) and Collection. Active filters show as white chips that remove themselves when tapped, with Clear all. Pinned only is not offered on Pinned, and Collection is not offered on To sort or on a collection's page.
- **Results count** above the results ("3 matches", "50+ matches" while more pages exist), since the API has no total.
- **Sorted or searched lists are one list** with no day headings; pinned links still come first.
- **Saved between uses local days.** The URL holds the days picked (`from=2026-10-01`); the request sends each as the first and last instant of that day on this device. A reversed range is held back with "The first date is after the second."
- **Everything is in the URL** (`q`, `sort`, `kind`, `pinned`, `from`, `to`, `collection`), so a filtered list can be bookmarked, survives a reload and steps back with Back. Typing more of a search replaces its history entry instead of adding one per pause. The sidebar views start fresh, without the search or filters.
- **Esc** clears the search, and a second Esc leaves the field.
- **A search from the URL stays a search**, even when it looks like a link (`?q=nodejs.org`): the bar shows it with Clear, not Save. Typed text that is a link still gets Save.
- **Searches longer than 200 characters** (the API's limit) search their first 200, and the bar says so; the phone field stops at 200.
- **Command palette** (Ctrl+K, or ⌘K on Apple keyboards): Search links for the typed text, Save a link, Save from anywhere, Get the bookmark button, Keyboard shortcuts, Go to All links / Pinned / To sort, and Go to each collection. The bar's hint reads "Ctrl K" where the keyboard has no ⌘.
- **"?" lists the shortcuts** (/, Esc, Ctrl/⌘ K, Ctrl/⌘ V, ?). The brief's single-key actions on a selected card (p, c, e) are not built: rows have no selection, and pin and edit live in link details.

## Share flow (`/save`)

- **A full page, not a sheet over the other app.** Android opens a share target as the installed app, so the "Saved to linkables" card fills the screen instead of rising over YouTube. The card's content follows the handoff: lime ✓ with confetti, title, up to four collections to tick, "All collections ›", Undo.
- **"Open linkables" instead of "Done"**, and `/save` never closes itself. On Android a web page cannot close the app window it was opened in. Closing on its own would also take away Undo: any site can open `/save?url=…`, and the user must see what was saved. The bookmark button's popup follows the same rule (below).
- **Share copy follows the device.** Android shows "add linkables to your home screen, then … Share → linkables" until installed, then "in any app, tap Share, then linkables". Desktop shows no tip, since it has no share target.
- **One theme colour** (`#121212`) for light and dark in the manifest and `theme-color`: only the dark theme is drawn.

## Bookmark button (save-anywhere screen 4)

- **The popup never closes itself.** The prompt's popup "closes after a moment"; the build waits for the user to press **Close**, for the same reason as above: any site can open `/save` in a small window, and closing it would hide what was saved and its Undo.
- **Close replaces "Open linkables" as the secondary action** in the popup, and "Open linkables" becomes a quiet text link that opens the app in a new tab instead of inside the small window.
- **The popup layout needs the window the bookmark button opened**, not a URL flag: the window the bookmarklet names `linkables-save`, at most 520 × 760, with a mouse or trackpad. A small tab the user opened, or a small phone, keeps the full-screen layout, since script may not close either. If a browser still refuses to close the popup, Close goes to the app.
- **"Get the bookmark button" in the account menu** opens a dialog with the draggable **Save to linkables** pill, "Drag this to your bookmarks bar", and **Copy the link** for browsers that refuse to drag a `javascript:` link (after copying: "Now add a bookmark and paste this as its address"). Clicking the pill in the dialog does not follow it, since that would save the linkables page itself; it says "Drag it to your bookmarks bar, or use Copy the link" instead.
- **The bookmark sends only the page's address.** It reads `location.href`, opens `/save?url=…` in a 420 × 640 window, and falls back to the same tab when the popup is blocked. It adds nothing to the page it runs on.

## Collections

| What | Handoff | Build | Why |
|---|---|---|---|
| Collection header Share button | White (secondary) in the prototype | Lime (primary) | The README makes Share the one lime action on a collection page. |
| Share dialog | Read-only `linkables.app/alex/…` URL and a lime Copy link button | Mini-cover, title, link count, "Sharing arrives in a later version." and the dialog close button | Sharing is Phase 3; a copyable address that does not work would mislead. |
| Phone collection page | Only the chip names the collection | A compact header with the name, Share and Delete | Phones need a way to rename, share and delete. |
| Swipe Pin tile | Amber | Grey, white when pinned (like the web Pin button) | Amber is not in the token set. |

## Save from anywhere (save-anywhere screens 1, 3, 5 and 7)

- **A page, not an overlay.** The welcome is the page `/save-from-anywhere`. The first time a device opens the list signed in, it goes there with **Skip** in the header; the device remembers this in local storage, so blocked storage never shows it twice. Afterwards it is reached from the account menu ("Save from anywhere"), the empty All links and To sort lists, and the phone save sheet ("See how to save from anywhere"), with **Back to links** instead of Skip.
- **Each device's step is a card**, with "See other ways" opening the other two. Android shows **Install linkables** only when the browser offers its install dialog; otherwise it explains ⋮ → Install app. An installed Android app is told "In any app, tap Share, then linkables" instead.
- **iPhone without a shortcut link** says "The iPhone shortcut is coming soon" and shows no button or guide, until the owner sets `VITE_IOS_SHORTCUT_URL` (`docs/ios-shortcut.md`). With the link, the 3-step guide uses simple drawn phones, and a note says to sign in to linkables in the default browser (usually Safari), because the shortcut opens linkables there and the home-screen app keeps its own sign-in.
- **The iPhone tip** in the sheet and empty state reads "Faster: add the Save to linkables shortcut, then in any app tap Share → Save to linkables" once the shortcut link is set, and "Saving from Share on iPhone is coming soon" until then, with the link to the page beside it either way.
- **"Or drag any link onto your links list"** instead of "onto this window": only the list takes drops. A drop on the welcome page would save while the page leaves, and an "Already saved" or error message would be lost.
- **The empty list links to the page** ("See how to save from anywhere") instead of repeating the device's step inline; the phone keeps its share tip above the link.
- **Drop to save** covers the main panel beside the sidebar, as drawn, and the whole window on phone widths. Drags that start inside the app (a row, the bookmark button) never show it. Text dropped with no link in it says "There was no link in what you dropped." Only All links, Pinned and To sort take drops: a collection's page saves to To sort (above), so a link dropped there would vanish from the page it was dropped on.

## Added where the handoff is silent

- **Rename a collection** by clicking its title: Enter or leaving the field saves, Esc cancels, a taken name says "You already have X".
- **Collection pages have a path**, `/c/<id>`, so they can be bookmarked and, later, shared.
- **Pickers keep their order while open** (the extension pop-up's rule, used for the web Add to… popover and the phone Add to sheet), so a ticked collection does not jump under the pointer.
- **Keyboard access to swipe actions**: tabbing to a row's tiles opens them as a swipe would. Add to… is the keyboard way to file instead of dragging.
- **Deleting a collection** reaches the server only when its Undo toast closes (5 s, longer while the toast is hovered); closing the tab before then keeps the collection. Going back to its page meanwhile shows "Deleted" with Undo.
- **Account menu** (avatar, email, Get the bookmark button, Sign out) at the foot of the sidebar and in the phone header. The handoff draws the avatar with no menu; the brief (5.2) asks for an account menu.
- **Link details have an address**: `?link=<id>` on any list opens them, so they can be linked to; the browser's Back closes them, and swapping rows replaces the entry instead of adding one. Rows are links to that address, so a modified click opens the details in a new tab. Dragged out of the app, a row still carries the saved URL.
- **Opening details moves focus to the panel**, and Back or Esc returns it to the row. Open ↗ leaves the panel open. Details keep any search or filters in the address, and Ctrl/⌘ K inside the title or note stays with the field.
- **Phone link details: + Add to** opens the same floating picker as the web panel inside the full-screen details, not the phone's Add to sheet.
- **The note's autosave** waits for a 500 ms pause in typing (and saves at once when the field loses focus or the details close), shows "Saving…" then "Saved" quietly, and says so inline, with Try again, when a save fails.
- **Deleting a link** reaches the server only when its Undo toast closes, as for collections; the row and the details go at once.
- **Load more** button at the end of the list (brief 5.4 left infinite scroll vs. Load more open).
- **Pending rows stop polling** two minutes after this device first sees the newest pending row (2 s, then 5 s, then 15 s); a row still pending after that keeps "Getting details…" until the list next loads.
- **Phone save button** stays enabled while grey; pressing it with an invalid link shows the reason instead of doing nothing.
- **Fonts are self-hosted** (Fontsource packages) instead of loaded from Google Fonts, so a page view does not tell a font CDN who uses linkables.
- **Sign-in from a share**: arriving from a share while signed out, the heading reads "Sign in to save this link", and the save finishes after sign-in by Google, link or code.

## Sign-in (landing-handoff section 0b)

- **"For an hour", not "for 15 minutes".** Supabase's email code and link last an hour by default (`docs/supabase-email-templates.md`), so the copy says so.
- **No "open the link" button** on Check your email: it is the prototype's stand-in for clicking the email. Resend fills the row instead.
- **Not built yet:** the "Signing you in…" progress bar, "You're in" with its device choices, and "Welcome back" for returning users. The handoff's Privacy, Terms and Help pages arrive later; the footer links point at `/privacy`, `/terms` and `/support`.
- **Removed state** on `/save` after Undo ("Removed"), and an error state with Retry: the prompt lists neither.
