# linkables · Round 2 handoff

Prototype: `linkables-round-2-prototype.html`. It's one self-contained file; open it in any browser. The link images load from Wikimedia, so you need to be online for those. The top bar switches between screens and between Desktop (1440) and Phone (390). The State chips show every state. Everything is clickable. Sample content only.

The round 1 tokens, type, radii and rules are kept as they were. There are two additions:
- `--fr: 'Newsreader', Georgia, serif`, for Reader body text only.
- `--danger` is now also used as a background at 12–16% (`oklch(0.72 0.16 25 / .14)`) for destructive confirm states.

---

## 1. Sharing a collection (priority 1)

### Share dialog
Desktop is a `Dialog` (500 wide, radius 20). Phone is a bottom `Sheet` (radius 26 26 0 0).

**Off**
- **Header:** the collection mosaic, `Share “Trip to Japan”`, and `5 links · only you can see it`.
- **Preview card:** 4 thumbnails, one line on what sharing does, then two checks:
  - ✓ Titles, images and descriptions
  - (eye-off) Never your notes, pins or name
- **Action:** one lime button, `Get share link`. While the link is created it shows a spinner and `Making link…` (about 600 ms).

**On**
- **Status:** a lime-tinted line, `Link is on`.
- **Link:** a field in mono, with `linkables.app/s/` muted and the slug in full colour.
- **Desktop button:** lime `Copy link`, which shows `Copied ✓` for 1.8 s.
- **Phone buttons:** lime `Send link…` (calls `navigator.share`) and a ghost `Copy link`. On phones, sending is the main job, so it gets the lime.
- **Footer:**
  - Ghost `See what viewers see ↗` opens the public page.
  - Ghost `Turn off link` asks for a second tap: the first tap turns it red, `Tap again to turn off`, with a hint underneath. It resets after 3.5 s.
- **Turn off is the exception to "Undo instead of confirm".** A link that has been turned off can't come back, so Undo would be a lie.

**Collection header**
- Desktop keeps a lime `Share`.
- Phone uses a ghost `Share`, because the + button is that screen's lime action.
- Once shared, a `Shared` pill (globe) sits next to the link count, and the sidebar shows a small globe on that collection.

### Public shared page `/s/:slug`
- **Header:** the logo, and a ghost `Request access` on the right.
- **Hero:**
  - a `Shared collection` pill
  - the title: 64 desktop, 40 phone, weight 700, tracking −0.035em
  - `5 links · updated Oct 24`
  - Grid/List toggle (desktop only) and a lime `Open all 5` (full width on phone)
- **Grid is the default:** 3 columns desktop, 1 column phone. Each card shows:
  - the image (16:10)
  - a site row with a letter tile
  - the title (17/700)
  - the description, cut to 3 lines
  - Cards lift 3 px on hover.
  - Opened cards get a lime `✓ Opened` tag.
- **List:** 168×104 image, title, site and a 2-line description.
- **Footer card:** `Made with linkables` → `Keep your own links like this.`, plus a white `Request access →` button. It goes to `/request-access`.
- **Pop-ups blocked:**
  - **Desktop:** the first link opens, and an inline banner appears: `Your browser blocked 4 of the 5 links`. It explains the address-bar pop-up icon, shows a small address-bar picture with the icon pulsing, and has a lime `Open the other 4`. Open all turns into a ghost button while the banner shows.
  - **Phone:** phones only allow one link at a time, so there's no retry. The banner says `Your browser opened 1 link` and asks people to tap the others, which get ticked as they're opened.
