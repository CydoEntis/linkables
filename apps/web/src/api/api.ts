import { peekAccessToken, readAccessToken } from "../auth/access-token";
import { currentSession, forgetSession } from "../auth/session";
import { env } from "../config/env";
import { createApiClient } from "./client";

export const api = createApiClient({
  baseUrl: env.VITE_API_URL,
  getAccessToken: readAccessToken,
  peekAccessToken: () => peekAccessToken(),
  onUnauthenticated: forgetSession,
  isCurrentSession: (token) => currentSession()?.token === token,
});
