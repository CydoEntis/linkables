# Publishing to the Chrome Web Store (unlisted)

The owner does this once in the Chrome Web Store developer dashboard. Friends
then install linkables with one click from the store page instead of Load
unpacked. **Unlisted** means the item never shows in store search or browsing;
only people with the link can find it.

Everything to paste or upload is in `store/`:

| File | Used for |
|---|---|
| `release/linkables-chrome-store-<version>.zip` | the package |
| `store/listing.md` | Store listing text, category, language, URLs |
| `store/icon-128.png`, `store/screenshot-*.png`, `store/promo-small-440x280.png` | Store listing images |
| `store/privacy-practices.md` | Privacy tab answers |

## 0. Get the zip

Either:

- **From CI:** open the latest green run of the CI workflow on `main` in GitHub
  Actions, and download the `linkables-chrome-store` artifact. GitHub wraps it
  in a zip of its own; unzip that once to get
  `linkables-chrome-store-<version>.zip`. Upload that inner zip, unopened.
- **Locally:** with the production values in `apps/extension/.env`
  (`VITE_APP_URL=https://linkables.app`, the production `VITE_SUPABASE_URL` and
  `VITE_SUPABASE_ANON_KEY`), run `pnpm --filter extension release:store`. It
  refuses to build against anything but `https://linkables.app`.

The store zip has no manifest `key`: the store rejects one and gives the item
its own id. So the store install has a **different id** from the hand-installed
build (`ekgbmopoceccloaibfknnbnohkpbkili`). The store item's id is
`dckjkoommfddaimpjbghbomojdkhaoai`, and both are in production's `CORS_ORIGINS`.

## 1. Developer account

1. Go to <https://chrome.google.com/webstore/devconsole> and sign in with the
   Google account that should own the item.
2. If it's the first item on this account: accept the developer agreement, pay
   the one-time US$5 registration fee, and verify the contact email under
   **Account**. Google also requires 2-Step Verification on the account.

## 2. Create the item

1. **Items › + New item.**
2. Drop in `linkables-chrome-store-<version>.zip`.
3. The dashboard opens the new draft. Its 32-letter **item id** is in the URL
   and at the top of the page. Note it for step 7.

## 3. Store listing tab

| Field | What to enter |
|---|---|
| Description | the **Description** block in `store/listing.md` |
| Category | **Productivity › Tools** (alternative: Workflow & Planning) |
| Language | **English (United States)** |
| Store icon | `store/icon-128.png` |
| Global promo video | leave empty |
| Screenshots | `store/screenshot-1-saved.png`, then `store/screenshot-2-collections.png` |
| Small promo tile | `store/promo-small-440x280.png` |
| Marquee promo tile | leave empty |
| Official URL | leave as None |
| Homepage URL | `https://linkables.app` |
| Support URL | `https://linkables.app/support` |
| Mature content | off |

The name (**linkables**) and the summary come from the package's
`manifest.json`, so they show here already and aren't editable.

**Save draft.**

## 4. Privacy tab

Copy each answer from `store/privacy-practices.md`:

1. **Single purpose description:** the Single purpose block.
2. **Permission justification:** one box each for `activeTab`, `storage`,
   `identity` and the host permissions (`https://linkables.app/*` and the
   Supabase URL).
3. **Are you using remote code?** No, I am not using remote code.
4. **Data usage:** tick **Personally identifiable information**,
   **Authentication information**, **Location** (IP address, in the sign-in
   provider's logs) and **Web history**; leave every other category unticked.
5. **Certifications:** tick all three.
6. **Privacy policy URL:** `https://linkables.app/privacy`

**Save draft.**

## 5. Test instructions tab

Reviewers must be able to sign in, and sign-in is invite-only with a code sent
by email. Without a working account the review is likely to be rejected for
"functionality can't be verified". Before submitting:

1. Make a mailbox the reviewer can open, for example a new Gmail account used
   only for this.
2. Invite that address in linkables, the same way as any beta tester.
3. In **Test instructions**, write:

```
linkables is in a private beta; only invited accounts can sign in.
Test account: <the mailbox address>
Mailbox password: <its password>
1. Click the linkables toolbar button on any web page.
2. Enter the test account's email and click "Email me a code".
3. Open the mailbox, copy the 6-digit code from the linkables email and enter it.
4. The pop-up saves the page you are on. Pin it or tick a collection; the result shows at https://linkables.app after signing in with the same email.
```

Turn off any sign-in alerts or new-device challenges on that mailbox you can, or
the reviewer may be blocked from opening it.

## 6. Distribution tab

| Field | Value |
|---|---|
| Payments | Free of charge |
| Visibility | **Unlisted** |
| Distribution | All regions |

Then **Submit for review**. Leave "Publish automatically after review" on,
unless you want to press Publish yourself once it passes.

**Review time:** usually one to three days; the first item from a new
developer account can take a week or more. The dashboard and the account's
email say when it's approved or why it was rejected. A rejection names the
policy; fix the field and resubmit.

## 7. After approval: tell Claude

Send Claude:

- the **item id** (32 letters a–p), and
- the **store URL**, `https://chromewebstore.google.com/detail/linkables/<item id>`.

Claude then:

1. adds `chrome-extension://<item id>` to `CORS_ORIGINS` in
   `deploy/.env.production.example`, next to the hand-install id, so both
   installs work, and tells you the line to put in the server's `.env`;
2. sets `CHROME_WEB_STORE_URL` in `apps/web/src/extension-guide/path.ts`, which
   switches `/extension` and the landing page's Chrome card to **Add to Chrome**.

Until step 7 ships, keep sending friends to `https://linkables.app/extension`.

## Updating later

Bump `version` in `apps/extension/package.json` (the store refuses a version it
has seen), let CI build the new zip, then **Package › Upload new package** on the
item and submit again. Store installs update themselves.