- **Other states:**
  - **Loading:** a shimmer skeleton.
  - **Not available:** `This shared collection isn't available`, with a white `What is linkables?`.
  - **Can't load:** `Couldn't load this collection`, with a lime `Try again` and a reference code.
- **Viewers never see** notes, pins, who saved what, or the owner's name.

### Link preview image (1200×630)
"Link preview" screen in the prototype.
- **Left:** logo, `A collection on linkables`, the collection name (86/700) and the link count with a lime dot.
- **Right:** 3 tilted cards with link images.
- **Generic version:** `Links worth keeping` / `Save it once. Find it anywhere.`
- **Safe area:** keep text inside a 1080×560 centre area. Render server-side from the first 3 links that have images; use the generic version when a collection has none.

---

## 2. Settings (priority 2)

A **full page** at `/settings`, inside the app's sidebar layout. On phone it's full screen with a `Back` button. A dialog would be too small for six sections, and a page leaves room for billing later.

**Account menu** (bottom-left): shrinks to the email, `Settings` and `Sign out`. "Save from anywhere", "Bookmark button" and "Export" move into Settings.

**Sections**, in order (card radius 16, 1 px `--line`):
1. **Account:** avatar, email, `Signed in with Google` (or `with an email code`), and a ghost `Sign out`.
2. **Get linkables everywhere:** a 2×2 grid of tiles (1 column on phone), each with an icon, name, one line and a ghost action:
   - Chrome extension: `Add to Chrome`
   - iPhone: `Get the Shortcut`
   - Android and desktop app: `Install`
   - Bookmark button: `Get the button`
   - When the Chrome Web Store listing is live, the Chrome tile links straight to it. Show `Installed ✓` when the extension is detected.
3. **Shared collections:** one row per shared collection: mosaic, name, mono URL, `Copy link`, and `Turn off` (with the same two-tap confirm). Empty state: `Nothing is shared. Open a collection and press Share…`. A note underneath repeats what viewers see.
4. **Appearance:** Theme, with Dark selected and Light disabled (`Soon`). This leaves room for the light theme, and later for email preferences and Plan and billing (as new sections in the same style).
5. **Your data:**
   - `Export my links`: Export → `Preparing…` → `Downloaded`, plus a toast.
   - `Delete account…`: red text on a ghost button.
6. **Help and legal:** Support, Privacy and Terms as rows with a chevron.

**Delete account** (the app's one real confirm)
- **Layout:** a dialog on desktop, a bottom sheet on phone.
- **Content:**
  - a red trash icon tile, and `Delete your account?`
  - a list: links, collections and notes are deleted right away; shared links stop working; the sign-in record is removed within 30 days
  - `Want a copy first? Export my links`
  - a field, `Type DELETE to confirm`: mono, auto-uppercased, and its border turns red when the text matches
- **Buttons:** `Cancel` (ghost) and `Delete account`. Delete is disabled (grey) until the text matches, then it turns into a solid danger button with dark text. On phone the buttons stack, with Delete on top.
- **After confirming:** `Deleting…` with a spinner. The person is signed out and sees a full-screen message: `Your account is deleted` / `Your links, notes and collections are gone, and you're signed out. Thanks for trying linkables.`, with a ghost `Back to linkables.app`.

---

## 3. Big screens and empty space (priority 3)

**Big screen** screen in the prototype, 2560 shown scaled down.
- **Grid by default at ≥1800 px**, with a Grid/List toggle next to Filter that's remembered for each device.
  - **Grid:** cards at least 300 wide, with image, title (2 lines), description (2 lines), and `site · collection · date`.
  - **List:** the column grows to 1560 (1900 with the panel closed), with a 112×63 thumbnail and the description as a second line.
- **Details panel open by default at ≥2200 px:** a third column, 480 wide. The selected card gets a 2 px light ring.
- **Details panel changes:**
  - **New `Read` action:** first in the action row (Read · Pin · Share · Delete).
  - **"Summary · Coming soon" card dropped:** the description already does that job, and a card for something that may never ship makes the app feel unfinished. Bring it back when AI ships.
- **Sidebar:**
  - **All collections listed:** no "Show all"; it scrolls if there are many.
  - **Shared collections** get a small globe.
  - **`Chrome extension · Add to Chrome` card** sits above the account button, and can be dismissed (remember that).
  - **Settings** lives in the account menu.
