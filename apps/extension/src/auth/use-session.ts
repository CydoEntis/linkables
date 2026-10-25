import { useEffect, useState } from "react";
import { supabase } from "./supabase";

export type SessionStatus = "loading" | "signed-in" | "signed-out";

// supabase-js reports the stored session (refreshed if it had expired) as INITIAL_SESSION,
// then every sign-in, refresh and sign-out after it.
export function useSession(): SessionStatus {
  const [status, setStatus] = useState<SessionStatus>("loading");
  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setStatus(session ? "signed-in" : "signed-out");
    });
    return () => { data.subscription.unsubscribe(); };
  }, []);
  return status;
}
