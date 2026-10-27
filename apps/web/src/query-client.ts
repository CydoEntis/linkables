import { ERROR_CODES } from "@linkables/shared/http";
import { QueryClient } from "@tanstack/react-query";
import { isApiError } from "@linkables/shared/api-client";
import { subscribeSession } from "./auth/session";

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
subscribeSession(() => { queryClient.clear(); });
