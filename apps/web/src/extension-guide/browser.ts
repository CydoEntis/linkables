// The signed add-on (apps/extension/README.md). Firefox installs it on click; a new release is a new download.
export const FIREFOX_ADDON_URL = "/downloads/linkables-firefox.xpi";

// Firefox for Android installs add-ons from Mozilla's site only, so phones keep the Chrome/guide path.
export const isFirefox = () => /Firefox\//.test(navigator.userAgent) && !/Android|Mobile|Tablet/.test(navigator.userAgent);
