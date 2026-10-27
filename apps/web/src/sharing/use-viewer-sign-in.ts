import { isApiError } from "@linkables/shared/api-client";
import { ERROR_CODES } from "@linkables/shared/http";
import { viewerSessionSchema, type ViewerCodeRequest, type ViewerVerifyRequest } from "@linkables/shared/sharing";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { api } from "../api/api";
import { sharedKey } from "./use-share";
import { rememberViewerSession } from "./viewer-session";

function post(token: string, step: "code" | "verify", body: ViewerCodeRequest | ViewerVerifyRequest) {
  return {
    path: `/shared/${encodeURIComponent(token)}/${step}`,
    init: { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) },
  };
}

// The API answers the same whether or not the address is on the list.
export function useRequestViewerCode(token: string) {
  return useMutation({
    mutationFn: (request: ViewerCodeRequest) => {
      const { path, init } = post(token, "code", request);
      return api.request(path, z.null(), init);
    },
  });
}

export function useVerifyViewerCode(token: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (request: ViewerVerifyRequest) => {
      const { path, init } = post(token, "verify", request);
      return api.request(path, viewerSessionSchema, init);
    },
    onSuccess: async (session) => {
      rememberViewerSession(token, session);
      await queryClient.invalidateQueries({ queryKey: sharedKey(token) });
    },
  });
}

export function viewerProblem(error: unknown): string {
  if (isApiError(error, ERROR_CODES.RATE_LIMIT)) return "Too many tries. Wait a few minutes and try again.";
  if (isApiError(error, ERROR_CODES.FORBIDDEN)) return "That code didn't work. Ask for a new one.";
  return "Something went wrong. Check your connection and try again.";
}
