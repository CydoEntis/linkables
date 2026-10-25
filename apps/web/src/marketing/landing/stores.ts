// SAVE_ANYWHERE_PATH, spelled out: SaveAnywherePage touches window on import,
// which breaks the prerender. StoreSection.test.tsx checks the two match.
const SAVE_ANYWHERE_GUIDE = "/save-from-anywhere";

export type StoreKey = "iphone" | "android" | "chrome" | "web";

// A card with a cta is Available now; one without is Coming soon. Launching a
// platform is giving its card a body and a cta here.
export type StoreCard = { key: StoreKey; name: string; body: string; cta: { label: string; href: string } | null };

export function storeCards(shortcutUrl: string | undefined, inviteOnly: boolean): StoreCard[] {
  return [
    {
      key: "iphone",
      name: "iPhone & iPad",
      body: "Add the Save to linkables shortcut once. Then tap Share, then Save to linkables, in any app.",
      cta: { label: "Add the shortcut", href: shortcutUrl ?? SAVE_ANYWHERE_GUIDE },
    },
    {
      key: "android",
      name: "Android",
      body: "Open linkables.app in Chrome, sign in and tap Install. It then shows up in Share in every app.",
      cta: { label: "Install the app", href: "/sign-in" },
    },
    {
      key: "chrome",
      name: "Chrome extension",
      body: "Save a tab in one click, pin it, share it, or drop it in a collection.",
      cta: null,
    },
    {
      key: "web",
      name: "Web app",
      body: "Open linkables.app in any browser to search, sort and find everything you've saved.",
      cta: { label: inviteOnly ? "Sign in" : "Open the web app", href: "/sign-in" },
    },
  ];
}
