import { useMutation } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { markSaved } from "../badge/saved-badge";
import { saveCurrentTab } from "./save-flow";
import { saveLink } from "./save-link";

// The pop-up opens on the user's click on the tab they want, so that window's active tab is the one to save.
async function readActiveTab(): Promise<chrome.tabs.Tab> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab ?? {};
}

async function saveAndMark() {
  const tab = await readActiveTab();
  const outcome = await saveCurrentTab({ readTab: () => Promise.resolve(tab), save: saveLink });
  if (outcome.status === "saved" && tab.id !== undefined) await markSaved(tab.id, true);
  return outcome;
}

// Saves once as the pop-up opens. The ref keeps StrictMode's second effect run from saving twice.
export function useSaveCurrentTab() {
  const save = useMutation({ mutationFn: saveAndMark });
  const started = useRef(false);
  const { mutate } = save;
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    mutate();
  }, [mutate]);
  return save;
}
