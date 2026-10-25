import { QueryClient } from "@tanstack/react-query";
import { supabase } from "./auth/supabase";

// The pop-up lives for seconds; a failed read shows its error and a retry instead of waiting out backoff.
export const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

// One user's collections must never show to the next person who signs in.
supabase.auth.onAuthStateChange((event) => {
  if (event === "SIGNED_OUT") queryClient.clear();
});
