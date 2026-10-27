// Its own module so the prerendered landing page can link here without loading the page.
export const EXTENSION_GUIDE_PATH = "/extension";

// The extension's Chrome Web Store page (apps/extension/STORE.md). When undefined,
// /extension and the landing page fall back to the by-hand install.
export const CHROME_WEB_STORE_URL: string | undefined = undefined;
