import { isApiError } from "@linkables/shared/api-client";
import { ERROR_CODES } from "@linkables/shared/http";
import { readerViewSchema } from "@linkables/shared/reader";
import { useQuery } from "@tanstack/react-query";
import { api } from "../api/api";
import { shouldRetry } from "../query-client";

// The API keeps a readable copy for days, so one fetch per visit is plenty.
export function useReader(linkId: string) {
  return useQuery({
    queryKey: ["reader", linkId] as const,
    queryFn: ({ signal }) => api.request(`/links/${linkId}/reader`, readerViewSchema, { signal }),
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    retry: (failures, error) =>
      !isApiError(error, ERROR_CODES.NOT_FOUND) && !isApiError(error, ERROR_CODES.RATE_LIMIT) && shouldRetry(failures, error),
  });
}