- **New account ("New account" screen):** `Save your first link`, then three cards, each with a small picture:
  1. Paste a link (ghost button)
  2. Share from your phone (ghost)
  3. Chrome extension (lime `Add to Chrome`)
  - **Phone:** the three ways stack, and `Add to Home Screen` is the lime one.

---

## 4. Reader view (priority 4)

A **full page** at `/l/:id/read`, with no sidebar. On phone it's full screen. The details panel stays the quick look.
- **Top bar:**
  - Back
  - site and reading time, centred
  - text size, A A A in 3 steps:
    - desktop 17 / 19 / 22 px
    - phone 16 / 18 / 20
  - ghost `Open original ↗`
- **Article:**
  - **Measure:** 700 px wide (760 at the largest size).
  - **Body:** Newsreader with line-height 1.7, colour `#dcdbd6`.
  - **Title and headings:** Familjen Grotesk. Title 44 desktop, 30 phone, weight 700.
  - **Quotes:** italic, 1.12em, with a 2 px `--line2` rule on the left.
  - **Code:** IBM Plex Mono at .7em on `--card`, radius 12.
  - **Images:** radius 16, with a 13 px caption.
  - **End of article:** Pin, Share and Back to my links.
  - A reading face makes long text noticeably easier on dark. The text size control is cheap and helps phone users most.
- **Loading:** a thin lime bar moving along the bottom of the top bar, plus a skeleton, with `Getting the article…`.
- **Not available:** `Reader view isn't available for this page` / `It's a video, it's behind a paywall, or there's no article on it to pull out.`, with a lime `Open original ↗`.
- **For videos,** hide `Read` from the start, or show the Not available state. The prototype shows the state.

---

## 5. Chrome extension side panel
"Extension" screen in the prototype: the browser at 1440 with the side panel open, 380 wide. It uses the same tokens and components as the app.
- **Header:** logo, plus a gear that opens extension settings.
- **This page card:**
  - **Status:** thumbnail, `✓ Saved to your links`, title, collection chip, `+ Add to`.
  - **Actions:** four tiles: Pin, Read (opens `/l/:id/read` in a new tab), Share (copies this link), Open app.
- **Tabs:** Recent · Pinned · Collections (segmented ghost), with search under them.
- **Collections tab:** each row has its mosaic, name, link count and a `Shared` globe when its link is on, plus a ghost `Share` button. Share opens a bottom sheet inside the panel that works exactly like the web Share dialog:
  - **Off:** `Get share link`.
  - **On:** the link, lime `Copy`, `Link is on`, and `Turn off link` (two taps).
- **Extension settings:**
  - Save new links to (default collection select)
  - Save quietly: Alt+Shift+S
  - Open side panel: Alt+Shift+L. Always show the current keys, since they can be changed at chrome://extensions/shortcuts.
  - account and Sign out
  - All settings in linkables ↗
- **Web app:** when the extension is detected, hide the sidebar's "Add to Chrome" card and show `Installed ✓` on the Settings tile.

## Motion
- **Dialogs:** pop in, 240 ms, `cubic-bezier(.2,.8,.2,1)`, from translateY 8 px and scale .98.
- **Sheets:** slide up, 320 ms.
- **Scrims:** fade, 180 ms.
- **Views and states:** fade up 16 px, 400–500 ms.
- **Toasts:** rise, 250 ms.
- **Skeletons:** 1.4 s shimmer.
- **Buttons:** scale .97 on press.
- **Reduced motion:** all of the above turns off with `prefers-reduced-motion`.

## Copy notes
- **"Get share link" / "Turn off link"**, not "public / private" or "view-only". There is only one kind of share for now, so the button doesn't name a type. When editors or invite-by-email arrive, add a "Who can see this" choice above the link.
- **"Request access"** everywhere linkables is invite-only.
- **Toasts** say what happened: `Link copied`, `Link turned off. It no longer works.`, `Trip to Japan is private again`.

## Still open from round 1
- **Not in this round:** light theme, offline and rate-limit states, tablet layout, and a flat SVG logo.
- **Settings reserves room** for the light theme.
