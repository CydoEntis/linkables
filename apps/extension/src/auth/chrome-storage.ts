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
