import { useEffect, useState } from "react";
import { CONNECTION_KEY, hasSession } from "./session";

export type SessionStatus = "loading" | "signed-in" | "signed-out" | "unavailable";

export function useSession(): SessionStatus {
  const [status, setStatus] = useState<SessionStatus>("loading");
  useEffect(() => {
    let current = true;
    function update() {
      void hasSession().then((signedIn) => {
        if (current) setStatus(signedIn ? "signed-in" : "signed-out");
      }, () => { if (current) setStatus("unavailable"); });
    }
    const onChange = (changes: Record<string, chrome.storage.StorageChange>, area: string) => {
      if (area === "local" && CONNECTION_KEY in changes) update();
    };
    update();
    chrome.storage.onChanged.addListener(onChange);
    return () => { current = false; chrome.storage.onChanged.removeListener(onChange); };
  }, []);
  return status;
}
