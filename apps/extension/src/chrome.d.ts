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

// The side panel and its shortcut.
declare namespace chrome {
  namespace tabs {
    interface Tab {
      windowId?: number;
    }
    // Fire without the tabs permission; only the url and title are withheld.
    const onActivated: events.Event<(activeInfo: { tabId: number; windowId: number }) => void>;
    const onUpdated: events.Event<(tabId: number, changeInfo: { status?: string }) => void>;
  }

  namespace events {
    interface Event<T extends (...args: never[]) => void> {
      addListener(callback: T): void;
      removeListener(callback: T): void;
    }
  }

  namespace windows {
    function getCurrent(): Promise<{ id?: number }>;
    const onFocusChanged: events.Event<(windowId: number) => void>;
  }

  // Undefined where the browser has no side panel (before Chrome 116, Firefox).
  const sidePanel: { open(options: { windowId: number }): Promise<void> } | undefined;

  namespace commands {
    interface Command {
      name?: string;
      shortcut?: string;
    }
    function getAll(): Promise<Command[]>;
    const onCommand: events.Event<(command: string, tab?: tabs.Tab) => void>;
  }
}

// The right-click "Save link to linkables".
declare namespace chrome {
  namespace contextMenus {
    interface OnClickData {
      menuItemId: string | number;
      linkUrl?: string;
    }
    function create(properties: { id: string; title: string; contexts: "link"[] }): void;
    const onClicked: events.Event<(info: OnClickData, tab?: tabs.Tab) => void>;
  }

  namespace runtime {
    const onInstalled: events.Event<() => void>;
  }
}

// The optional tabs permission behind "Follow the tab you're on".
declare namespace chrome {
  namespace permissions {
    interface Permissions {
      permissions?: string[];
    }
    function contains(permissions: Permissions): Promise<boolean>;
    function request(permissions: Permissions): Promise<boolean>;
    function remove(permissions: Permissions): Promise<boolean>;
    const onAdded: events.Event<(permissions: Permissions) => void>;
    const onRemoved: events.Event<(permissions: Permissions) => void>;
  }
}

// The toolbar button's saved mark.
declare namespace chrome {
  namespace action {
    function setBadgeText(details: { tabId: number; text: string }): Promise<void>;
    function getBadgeText(details: { tabId: number }): Promise<string>;
    function setBadgeBackgroundColor(details: { tabId: number; color: string }): Promise<void>;
    function setBadgeTextColor(details: { tabId: number; color: string }): Promise<void>;
  }
}
