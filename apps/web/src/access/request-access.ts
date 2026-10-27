import { ACCESS_INVALID_EMAIL, type AccessRequest } from "@linkables/shared/access";
import { ApiError, NETWORK_ERROR } from "@linkables/shared/api-client";
import { ERROR_CODES } from "@linkables/shared/http";
import { z } from "zod";
import { api } from "../api/api";

export function sendAccessRequest(request: AccessRequest): Promise<null> {
  return api.request("/access-requests", z.null(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });
}

export type RequestProblem = { field: "email" | null; message: string };

// The form checks the same schema first, so a VALIDATION answer can only be an
// address the API's email check refused.
export function requestProblem(error: Error): RequestProblem {
  switch (error instanceof ApiError ? error.code : undefined) {
    case ERROR_CODES.VALIDATION:
      return { field: "email", message: ACCESS_INVALID_EMAIL };
    case ERROR_CODES.RATE_LIMIT:
      return { field: null, message: "Requests are paused for a bit. Try again later." };
    case NETWORK_ERROR:
      return { field: null, message: "You're offline. Check your connection and try again." };
    default:
      return { field: null, message: "Something went wrong on our side. Try again in a moment." };
  }
}
