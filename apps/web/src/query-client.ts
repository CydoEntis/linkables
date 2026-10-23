import { ERROR_CODES } from "@linkables/shared/http";
import { QueryClient } from "@tanstack/react-query";
import { isApiError } from "./api/client";
import { supabase } from "./auth/supabase";

const MAX_RETRIES = 3;

export function shouldRetry(failures: number, error: Error): boolean {
  return failures < MAX_RETRIES && !isApiError(error, ERROR_CODES.UNAUTHENTICATED);
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: shouldRetry },
  },
});

// One user's cached data must never be shown to the next person who signs in.
supabase.auth.onAuthStateChange((event) => {
  if (event === "SIGNED_OUT") queryClient.clear();
});
