import { ApiError, NETWORK_ERROR, parseData, readEnvelope } from "@linkables/shared/api-client";
import { API_V1_PREFIX, ERROR_CODES } from "@linkables/shared/http";
import type { z } from "zod";

// No token to send. On the pop-up and panel that means supabase-js could not
// refresh the session (Supabase unreachable or failing); in the worker, which never
// refreshes, that the stored token has run out. Either way the stored session may
// still be good, so this is never treated as signed out.
export const NO_SESSION = "NO_SESSION";

type ApiClientOptions = {
  baseUrl: string;
  getAccessToken: () => Promise<string | null>;
  onUnauthenticated: () => Promise<void>;
  fetch?: typeof fetch;
};

type RequestOptions = { method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE"; json?: unknown };

export type ApiClient = ReturnType<typeof createApiClient>;

// The web client's envelope rules (packages/shared/src/api-client), without its keepalive path.
export function createApiClient(options: ApiClientOptions) {
  const doFetch = options.fetch ?? ((input, init) => fetch(input, init));
  const root = options.baseUrl.replace(/\/+$/, "") + API_V1_PREFIX;

  async function send(path: string, token: string, { method = "GET", json }: RequestOptions): Promise<Response> {
    const headers = new Headers({ Accept: "application/json", Authorization: `Bearer ${token}` });
    if (json !== undefined) headers.set("Content-Type", "application/json");
    const body = json === undefined ? null : JSON.stringify(json);
    try {
      return await doFetch(root + path, { method, headers, body });
    } catch (error) {
      // fetch rejects with a TypeError only when no response arrived.
      if (error instanceof TypeError) throw new ApiError(NETWORK_ERROR, "Could not reach linkables", undefined, { cause: error });
      throw error;
    }
  }

  // Signs out only when the API rejects a token that was sent; a missing token fails here,
  // so a refresh that failed for a moment never throws a good session away.
  async function request<T extends z.ZodType>(path: string, dataSchema: T, init: RequestOptions = {}): Promise<z.infer<T>> {
    const token = await options.getAccessToken();
    if (!token) throw new ApiError(NO_SESSION, "No session to send");
    const envelope = await readEnvelope(await send(path, token, init));
    if (envelope.ok) return parseData(dataSchema, envelope.data);
    if (envelope.error.code === ERROR_CODES.UNAUTHENTICATED) await options.onUnauthenticated();
    throw new ApiError(envelope.error.code, envelope.error.message, envelope.meta.requestId);
  }

  return { request };
}
