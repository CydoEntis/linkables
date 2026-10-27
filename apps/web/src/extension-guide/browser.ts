// The guide explains temporary installation until a matching signed release exists.
export const FIREFOX_ADDON_URL = "/extension";

// Firefox for Android installs add-ons from Mozilla's site only, so phones keep the Chrome/guide path.
export const isFirefox = () => /Firefox\//.test(navigator.userAgent) && !/Android|Mobile|Tablet/.test(navigator.userAgent);
