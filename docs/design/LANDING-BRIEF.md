# linkables — Landing page design brief

For the designer. This covers the public pages at `https://linkables.app`: the
landing page that doubles as the marketing site, plus Privacy, Terms, Support and
404. The app's own screens are already designed (`docs/design/handoff/`); this page
must look like the same product.

The designs will be built by AI coding agents (Claude Code) working from your
handoff, so the handoff rules in section 9 matter as much as the visuals.

## 1. Why this page exists

1. **Explain linkables in five seconds** to someone who has never heard of it, and
   get them to press **Get started**.
2. **Show that saving works everywhere**: iPhone, Android, any desktop browser,
   and soon a Chrome extension and an iPhone app.
3. **Unblock the stores and Google.** Google sign-in can't go public, and the
   Chrome Web Store and Apple App Store won't accept the apps, without a public
   home page, privacy policy, terms and a support page on our own domain.
4. **Be found in search and look good when shared** (Discord, iMessage, X,
   Slack link previews).

## 2. The product in one paragraph

Save any link in seconds, find it later from any device. People today send
themselves YouTube links and articles in Discord or a chat with themselves, or
keep hundreds of tabs open. linkables replaces that: share a link to linkables
from any app, and it lands in **To sort** with its title and thumbnail. Later,
search it, file it in collections, pin what matters. Principles: **save now,
organise later · simple before powerful · fast and lightweight · private by
default · useful without AI · your data is portable.**

Audience: people who save a lot of links and lose them. Students, developers,
creators, anyone with too many tabs. Casual, not enterprise.

## 3. How the page lives with the app (fixed)

- Same address as the app. A visitor who is **not signed in** sees the landing
  page at `linkables.app/`. A **signed-in** user going to `/` goes straight to
  their links and never sees the landing page.
- Header has **Sign in** (ghost) and **Get started** (the one lime button). Both
  lead to the existing sign-in screen (Continue with Google, email fallback).
- The pages are served as ready-made HTML for search engines, so **design for
  content, not for app-like interactivity**: no carousels that hide content, no
  content that only appears on scroll or hover, no text baked into images.
- Light motion is welcome (a saving animation, a confetti nod to the pin
  animation in the app) but every section must read fully with motion off
  (`prefers-reduced-motion`).

## 4. Look and brand (reuse, don't reinvent)

Use the app's existing system from `docs/design/handoff/README.md`:

- **Dark theme**, same tokens: `--bg #121212`, `--card #1a1a1a`, `--raise #1f1f1f`,
  `--fg #ecebe8`, `--mut #8d8d88`, lime `oklch(0.89 0.19 125)` with `--limefg
  #16200a`. You may add a few landing-only tokens (a larger surface tint, a
  section divider) if you name and document them.
- **Type:** Unbounded 600 for the wordmark and big headlines, Familjen Grotesk for
  everything else, IBM Plex Mono for URLs and key hints. You set the landing
  type scale (the app tops out at 34 px; the hero can go much bigger).
- **Logo:** `docs/design/handoff/assets/linkables-logo.png` (white and lime
  stacked squares). **Needed:** a flat SVG of the mark that holds up at 16 px
  (favicon, toolbar icon). This is an open item from the app handoff.
- **One lime action per view**, same as the app. Ghost and white buttons for
  everything else.
- Real product UI in the visuals: link cards, To sort, the phone share sheet, the
  extension pop-up, taken from the app prototype. No stock photos, no abstract 3D
  blobs, no purple-blue gradients.

## 5. Pages and sections

### 5.1 Landing (`/`)

Suggested order; propose better if you have it.

1. **Header:** logo + wordmark · "How it works" · "Download" anchor links · Sign
   in · **Get started**. Collapses to logo + Get started + menu on phones.
2. **Hero:** headline, one-line subhead, **Get started — it's free**, a ghost
   "See how it works" link. Visual: a short loop of a link being shared from a
   phone and appearing in To sort on a laptop.
   Draft headlines (pick, rewrite or replace):
   - "Every link you meant to come back to. In one place."
   - "Stop sending links to yourself."
   - "Save it now. Find it later. On any device."
3. **The problem:** a quick, recognisable picture of today: a Discord chat with
   yourself, 87 open tabs, a notes app full of bare URLs.
4. **How it works:** three steps. **Share** a link from any app → it lands in
   **To sort** with title and thumbnail → **find it** with search, collections
   and pins.
