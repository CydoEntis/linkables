// The few extension APIs the pop-up, worker and content script use, typed here
// rather than pulling in all of @types/chrome.
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

    type StorageChange = { oldValue?: unknown; newValue?: unknown };
    type ChangeListener = (changes: Record<string, StorageChange>, areaName: string) => void;
    const onChanged: {
      addListener(callback: ChangeListener): void;
      removeListener(callback: ChangeListener): void;
    };
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
    function remove(tabId: number): Promise<void>;
  }

  namespace runtime {
    const id: string;
    interface MessageSender {
      id?: string;
      origin?: string;
      tab?: chrome.tabs.Tab;
    }
    function sendMessage(message: unknown): Promise<unknown>;
    // Returning true keeps sendResponse open for an answer sent later.
    type MessageListener = (message: unknown, sender: MessageSender, sendResponse: (response: unknown) => void) => boolean | undefined;
    const onMessage: { addListener(callback: MessageListener): void };
  }

  namespace identity {
    function getRedirectURL(): string;
    // Resolves with the URL the flow ended on; rejects when the user closes the window.
    function launchWebAuthFlow(details: { url: string; interactive: boolean }): Promise<string | undefined>;
  }
}
