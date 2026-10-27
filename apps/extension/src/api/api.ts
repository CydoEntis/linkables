import type { z } from "zod";
import { ApiError } from "@linkables/shared/api-client";
import { forgetSession, readConnection } from "../auth/session";
import { createApiClient, NO_SESSION } from "./client";

type RequestOptions = { method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE"; json?: unknown };

// Capture origin and token together for each request, including in background workers.
export const api = {
  async request<T extends z.ZodType>(path: string, schema: T, options?: RequestOptions): Promise<z.infer<T>> {
    const connection = await readConnection();
    if (!connection?.session) throw new ApiError(NO_SESSION, "Sign in to your Linkables server");
    const client = createApiClient({
      baseUrl: connection.origin,
      getAccessToken: () => Promise.resolve(connection.session?.token ?? null),
      onUnauthenticated: () => forgetSession(connection.origin, connection.session?.token),
    });
    return client.request(path, schema, options);
  },
};
