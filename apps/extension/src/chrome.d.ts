// The few extension APIs the popup uses, typed here rather than pulling in all of @types/chrome.
declare namespace chrome {
  namespace storage {
    interface StorageArea {
      get(keys: string): Promise<Record<string, unknown>>;
      set(items: Record<string, unknown>): Promise<void>;
      remove(keys: string): Promise<void>;
    }
    const local: StorageArea;
    // Kept in memory until the browser closes.
    const session: StorageArea;
  }

  namespace tabs {
    // url and title are only present while the extension may read the tab (activeTab or a host permission).
    interface Tab {
      id?: number;
      url?: string;
      title?: string;
    }
    function query(queryInfo: { active: boolean; currentWindow: boolean }): Promise<Tab[]>;
    function create(createProperties: { url: string }): Promise<Tab>;
  }
}
