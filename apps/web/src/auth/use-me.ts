import { meSchema } from "@linkaroo/shared/auth";
import { useQuery } from "@tanstack/react-query";
import { api } from "../api/api";

export function useMe() {
  return useQuery({ queryKey: ["me"], queryFn: () => api.request("/me", meSchema) });
}
