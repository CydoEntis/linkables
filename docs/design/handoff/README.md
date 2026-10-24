# Handoff: linkables — Phase 1 web app, phone, Chrome extension

## Overview
**linkables** saves any URL in seconds and lets you find it later from any device. Phase 1 goal (from the brief): *save a video at home, find it at work — no Discord message, no open tab.*

Principles that drove every decision below: **save now, organise later · simple before powerful · fast and lightweight · private by default · useful without AI · your data is portable.** "Get in, do what you came for, get out."

This bundle covers three surfaces, all in one prototype:
1. **Web app** (desktop, 1280+)
2. **Phone** (375 wide; installed web app / PWA)
3. **Chrome extension** (toolbar button + pop-up + side panel)

## About the design files
The files here are **design references built in HTML** — a working prototype that shows the intended look, copy and behaviour. They are **not production code**. Recreate them in the target stack: **React 19 + Tailwind CSS v4 + shadcn/ui (Base UI parts) + Lucide icons**, as set out in the brief. Use shadcn primitives wherever one exists (Dialog, Sheet, Popover, DropdownMenu, Command, Tabs, Toast, Tooltip, Skeleton, Sidebar) and restyle them through tokens. Don't hand-roll an interaction the kit already has.

Open `prototype.dc.html` in a browser. The dark strip at the top switches between **Web / Phone / Chrome extension**, and **Reset** restores the sample data. All data is fake and lives in memory.

## Fidelity
**High-fidelity.** Colours, type, spacing, radii, copy and motion are final for the dark theme. Light theme is **not drawn yet**. Derive it from the same purpose tokens: the secondary button becomes black-on-white, and everything else inverts sensibly. Don't just invert the colours.

---

## Vocabulary (use in UI, code and data)
| Term | Meaning |
|---|---|
| **Link** | One saved URL: user title, note, pin, collections. |
| **New** | Links in no collection. (The brief calls this "Inbox". The UI label is **New**; it was "To sort" until the 2026-10-24 handoff, so "To sort" below means New.) |
| **Collection** | Named group of links. Flat, with no sub-collections. A link can be in many. |
| **Pin** | Keeps a link (or a collection) at the top. |
| **Note** | Private plain-text note on a link. |
| **Kind** | `video` / `page` / `other`. |

Link card props (match the brief): `kind`, `fetchStatus` (`pending | fetched | fetch_failed`), `pinned`, `hasThumbnail`, `hasNote`.

---

## Global rules
- **One lime action per view.** Lime = the single primary action (Save this page, Share in a collection, Open ↗, + Save on phone, Create). Everything else is a ghost button.
- **Button tiers:** **Primary** = lime bg / dark text. **Secondary** = white bg (`--fg`) / dark text. **Ghost** = `--raise` bg, hover `--raise2`. No outlined buttons. Inputs are filled (`--raise`), with no border.
- **Pinned always sorts first**, in every list (web All links, phone, side panel, collections list). In day-grouped views, pinned links get their own leading **"Pinned"** group, then Today / Yesterday / This week / Earlier.
- **When pinning, hold the list still for 1.5 s** so the pin animation and confetti play in place. Then the row moves to its new spot with a hop and a brief lime glow. Never re-sort under the cursor.
- **Undo instead of confirms.** Delete, file and remove all show a toast with Undo (5 s).
- **No layout shift on hover.** Hover actions float over the right end of a row on a gradient. They never push content.
- **Copy is short and plain.** "Share", not "Share collection". "Delete" with a trash icon. "Link copied".

---

## Screens

### 1. Web app — main view
**Purpose:** find, file and open links.

