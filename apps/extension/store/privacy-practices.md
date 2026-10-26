# Chrome Web Store privacy practices

Answers for the developer dashboard's **Privacy practices** tab, checked
against the extension's code (`src/`, `manifest.ts`). If the code changes what
it reads, sends or stores, update this file and the Chrome extension section of
the privacy policy (`apps/web/src/marketing/legal/privacy.tsx`) together.

## Single purpose

```
Save the web page in the current tab, or a link on it, to the user's linkables account, and let the user pin, file, find and share what they saved.
```

## Permission justifications

### activeTab

```
When the user clicks the linkables toolbar button, presses the side panel shortcut, or chooses "Save link to linkables" from the right-click menu, the extension reads the address and title of the tab they are on so it can save that page or show it in the side panel. It reads nothing from a tab before the user does one of these on it, never reads page content, and asks for no access to other tabs unless the user turns on the optional "Follow the tab you're on" (tabs, below).
```

### tabs (optional, requested at runtime)

Not asked for at install. The dashboard may list it with the others; if it asks:

```
Optional. Requested only when the user turns on "Follow the tab you're on" in the side panel, and removable there. With it, the side panel reads the address and title of the active tab while the panel is open, so it can show that page and whether it is saved as the user switches tabs. It never reads page content.
```

### sidePanel

```
The side panel shows the page the user is on with a Save button, and the user's recent and pinned links and collections, so they can find and share what they saved without leaving the page.
```

### contextMenus

```
Adds "Save link to linkables" to the right-click menu on links, which saves that link's address to the user's account.
```

### storage

```
Keeps the user signed in: the sign-in session (access and refresh tokens, and the account's email address) is stored in chrome.storage.local until the user signs out, with a flag that the user signed out by hand. While the user is entering the emailed sign-in code, their email address and the time the code was sent are kept in chrome.storage.session so closing the pop-up doesn't lose their place; while the extension signs in from linkables.app, a one-time random value that ties the request to its answer is kept there for up to two minutes.
```

### identity

```
Opens the Google sign-in window when the user clicks Continue with Google in the pop-up, and receives the one-time sign-in code it returns. It is not used for anything else and reads no Chrome profile or Google account data.
```

### Host permission: https://linkables.app/*

```
linkables.app hosts the linkables API. The extension sends the saved page's address there, sends the current page's address from the side panel to check whether it is already saved, reads the user's links and collections, and saves pin, collection and sharing changes the user makes in the pop-up and side panel. A content script runs only on linkables.app pages: when the user is signed in there and the extension is not, the page hands the extension a one-time sign-in token so the user doesn't have to sign in twice. It reads nothing else from the page.
```

### Host permission: https://tiechzmcvmdlceyovskg.supabase.co/*

The dashboard shows host permissions together; mention both in the one box if
it gives only one:

```
This is linkables' sign-in service (Supabase Auth). The extension sends the user's email address to receive a 6-digit sign-in code, sends the code (or the one-time token from linkables.app, or the code Google sign-in returns) to sign in, and refreshes and ends the session.
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
| Personally identifiable information | **Yes** | The email address, sent to the sign-in service for the code (`src/auth/email-code.ts`), held briefly in `chrome.storage.session` while the code is entered (`src/auth/pending-code.ts`), and kept in `chrome.storage.local` as part of the signed-in session (its `user.email`) until sign-out (`src/auth/supabase.ts`). |
| Health information | No | |
| Financial and payment information | No | |
| Authentication information | **Yes** | The emailed 6-digit code, the one-time token linkables.app hands over (`src/connect`) or the code Google sign-in returns (`src/auth/worker-sign-in.ts`), each sent to the sign-in service once; the session's access and refresh tokens, stored in `chrome.storage.local` and sent to linkables.app with each request (`src/auth/supabase.ts`, `src/api/api.ts`). |
| Personal communications | No | |
| Location | **Yes** | IP address, in the sign-in provider's logs: the extension calls Supabase directly to sign in, and Supabase keeps sign-in logs that include IP addresses (privacy policy, Where your data lives). No other location is read. |
| Web history | **Yes** | The address of the page the user clicks to save is sent to linkables.app and stored in their account (`src/save/use-save-current-tab.ts`). While the side panel is open, the address of a tab the user has used linkables on (or of the active tab, with Follow the tab you're on) is sent to check whether it is saved (`src/side-panel/queries.ts`); it is not stored. A link saved from the right-click menu sends that link's address (`src/background/save-link-menu.ts`). It is never a browsing history, but the store's definition covers visited addresses, so declare it. |
| User activity | No | No clicks, keystrokes or scrolling are monitored. Pin and collection choices are the user's own edits to their links. |
| Website content | No | The tab's title is read but only shown in the pop-up and side panel; it is never sent. No page text, images or form data are read. |

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
