import { useEffect, useState } from "react";

const TABS = { permissions: ["tabs"] };

// "Follow the tab you're on" is the optional tabs permission: with it the panel can
// read whichever tab is active; without it, only tabs linkables was used on.
// undefined while Chrome is asked.
export function useFollowTabs() {
  const [on, setOn] = useState<boolean | undefined>(undefined);

  useEffect(() => {
    let current = true;
    function check() {
      void chrome.permissions.contains(TABS).then((granted) => {
        if (current) setOn(granted);
      });
    }
    check();
    chrome.permissions.onAdded.addListener(check);
    chrome.permissions.onRemoved.addListener(check);
    return () => {
      current = false;
      chrome.permissions.onAdded.removeListener(check);
      chrome.permissions.onRemoved.removeListener(check);
    };
  }, []);

  return {
    on,
    // Chrome asks only from inside the click, so call these from the handler itself.
    turnOn: () => void chrome.permissions.request(TABS),
    turnOff: () => void chrome.permissions.remove(TABS),
  };
}
