import { useEffect, useState } from "react";

// Read ahead of the click, so opening the side panel needs no await inside it.
export function useWindowId(): number | undefined {
  const [windowId, setWindowId] = useState<number | undefined>(undefined);
  useEffect(() => {
    let current = true;
    void chrome.windows.getCurrent().then((window) => {
      if (current) setWindowId(window.id);
    });
    return () => { current = false; };
  }, []);
  return windowId;
}
