# The "Save to linkables" iPhone Shortcut

iPhone Safari does not let a web app appear in the Share menu, so iPhone saving
goes through an Apple Shortcut. You make it once, share it as an iCloud link, and
the app's Save from anywhere page offers that link to everyone.

What it does: takes the link you shared (or, if you share nothing, the link you
copied), and opens `https://<your linkables address>/save?url=<that link>` in
Safari. linkables then saves it and shows "Saved to linkables".

You need an iPhone or iPad with the Shortcuts app, and iCloud turned on for
Shortcuts (Settings → your name → iCloud → Show All → Shortcuts).

## Make the shortcut

Below, `https://<your linkables address>` is the address the web app is served
from, such as `https://linkables.example.com`. No slash at the end.

1. Open the **Shortcuts** app and tap **+** at the top right. A new, empty
   shortcut opens.
2. Tap the name at the top (it says "New Shortcut"), tap **Rename**, and type
   **Save to linkables**.
3. Tap the name again and choose **Choose Icon**. Pick a green colour and the
   bookmark symbol. Tap **Done**.
4. Tap the **ⓘ** button at the bottom and turn on **Show in Share Sheet**. Tap
   **Done**. A block appears at the top: "Receive **Any** input from **Share
   Sheet**".
5. In that block, tap **Any**. Tap **Clear**, then tick only **URLs** and
   **Safari web pages**. Tap outside the list to close it.
6. In the same block, tap the words after "If there's no input" and choose
   **Get Clipboard**. Now a shortcut run with nothing shared uses the copied
   link.
7. Tap the search field at the bottom ("Search for apps and actions"), type
   **Get URLs from Input**, and tap it. It should read "Get URLs from
   **Shortcut Input**". If it shows something else, tap that word and choose
   **Shortcut Input**.
8. Search for **Get Item from List** and tap it. It should read "Get **First
   Item** from **URLs**".
9. Search for **URL Encode** and tap it. It should read "**Encode** **Item from
   List**".
10. Search for **URL** (the action with the blue link icon, just called "URL")
    and tap it. Tap its text box and type
    `https://<your linkables address>/save?url=`
    Then, with the cursor right after `url=`, tap **URL Encoded Text** in the bar
    above the keyboard to put it at the end. There must be no space before it.
11. Search for **Open URLs** and tap it. It should read "Open **URL**".
12. Tap **Done** at the top right.

The finished shortcut, top to bottom:

```
Receive URLs and Safari web pages from Share Sheet
  If there's no input: Get Clipboard
Get URLs from Shortcut Input
Get First Item from URLs
Encode Item from List
URL: https://<your linkables address>/save?url=[URL Encoded Text]
Open URL
```

## Try it

1. In Safari, open linkables and sign in. The shortcut opens Safari, and
   Safari keeps its own sign-in, separate from the home-screen app.
2. Still in Safari, open any web page, tap **Share**, scroll down the list of
   actions, and tap **Save to linkables**. Safari opens linkables and shows
   "Saved to linkables".
3. In YouTube, open a video, tap **Share**, then **More** (the "…" at the end of
   the row), then **Save to linkables**. The video shows up in To sort.
4. Copy any link, open the Shortcuts app, and tap the **Save to linkables**
   tile. The copied link is saved.

The first time, iPhone asks whether the shortcut may open your linkables
address. Tap **Allow**.

## Share it

1. In the Shortcuts app, press and hold the **Save to linkables** tile.
2. Tap **Share**, then **Copy iCloud Link**.
3. Paste the link somewhere safe. It looks like
   `https://www.icloud.com/shortcuts/…`.

## Put the link in the app

The web app reads the link from `VITE_IOS_SHORTCUT_URL` when it is built.

1. Add this line to `apps/web/.env` (and to the environment of whatever builds
   the production web app):

   ```
   VITE_IOS_SHORTCUT_URL=https://www.icloud.com/shortcuts/…
   ```

2. Build and deploy the web app again. The value is baked in at build time, so
   a running app does not pick it up.
3. Open Save from anywhere on an iPhone (account menu → **Save from
   anywhere**). It now shows **Add the shortcut** instead of "The iPhone
   shortcut is coming soon".

The app only accepts an `https://` link here. Anything else stops the app from
starting, and the browser console says "Invalid web env, check apps/web/.env:
VITE_IOS_SHORTCUT_URL". Leave the line empty to go back to "coming soon".

If you change the shortcut later, share it again and update the link: an iCloud
link is a copy of the shortcut as it was when you shared it.
