// Set when the user signs out of the extension by hand, so the next visit to
// linkables.app does not sign it straight back in. A visit to the connect page,
// which the "Sign in with linkables.app" button opens, clears it.
const PAUSED_KEY = "linkables.auto-connect-paused";

export async function pauseAutoConnect(area: chrome.storage.StorageArea): Promise<void> {
  await area.set({ [PAUSED_KEY]: true });
}

export async function resumeAutoConnect(area: chrome.storage.StorageArea): Promise<void> {
  await area.remove(PAUSED_KEY);
}

export async function isAutoConnectPaused(area: chrome.storage.StorageArea): Promise<boolean> {
  return (await area.get(PAUSED_KEY))[PAUSED_KEY] === true;
}
