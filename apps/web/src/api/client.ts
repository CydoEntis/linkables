import { ApiError, NETWORK_ERROR, parseData, readEnvelope } from "@linkables/shared/api-client";
import { API_V1_PREFIX, ERROR_CODES } from "@linkables/shared/http";
import type { z } from "zod";

export type ApiClientOptions = {
  baseUrl: string;
  getAccessToken: () => Promise<string | null>;
  // The token already held in memory, if it is still valid; see send().
  peekAccessToken?: () => string | null;
  onUnauthenticated: (token: string | null) => Promise<void>;
  isCurrentSession?: (token: string) => boolean;
  fetch?: typeof fetch;
};

export type ApiClient = ReturnType<typeof createApiClient>;

export function createApiClient(options: ApiClientOptions) {
  const doFetch = options.fetch ?? ((input, init) => fetch(input, init));
  const root = options.baseUrl.replace(/\/$/, "") + API_V1_PREFIX;

  async function send(path: string, init: RequestInit): Promise<{ response: Response; token: string | null }> {
    const headers = new Headers(init.headers);
    headers.set("Accept", "application/json");
    // A keepalive request is sent as the page goes away, which leaves no time to
    // await anything first: it uses the token already held when there is one.
    const held = init.keepalive === true ? (options.peekAccessToken?.() ?? null) : null;
    const token = held ?? (await options.getAccessToken());
    if (token) headers.set("Authorization", `Bearer ${token}`);
    try {
      return { response: await doFetch(root + path, { ...init, headers }), token };
    } catch (error) {
      // fetch rejects with a TypeError only when no response arrived (offline, DNS, CORS).
      if (error instanceof TypeError) {
        throw new ApiError(NETWORK_ERROR, "Could not reach the server", undefined, { cause: error });
      }
      throw error;
    }
  }

  async function request<T extends z.ZodType>(
    path: string,
    dataSchema: T,
    init: RequestInit = {},
  ): Promise<z.infer<T>> {
    const { response, token } = await send(path, init);
    const envelope = await readEnvelope(response);
    if (token !== null && options.isCurrentSession?.(token) === false) {
      throw new ApiError(ERROR_CODES.CONFLICT, "The account changed. Try again.");
    }
    if (envelope.ok) return parseData(dataSchema, envelope.data);
    if (envelope.error.code === ERROR_CODES.UNAUTHENTICATED) await options.onUnauthenticated(token);
    throw new ApiError(envelope.error.code, envelope.error.message, envelope.meta.requestId);
  }

  return { request };
}
