import { useEffect, useState } from "react";
import { env } from "../config/env";

const pattern = (url: string) => `${new URL(url).origin}/*`;

// What manifest.ts lists as host_permissions. Chrome grants them at install; Firefox
// lets people switch them off, and every request to the API then fails.
export const HOST_ACCESS = { origins: [pattern(env.VITE_APP_URL), pattern(env.VITE_SUPABASE_URL)] };

// undefined while the browser is asked.
export function useHostAccess() {
  const [granted, setGranted] = useState<boolean | undefined>(undefined);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let current = true;
    function check() {
      void chrome.permissions.contains(HOST_ACCESS).then((has) => {
        if (current) setGranted(has);
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
    granted,
    failed,
    // Firefox asks only from inside the click, so call this from the handler itself.
    grant: () => {
      setFailed(false);
      chrome.permissions.request(HOST_ACCESS).then(
        (accepted) => {
          setFailed(!accepted);
        },
        () => {
          setFailed(true);
        },
      );
    },
  };
}
