// supabase-js storage on chrome.storage rather than localStorage: an MV3 service worker
// has no localStorage, and Phase 2's quiet save runs in one with the same session.
export function chromeStorage(area: chrome.storage.StorageArea) {
  return {
    async getItem(key: string): Promise<string | null> {
      const value = (await area.get(key))[key];
      return typeof value === "string" ? value : null;
    },
    setItem: (key: string, value: string) => area.set({ [key]: value }),
    removeItem: (key: string) => area.remove(key),
  };
}

// The PKCE verifier only has to last until the Google window returns, so it is
// kept in memory (chrome.storage.session) rather than written to disk.
export function authStorage(local: chrome.storage.StorageArea, session: chrome.storage.StorageArea) {
  const [persistent, inMemory] = [chromeStorage(local), chromeStorage(session)];
  const areaFor = (key: string) => (key.endsWith("-code-verifier") ? inMemory : persistent);
  return {
    getItem: (key: string) => areaFor(key).getItem(key),
    setItem: (key: string, value: string) => areaFor(key).setItem(key, value),
    removeItem: (key: string) => areaFor(key).removeItem(key),
  };
}