**Layout:** CSS grid `272px | 1fr`, full viewport.
- **Sidebar** (`--side` #0d0d0d, padding 26/18):
  - **Logo and name:** logo 22px, then "linkables" in Unbounded 600 17px, −0.03em.
  - **Nav:** All links (count) · Pinned (count) · To sort (lime pill count). Rows are 38px with radius 10. The active row is `--raise` and weight 600.
  - **Collections:**
    - **Header:** "COLLECTIONS" label with "+" to create (inline name field, Enter to save, Esc to cancel; duplicate name shows "You already have X").
    - **List:** the 6 most recently used collections, each with a 24px 2×2 mini-cover built from its first 4 link tiles, plus "Show all N".
    - **Show all N:** reveals a "Find a collection" field and the full scrollable list.
    - **Dropping links:** rows are drop targets. While dragging a link, they highlight lime and bump with a spring when the link lands.
  - **Bottom:** "Get the extension" (ghost).
- **Main** (max-width 1040, centred, padding 32/56):
  - **Search/paste bar:** 52px, radius 14, `--raise`. Placeholder "Search or paste a link", with a ⌘K hint. Typing filters live and highlights matches in lime. Pasting a URL shows a lime **Save** button inside the bar, and Enter saves. ⌘V anywhere on the page (outside inputs) saves too.
  - **Title:** 34px / 700 / −0.03em, e.g. "All links", "Trip to Japan". Collections show Share (lime) and a trash icon in the header.
  - **Rows:** grouped by day (labels 12.5px / 600 / `--mut2`).
    - **Row anatomy:**
      - **Size and shape:** padding 10/14, radius 14.
      - **Thumbnail:** 72×46 radius 10.
      - **Text:** title 15.5 / 600 with ellipsis; meta 13px `--mut`, e.g. "youtube.com · in Rust · from iPhone".
      - **Markers:** a lime 7px dot when the link is in To sort, a pin icon when pinned, and the relative time at the right.
    - **Hover:** row bg `--rowhov`. Actions float in from the right: **Add to… · Share · Pin**.
    - **Click a row:** opens **Link details** (below). It does *not* navigate.
    - **Add to…:** a popover (280 wide) with "Find or create", the collection list with round tick circles (lime when on), "+ Create 'X'", and "Delete".
    - **Drag:** drag a row onto a sidebar collection to file it.
    - **Drop on the window:** dropping a URL from anywhere shows a full-panel "Drop to save" overlay.

### 2. Web app — Link details panel
**Purpose:** see everything about one link; later, read its AI summary.
- **Panel:** slides in from the right (`n-slide` .32s). Default width 480px. **Resizable** with a grip on its left edge (4×44 bar, lime while dragging), clamped to 360–900px. There's no scrim, so the list stays clickable and clicking another row swaps the content.
- **Header:** "← Back" (ghost text) · spacer · **Open ↗** (lime). Open goes to the original URL in a new tab.
- **Body**, top to bottom:
  1. **Media:** 16:9, radius 14. Videos show a player mock: a 64px white play disc and a progress bar with a lime fill. Pages show the tinted letter tile.
  2. **Title:** 21 / 700. **Meta:** "site · Saved Oct 20 · on iPhone".
  3. **Collection tags:** 28px pills with a mini-cover. Clicking one jumps to that collection. "To sort" shows if there are none. **+ Add to** opens the collection picker as a floating popover inside the panel.
  4. **Action row:** 3-column grid of 42px buttons: **Pin** (white when pinned, with confetti) · **Share** · **Delete** (hover goes red).
  5. **Summary card:** shows "Coming soon". In Phase 4 it must label its source: "From the page text" or "Only from the title and description".
  6. **Note:** plain textarea, autosaves on every keystroke.

### 3. Web — Share collection dialog
Centred dialog, 500 wide, radius 20. Mini-cover · "Share 'Trip to Japan'" · "7 links · anyone with the link can view". Read-only URL field `linkables.app/alex/trip-to-japan` with a lime **Copy link** button, which presses in, bursts confetti and reads "Copied ✓". Footnote: "Sharing arrives in a later version". Real sharing is Phase 3.

### 4. Phone — list
375×780 frame (status bar 44, home indicator).
- **Header:** logo and wordmark, plus an avatar (A).
- **Search field:** 48px, radius 14.
- **Filter chips:** "All links ▾" (opens a collection sheet with search) · Pinned · To sort (count).
- **Rows:**
  - **Layout:** 58×38 thumbnail, 2-line title, meta line. There's **no ••• button**.
  - **Swipe left only:** reveals 4 × 60px tiles, Add to (lime) · Share · Pin · Delete. While swiped, the **thumbnail stays visible** on the left and the text fades out.
  - **Swipe limit:** it stops at the tiles (-276px) with no overswipe. A threshold of 60px opens it. A tap closes it.
  - **First run:** a hint row reads "Swipe a link left for actions", and the first row nudges.
- **Tap a row:** opens **Link details** full screen (slides up, with its own status bar).
- **Save:** a 60px lime round FAB bottom-right (+) opens the "Save a link" sheet.
  - **Field:** a single filled field, "Paste or type a link", focused on open, so the OS long-press offers Paste.
  - **Button:** a 54px square ✓ next to it, grey until the text is a valid URL, then lime.
  - **Tip:** "Faster: in any app, tap Share, then linkables."
- **Add to sheet:**
  - **Header:** link thumbnail and title, then "Add to a collection".
  - **List:** "Find a collection" (search only) above collection rows with tick circles.
  - **Create:** a lime **+ New collection** button at the bottom opens an inline name field with a lime Create button. Creating also ticks the new collection.
- **Share-sheet flow** ("Simulate: share from YouTube"): a "Saved to linkables" card with confetti and quick collection picks, then it closes.

### 5. Chrome extension — toolbar button
- **Pill** in the toolbar (34px high), with three states:
  - **Idle:** "Save" on dark `#262626`, with the logo.
  - **Saving:** a spinner.
  - **Saved:** lime with a ✓ that draws itself, and a 5px soft lime ring.
- **Click:** saves the current tab instantly, then opens the pop-up. **Alt+Shift+S** saves quietly with no pop-up, just a small "Saved" chip.
- **Can't save:** pages like `chrome://settings` show "This page can't be saved" and the reason.
- **Side panel toggle:** a separate icon button next to the pill.

### 6. Chrome extension — pop-up (344 wide, radius 18)
1. **Header:** a 40px lime ✓ circle (spring, ring and confetti) · "Saved" / "Already saved" · page title · a location pill on the right: **"In To sort"**, which updates live to "In Rust, Recipes" as you tick.
2. **Quick tiles:** a 3-up grid of 56px tiles: **Pin** (white when on) · **Share link** · **All links** (opens the side panel).
3. **"Move to a collection · optional":** the 4 most recent collections with tick circles. **Order is frozen while the pop-up is open**, so items don't jump as you tick. "Search collections" field below, and "+ Create 'X'" when nothing matches.
4. **Footer:** "Alt+Shift+S saves quietly" · **Done**. There's no Remove button.

### 7. Chrome extension — side panel (372 wide)
- **Header:** logo and wordmark, plus a close button.
- **Current page card:**
  - **Not saved yet:** a lime **Save this page** button. It saves inline and never opens the pop-up.
  - **Saved:** "✓ Saved · in Rust", plus an **Add to…** button (white secondary) that opens a **floating popover** with search and tick list. It doesn't push the layout.
- **Search:** "Search your links".
- **Tabs:** Recent / Pinned / Collections. The active tab is `--raise2` with white text.
- **Rows:**
  - **Layout:** 48×32 thumbnail, title 13 / 600, meta 11.5. Pinned first, with a small muted pin icon.
  - **Hover:** slides in **Pin · Share · + · Delete** (28px icon buttons). The "+" opens the floating Add-to popover next to the row.
  - **Click a row:** opens **Link details** filling the whole panel. "Open ↗" opens it in a tab.
- **Collections tab:** pinned collections first. Opening one shows a back arrow and its name.
- **Footer:**
  - **Inside a collection:** **Pin** (ghost icon) · **Share** (lime, flex) · **Delete** (ghost icon, red hover) · **Library ↗** (ghost).
  - **Otherwise:** just **Library ↗**.

---

## Interactions and motion
All motion respects `prefers-reduced-motion` (durations go to 0).
| Name | Use | Spec |
|---|---|---|
| Skeleton shimmer | first load, mode switch, panel open | 1.2s linear infinite, gradient `#1b1b1b → #272727 → #1b1b1b` |
| Row stagger | view/collection/search change | translateY(10px)→0 + fade, .4s `cubic-bezier(.2,.8,.2,1)`, 32ms per row (max 12) |
| Hop in | newly saved / moved row | translateY(-12px)→2px→0, .5s `cubic-bezier(.3,1.4,.5,1)` + lime glow 1.4s |
| Leave | delete / file out of view | translateX(24px) + fade, .22s ease-in |
| Pin pop | pin icon | rotate -22°/scale 1.25 → settle, .55s |
| Confetti | pin on, save success, copy link | 14 particles, radius 24–40px, .6–.9s, colours lime / #ecebe8 / soft amber / violet / cyan |
| Spring | toolbar pill, ✓ circle, sidebar collection on drop | scale 1→.86→1.1→1, .45–.55s |
| Check draw | ✓ strokes | stroke-dashoffset 24→0, .35–.4s |
| Ring | saved ✓ | box-shadow 0→16px lime fading, 1s |
| Panel slide | details / side panel | translateX(100%)→0, .28–.32s `cubic-bezier(.2,.8,.2,1)` |
| Sheet up | phone sheets and details | translateY(100%)→0, .32s |
| Press | all buttons | `:active` scale(.96) |
| Tick | collection tick circles | scale .4→1.15→1, .3s |

## State (suggested shape)
```ts
Link { id, url, site, title, note?, kind, fetchStatus, pinned, cols: string[], device: 'laptop'|'iPhone'|..., savedAt }
Collection { id, name, pinned?, lastUsedAt }   // recent-first ordering uses lastUsedAt
UI {
  view: 'all'|'pinned'|'sort'|collectionId, q, detailId?, detailWidth,
  hoverId?, menuId?, swipeOpenId?, sheet?: 'save'|'pick'|'link',
  ext: { tab, pop, side, spTab, spCol?, addFor?, phase: 'idle'|'saving'|'done' },
  pinHold?: { ids: string[], until: number }   // freeze order 1.5s after pin
}
```
- **Saving:** optimistic. Insert a `pending` row immediately, then fill the title and image when the fetch returns. Saving a duplicate shows "Already saved in X" and flashes the existing row.
- **Ordering:** `pinned desc, savedAt desc`. Collections are ordered by `lastUsedAt desc`, with pinned first in the collections list.
- **Filing:** a link with zero collections is in **To sort**.

## Design tokens (dark)
```css
--bg:#121212;  --side:#0d0d0d;  --card:#1a1a1a;  --raise:#1f1f1f;  --raise2:#2a2a2a;  --rowhov:#1b1b1b;
--line:#222;   --line2:#2c2c2c;
--fg:#ecebe8;  --mut:#8d8d88;   --mut2:#6f6f69;
--lime:oklch(0.89 0.19 125);  --limefg:#16200a;  --limesoft:oklch(0.89 0.19 125 / .15);
--danger:oklch(0.72 0.16 25); /* delete hover solid: oklch(0.62 0.18 25) */
--scrim:rgba(0,0,0,.62);
```
Map these to shadcn names:
- **Backgrounds:** `background`=`--bg`, `card`=`--card`, `popover`=`--card`, `muted`/`secondary`=`--raise`, `accent`=`--raise2`.
- **Primary:** `primary`=`--lime`, `primary-foreground`=`--limefg`.
- **Text:** `foreground`=`--fg`, `muted-foreground`=`--mut`.
- **Lines and focus:** `border`=`--line`, `input`=`--raise`, `ring`=`--lime`.
- **Destructive:** `destructive`=`--danger`.

**Type**
- **Display/wordmark:** Unbounded 600, used only in the wordmark and in tile letters.
- **UI:** Familjen Grotesk 400–700.
- **Mono:** IBM Plex Mono, for key hints and URLs.
- **Sizes:** 34/700 page title · 21/700 detail title · 15.5/600 row title · 13 meta · 12–12.5/600 labels.

**Radii:** 7–9 (small thumbs, icon buttons) · 10–12 (buttons, inputs) · 14 (rows, bars, panels) · 18–20 (pop-up, dialogs) · 22–26 (phone sheets) · 999 (pills).

**Thumbnails:** a tinted gradient tile per site. Hue = hash(domain) × 47 mod 360, gradient `oklch(0.33 0.055 h) → oklch(0.25 0.04 h)`, letter `oklch(0.86 0.08 h)`. Videos are always a dark tile with ▶. When a real `og:image` exists, use it instead and keep the tile as the fallback.

**Shadows:** floating menus `0 0 0 1px var(--line2), 0 20px 50px -12px rgba(0,0,0,.8)`. FAB `0 14px 30px -8px rgba(0,0,0,.8)`.

## Assets
- `assets/linkables-logo.png`: the app logo (white and lime stacked squares, transparent PNG, 1387×1134). Used at 13–22px in the UI. **Todo:** a flat SVG version for 16px favicons and toolbar icons, where the 3D render goes soft.
- Icons are Lucide equivalents: pin, share (upload), trash-2, plus, search, check, panel-right, x, arrow-left, external-link.
- Fonts come from Google Fonts: Unbounded, Familjen Grotesk, IBM Plex Mono.

## Not yet designed (from the brief)
- **Light theme.**
- **Sign-in screens:** they existed in earlier prototypes but weren't carried into this one.
- **Export.**
- **Error states:** offline banner, rate limit, INTERNAL with a reference code.
- **Command palette:** ⌘K Command, plus a `?` shortcut list.
- **Tablet (768) layout.**
- **Extension options page.**
- **"Save all tabs":** the multi-tab save flow.
- **Phase 3–5 screens.**

## Files
- `prototype.dc.html` (delivered as `linkables Night.dc.html`): the full prototype, covering all three surfaces. Its logic class at the bottom of the file documents every behaviour above.
- `LinkablesMark.dc.html`: the logo component, which renders `assets/linkables-logo.png`.
- `support.js`: the prototype runtime, needed only to open the HTML. Not for production.
