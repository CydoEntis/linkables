# Chrome Web Store listing

Paste each field into the developer dashboard's **Store listing** tab
(`../STORE.md` walks through it).

## Name

Taken from the package's `manifest.json`, so it isn't typed in the dashboard:

```
linkables
```

## Summary

Also from `manifest.json` (`description` in `manifest.ts`), at most 132
characters; `manifest.test.ts` checks the length. It reads:

```
Save the page you're on to linkables in one click, then pin it or file it in a collection. Private beta, sign-in required.
```

## Description

```
Save the page you're on to linkables in one click, then find it later on any device.

linkables keeps the links you mean to come back to: the recipe, the video, the article someone sent you. This extension is the quick way in from Chrome.

What it does
• Click linkables in the toolbar and the tab you're on is saved to your account. A page you saved before shows as Already saved instead of a copy.
• Pin the link, or file it in one of your collections, right from the pop-up. Type to find a collection or create a new one.
• All links opens linkables.app, where you can search, sort and read everything you've saved from your phone, Chrome and the web.

What it doesn't do
• It only reads the tab you're on, and only when you click the toolbar button. It doesn't read what you type into pages, your passwords or your browsing history.
• It doesn't run on pages in the background, show ads or track you.
• It saves the page's address only. Page titles and previews are fetched by linkables' server afterwards, not read from your browser.

Before you install
• linkables is in a private beta. You need an invited linkables account to sign in.
• You sign in with a 6-digit code sent to your email. There's no password.
• Some pages can't be saved: Chrome's own pages (like Settings), files on your computer and Chrome Web Store pages.

Privacy policy: https://linkables.app/privacy
Help: https://linkables.app/support
```

## Category

```
Productivity › Tools
```

The dashboard's category list is grouped; **Productivity › Tools** fits a
save-for-later button best. **Productivity › Workflow & Planning** is the
alternative.

## Language

```
English (United States)
```

## Graphic assets

| Field | File | Size |
|---|---|---|
| Store icon | `icon-128.png` | 128×128 (96×96 mark, 16px transparent padding) |
| Screenshots | `screenshot-1-saved.png`, `screenshot-2-collections.png` | 1280×800 each |
| Small promo tile | `promo-small-440x280.png` | 440×280 |
| Marquee promo tile | none (optional, only used if Google features the item) | |

Redraw them with `pnpm --filter extension store:images` after a pop-up change;
`store/images.test.ts` checks every size.

## Additional fields

| Field | Value |
|---|---|
| Official URL | none (needs a Search Console-verified site; leave it empty) |
| Homepage URL | `https://linkables.app` |
| Support URL | `https://linkables.app/support` |
| Mature content | No |
