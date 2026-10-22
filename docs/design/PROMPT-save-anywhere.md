# Design prompt: save from anywhere

Paste everything below the line into the design tool, in the same project as the
first designs so it keeps the look you already have.

---

Keep the linkaroo look you already designed (same colours, fonts, logo, dark and
light). This round is about one thing: **saving a link without copy and paste.**
Copy-paste is too much work, especially on a phone, and browsers often block apps
from reading the clipboard. People should save from wherever they already are.
The paste box stays, but only as a small backup.

Design these screens, each in light and dark:

1. **"Save from anywhere" welcome** (first time someone signs in). It shows the
   easiest way to save for the device they're on:
   - Android phone: "Tap Share in any app, then linkaroo." Plus an "Add linkaroo
     to your home screen" button (sharing only works after that).
   - iPhone: "Add the Save to linkaroo shortcut, then tap Share, then Save to
     linkaroo." Plus an "Add the shortcut" button.
   - Desktop: "Drag this button to your bookmarks bar" (a draggable "Save to
     linkaroo" button), plus "Or drag any link onto this window." Show "Chrome
     extension: coming soon" as a quiet note.
   One clear step per device, friendly, not a wall of text. Skippable.

2. **Android share flow** (phone frames): someone is in YouTube, taps Share, sees
   linkaroo in the share sheet, taps it, and a small linkaroo screen says
   "Saved to Inbox" with the video's title, an Undo, "Add to collection", and it
   closes itself after a moment. Show the share sheet with the linkaroo icon in it.

3. **iPhone shortcut flow:** the share sheet with a "Save to linkaroo" shortcut,
   then the linkaroo "Saved to Inbox" screen opening in Safari. Also a 3-step
   setup guide for adding the shortcut (Get the shortcut → Add shortcut → Use it
   from Share), with simple illustrated steps.

4. **Desktop bookmark button flow:** clicking "Save to linkaroo" in the bookmarks
   bar opens a small popup window: "Saved to Inbox" with title, Undo, "Add to
   collection", closes after a moment.

5. **Drag and drop on desktop:** while a link is dragged over the app, the window
   shows a big friendly drop zone: "Drop to save". After dropping, the new card
   hops into the Inbox.

6. **The "saved" screen in every state** (used by all the flows above):
   saving · saved · already saved ("You saved this on Mar 3 · in Rust", with
   Open) · no link found in what was shared (with a small paste box) · signed out
   ("Sign in to save this link", then it finishes the save after sign-in).

7. **Empty Inbox:** instead of only a paste box, it teaches the easiest way to save
   on this device (the same one-step message as the welcome screen), with a
   "See other ways" link.

8. **Inbox with the paste box demoted:** the paste box is smaller and secondary;
   the main header area can show a small "Save from anywhere" hint the first few
   times.

Rules: one step per message, no jargon ("share sheet" is fine, never "PWA",
"bookmarklet" or "clipboard API"). Saving must feel instant and calm. Phone frames
at 375 px, desktop at 1280 px.

Deliver: the screens as React + Tailwind + shadcn code (or HTML with Tailwind
classes), reusing the theme variables from the first round.
