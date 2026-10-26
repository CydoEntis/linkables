import { useEffect, useState } from "react";

export type CurrentTab = { id: number | undefined; url: string | undefined; title: string | undefined };

function sameTab(a: CurrentTab | undefined, b: CurrentTab): boolean {
  return a !== undefined && a.id === b.id && a.url === b.url && a.title === b.title;
}

// Without the optional tabs permission (Follow the tab you're on) Chrome shows a
// tab's address only once the user has used linkables on it (activeTab) or it is
// on a host linkables may read. The panel re-reads its window's active tab whenever
// that may have changed: on a tab switch, any tab update (with tabs, that includes
// a single-page site changing its address), when the window or panel gains focus,
// after the shortcut, and when the permission is granted or removed.
export function useCurrentTab(): CurrentTab | undefined {
  const [tab, setTab] = useState<CurrentTab | undefined>(undefined);

  useEffect(() => {
    let latest = 0;
    function read() {
      latest += 1;
      const call = latest;
      void chrome.tabs.query({ active: true, currentWindow: true }).then(([active]) => {
        if (call !== latest) return;
        const next = { id: active?.id, url: active?.url, title: active?.title };
        setTab((current) => (sameTab(current, next) ? current : next));
      });
    }

    read();
    chrome.tabs.onActivated.addListener(read);
    chrome.tabs.onUpdated.addListener(read);
    chrome.windows.onFocusChanged.addListener(read);
    chrome.commands.onCommand.addListener(read);
    chrome.permissions.onAdded.addListener(read);
    chrome.permissions.onRemoved.addListener(read);
    window.addEventListener("focus", read);
    return () => {
      latest += 1;
      chrome.tabs.onActivated.removeListener(read);
      chrome.tabs.onUpdated.removeListener(read);
      chrome.windows.onFocusChanged.removeListener(read);
      chrome.commands.onCommand.removeListener(read);
      chrome.permissions.onAdded.removeListener(read);
      chrome.permissions.onRemoved.removeListener(read);
      window.removeEventListener("focus", read);
    };
  }, []);

  return tab;
}
