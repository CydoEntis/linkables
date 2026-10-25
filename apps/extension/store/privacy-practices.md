# Chrome Web Store privacy practices

Answers for the developer dashboard's **Privacy practices** tab, checked
against the extension's code (`src/`, `manifest.ts`). If the code changes what
it reads, sends or stores, update this file and the Chrome extension section of
the privacy policy (`apps/web/src/marketing/legal/privacy.tsx`) together.

## Single purpose

```
Save the web page in the current tab to the user's linkables account, and let the user pin that saved link or file it in one of their collections.
```

## Permission justifications

### activeTab

```
When the user clicks the linkables toolbar button, the extension reads the address and title of the tab they are on so it can save that page. It reads nothing from the tab before the click, never reads page content, and never accesses other tabs.
```

### storage

```
Keeps the user signed in: the sign-in session (access and refresh tokens) is stored in chrome.storage.local. While the user is entering the emailed sign-in code, their email address and the time the code was sent are kept in chrome.storage.session so closing the pop-up doesn't lose their place.
```

### Host permission: https://linkables.app/*

```
linkables.app hosts the linkables API. The extension sends the saved page's address there, reads the user's collections, and saves pin and collection changes the user makes in the pop-up.
```

### Host permission: https://tiechzmcvmdlceyovskg.supabase.co/*

The dashboard shows host permissions together; mention both in the one box if
it gives only one:

```
This is linkables' sign-in service (Supabase Auth). The extension sends the user's email address to receive a 6-digit sign-in code, sends the code to sign in, and refreshes and ends the session.
```

## Remote code

```
No, I am not using remote code.
```

All JavaScript is bundled in the package (`vite.config.ts` turns off module
preloading; there is no `eval`, no remote `<script>`, and fonts are bundled).

## Data usage

Tick these categories; leave the rest unticked.

| Category | Tick | What, from the code |
|---|---|---|
| Personally identifiable information | **Yes** | The email address, sent to the sign-in service for the code (`src/auth/email-code.ts`) and held briefly in `chrome.storage.session` (`src/auth/pending-code.ts`). |
| Health information | No | |
| Financial and payment information | No | |
| Authentication information | **Yes** | The emailed 6-digit code, sent to the sign-in service once; the session's access and refresh tokens, stored in `chrome.storage.local` and sent to linkables.app with each request (`src/auth/supabase.ts`, `src/api/api.ts`). |
| Personal communications | No | |
| Location | No | No location is read. The server's logs keep no IP addresses (privacy policy, Server logs). |
| Web history | **Yes** | The address of the page the user clicks to save is sent to linkables.app and stored in their account (`src/save/use-save-current-tab.ts`). It is one page per click, never a browsing history, but the store's definition covers visited addresses, so declare it. |
| User activity | No | No clicks, keystrokes or scrolling are monitored. Pin and collection choices are the user's own edits to their links. |
| Website content | No | The tab's title is read but only shown in the pop-up; it is never sent. No page text, images or form data are read. |

## Certifications

Tick all three:

- I do not sell or transfer user data to third parties, outside of the approved use cases.
- I do not use or transfer user data for purposes that are unrelated to my item's single purpose.
- I do not use or transfer user data to determine creditworthiness or for lending purposes.

Supabase (sign-in) and the hosting provider are service providers acting for
linkables, which the approved use cases allow.

## Privacy policy URL

```
https://linkables.app/privacy
```

Its "The Chrome extension (beta)" section describes what the extension reads,
sends and stores.