5. **Save from anywhere:** one card per platform. **Every card has two states**:
   *Available now* and *Coming soon*. Draw both, because cards flip as apps ship
   and must not need a redesign:

   | Platform | Today | Later |
   |---|---|---|
   | iPhone / iPad | "Add the shortcut" (one-tap Apple Shortcut) | App Store badge, share-sheet app |
   | Android | "Install the app" (from Chrome), then Share → linkables | Google Play badge (maybe) |
   | Desktop browsers | Bookmark button: drag to the bookmarks bar | — |
   | Chrome | Coming soon | Chrome Web Store badge: save tabs, save a whole window |
   | Any device | linkables.app in the browser | — |

   Use the official store badges, unmodified, when they appear (Apple, Google
   Play and Chrome Web Store each publish badge rules).
6. **Find it later:** search (title, description, URL, site), collections, pinned
   first, works the same on phone and desktop. Show the real UI.
7. **Yours, privately:** no ads, no tracking, your links are only yours, export
   everything as a file any time. Short, plain, believable.
8. **FAQ** (text visible on the page, not hidden behind JavaScript-only toggles;
   a native disclosure element is fine): Is it free? Which devices? Do I need an
   account? Is my data private? Can I export my links? Is there a Chrome
   extension / iPhone app?
9. **Final call to action:** one line + **Get started**.
10. **Footer:** Privacy · Terms · Support · contact email · © year. Room for a
    small "Made by Cody Stine" link to codystine.com.

### 5.2 Privacy (`/privacy`), Terms (`/terms`), Support (`/support`)

One reusable **long-text template**: page title, last-updated date, a short
summary box at the top ("The short version"), then sections with headings.
Comfortable reading width (around 680 px), sticky table of contents on desktop
only.

- I'll write the legal copy; you design the template. Privacy will have sections
  for the **web app**, the **Chrome extension** (it reads the URL and title of
  tabs you choose to save) and the **iPhone app**, so plan for a long page with
  several sections.
- **Support:** contact email, link to the FAQ, how to export or delete your data.
  Apple requires a support URL for the App Store; this is it.

### 5.3 404

Friendly, short, on brand ("This link didn't save." or similar), button back home.

## 6. Breakpoints and states

- **Widths:** 360, 768, 1280 (and how it stretches to 1600+). **Hard rule: no
  horizontal scroll at 360 px.**
- Hover and keyboard focus for every link and button (visible lime focus ring,
  as in the app).
- Reduced-motion version of anything animated.
- Store cards: *available* and *coming soon* (section 5.5).

## 7. Accessibility

WCAG 2.2 AA: contrast (lime text on dark is fine, dark-on-lime buttons as in the
app), one `h1` per page, headings in order, alt text for every image that carries
meaning, tap targets at least 44 px on phones.

## 8. SEO and sharing deliverables

| Deliverable | Spec |
|---|---|
| Page titles and descriptions | Propose for `/`, `/privacy`, `/terms`, `/support` (title ≤ 60 chars, description ≤ 155) |
| Social preview image | 1200×630 PNG for `/`; one generic for the legal pages |
| Favicon set | SVG (flat mark), 32×32 PNG, 180×180 Apple touch icon |
| App icons | 192 and 512 PNG, plus a maskable 512 with safe padding |
| Words people search for | Use these naturally in headings and copy: save links, bookmark manager, save YouTube videos for later, read later, save links from iPhone, share links to yourself, tab overload |

Later, not now: Chrome Web Store assets (128 icon, 1280×800 screenshots, 440×280
tile) and App Store screenshots. Keep the visual style of the landing page
reusable for them.

## 9. Handoff format

Same as the app handoff in `docs/design/handoff/`:

- An HTML prototype (or Figma with the same detail) for every page at 360, 768
  and 1280, with the final copy in place.
- A README listing any new tokens, the type scale, spacing, section order and
  behaviour (what animates, reduced-motion fallback, which anchors scroll where).
- Exported assets: logo SVG, favicons, app icons, social preview images,
  illustrations as SVG or WebP at 1× and 2×, store badge placement.
- Name layers and classes after the sections in this brief so the build maps
  one-to-one.

## 10. Not in scope

Pricing page (nothing is paid yet), blog, changelog, light theme (dark only, like
the app), sign-up flow changes, any page that needs an account.
