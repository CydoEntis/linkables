import { ERROR_CODES } from "@linkaroo/shared/http";
import { QueryClient } from "@tanstack/react-query";
import { ApiError } from "./api/client";
import { supabase } from "./auth/supabase";

const MAX_RETRIES = 3;

function isUnauthenticated(error: Error): boolean {
  return error instanceof ApiError && error.code === ERROR_CODES.UNAUTHENTICATED;
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: (failures, error) => failures < MAX_RETRIES && !isUnauthenticated(error) },
  },
});

// One user's cached data must never be shown to the next person who signs in.
supabase.auth.onAuthStateChange((event) => {
  if (event === "SIGNED_OUT") queryClient.clear();
});
