import { useEffect, useState } from "react";
import { AUTH_STORAGE_KEY } from "./create-supabase";
import { supabase } from "./supabase";

export type SessionStatus = "loading" | "signed-in" | "signed-out";

// supabase-js reports the stored session (refreshed if it had expired) as INITIAL_SESSION,
// then every sign-in, refresh and sign-out after it. A session the worker writes
// (from linkables.app or Google) only shows up as a change in storage.
export function useSession(): SessionStatus {
  const [status, setStatus] = useState<SessionStatus>("loading");
  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setStatus(session ? "signed-in" : "signed-out");
    });
    const onStorageChange = (changes: Record<string, chrome.storage.StorageChange>, areaName: string) => {
      if (areaName !== "local" || !(AUTH_STORAGE_KEY in changes)) return;
      void supabase.auth.getSession().then(({ data: { session } }) => {
        setStatus(session ? "signed-in" : "signed-out");
      });
    };
    chrome.storage.onChanged.addListener(onStorageChange);
    return () => {
      data.subscription.unsubscribe();
      chrome.storage.onChanged.removeListener(onStorageChange);
    };
  }, []);
  return status;
}
