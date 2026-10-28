# The "Save to linkables" iPhone Shortcut

iPhone saving from another app uses an Apple Shortcut. Create it once for your
own Linkables server. The app's **Save from anywhere** page gives manual steps
and the current server's exact address. No iCloud link or custom web build is
required.

What it does: takes the link you shared (or, if you share nothing, the link you
copied), and opens `https://<your linkables address>/save?url=<that link>` in
your default browser, which is Safari unless you changed it (Settings → Apps →
Default Browser App). linkables then saves it and shows "Saved to linkables".

You need an iPhone or iPad with the Shortcuts app. Keep Tailscale connected when
your server is reachable only through your tailnet. iCloud is needed only if you
choose to share the finished shortcut as an iCloud link.

## Make the shortcut

Below, `https://<your linkables address>` is your own instance's address, such as
`https://research.your-tailnet.ts.net`. Open **Save from anywhere** on that
instance and copy the URL prefix shown in the iPhone instructions. It is generated
from the current browser origin, including a custom port when present.

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

1. In your default browser (usually Safari), open linkables and sign in. The
   shortcut opens that browser, and it keeps its own sign-in, separate from
   the home-screen app.
2. In Safari, open any web page, tap **Share**, scroll down the list of
   actions, and tap **Save to linkables**. Your default browser opens linkables and shows
   "Saved to linkables".
3. In YouTube, open a video, tap **Share**, then **More** (the "…" at the end of
   the row), then **Save to linkables**. The video shows up in New.
4. Copy any link, open the Shortcuts app, and tap the **Save to linkables**
   tile. The copied link is saved.

The first time, iPhone asks whether the shortcut may open your linkables
address. Tap **Allow**.

The shortcut saves the first URL if the source app shares several. The URL Encode
step keeps the source URL's query parameters and fragment inside the `url`
parameter. Encode only the shared URL, not the entire Linkables destination.

## Add Linkables to the home screen

In Safari, open your HTTPS instance, tap **Share**, then **Add to Home Screen**.
The installed PWA and your default browser can have separate sign-in sessions.
Sign in to the default browser once before testing the shortcut.

## Optionally share a prebuilt shortcut

1. In the Shortcuts app, press and hold the **Save to linkables** tile.
2. Tap **Share**, then **Copy iCloud Link**.
3. Paste the link somewhere safe. It looks like
   `https://www.icloud.com/shortcuts/…`.

## Optionally offer an iCloud link in a custom web build

Manual setup always remains available. A custom web build can additionally read
an iCloud shortcut link from `VITE_IOS_SHORTCUT_URL` at build time. The normal
self-hosted Docker build does not need this setting.

1. Add this line to `apps/web/.env` (and to the environment of whatever builds
   the production web app):

   ```
   VITE_IOS_SHORTCUT_URL=https://www.icloud.com/shortcuts/…
   ```

2. Build and deploy the web app again. The value is baked in at build time, so
   a running app does not pick it up.
3. Open Save from anywhere on an iPhone (account menu → **Save from
   anywhere**). Its iPhone instructions now also include **Use an existing iCloud
   shortcut**. Open that disclosure to find **Add the shortcut**. Check that the
   shortcut's URL action targets this instance before using it.

The app only accepts an `https://` link here. An invalid value stops startup with
a configuration error naming `VITE_IOS_SHORTCUT_URL`. Leave the line empty to
offer only manual setup.

If you change the shortcut later, share it again and update the link: an iCloud
link is a copy of the shortcut as it was when you shared it.

Apple documents enabling [Show in Share Sheet](https://support.apple.com/guide/shortcuts/launch-a-shortcut-from-another-app-apd163eb9f95/ios)
and constructing a URL with the [URL and Open URLs actions](https://support.apple.com/guide/shortcuts/use-another-apps-url-scheme-apd68802640c/ios).
Action labels can vary with the system language and iOS version.
