// An in-memory chrome.storage area, for tests that run outside the extension.
export function memoryStorageArea(): chrome.storage.StorageArea {
  const items = new Map<string, unknown>();
  return {
    get: (key) => Promise.resolve(items.has(key) ? { [key]: items.get(key) } : {}),
    set: (values) => {
      for (const [key, value] of Object.entries(values)) items.set(key, value);
      return Promise.resolve();
    },
    remove: (key) => {
      items.delete(key);
      return Promise.resolve();
    },
  };
}
