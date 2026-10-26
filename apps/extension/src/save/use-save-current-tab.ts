import { useMutation } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { saveCurrentTab } from "./save-flow";
import { saveLink } from "./save-link";

// The pop-up opens on the user's click on the tab they want, so that window's active tab is the one to save.
async function readActiveTab(): Promise<chrome.tabs.Tab> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab ?? {};
}

// Saves once as the pop-up opens. The ref keeps StrictMode's second effect run from saving twice.
export function useSaveCurrentTab() {
  const save = useMutation({ mutationFn: () => saveCurrentTab({ readTab: readActiveTab, save: saveLink }) });
  const started = useRef(false);
  const { mutate } = save;
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    mutate();
  }, [mutate]);
  return save;
}
