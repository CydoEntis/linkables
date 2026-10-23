import {
  API_V1_PREFIX,
  ERROR_CODES,
  failureEnvelopeSchema,
  metaSchema,
  type ErrorCode,
} from "@linkables/shared/http";
import { z } from "zod";

export const NETWORK_ERROR = "NETWORK_ERROR";
// "string & {}" keeps codes added to the API after this bundle shipped while known codes still narrow.
export type ApiErrorCode = ErrorCode | typeof NETWORK_ERROR | (string & {});

export class ApiError extends Error {
  override readonly name = "ApiError";

  constructor(
    readonly code: ApiErrorCode,
    message: string,
    readonly requestId?: string,
    options?: ErrorOptions,
  ) {
    super(message, options);
  }
}

export function isApiError(error: unknown, code: ApiErrorCode): error is ApiError {
  return error instanceof ApiError && error.code === code;
}

export type ApiClientOptions = {
  baseUrl: string;
  getAccessToken: () => Promise<string | null>;
  onUnauthenticated: () => Promise<void>;
  fetch?: typeof fetch;
};

export type ApiClient = ReturnType<typeof createApiClient>;

export function createApiClient(options: ApiClientOptions) {
  const doFetch = options.fetch ?? ((input, init) => fetch(input, init));
  const root = options.baseUrl.replace(/\/$/, "") + API_V1_PREFIX;

  async function send(path: string, init: RequestInit): Promise<Response> {
    const headers = new Headers(init.headers);
    headers.set("Accept", "application/json");
    const token = await options.getAccessToken();
    if (token) headers.set("Authorization", `Bearer ${token}`);
    try {
      return await doFetch(root + path, { ...init, headers });
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
    const envelope = await parseEnvelope(await send(path, init));
    if (envelope.ok) return parseOrThrow(dataSchema, envelope.data);
    if (envelope.error.code === ERROR_CODES.UNAUTHENTICATED) await options.onUnauthenticated();
    throw new ApiError(envelope.error.code, envelope.error.message, envelope.meta.requestId);
  }

  return { request };
}

// Looser than the shared schemas on purpose: deployed bundles (the PWA keeps old
// ones) must survive additive API changes, which the contract calls non-breaking.
const clientMetaSchema = z.looseObject(metaSchema.shape);
const anyEnvelopeSchema = z.discriminatedUnion("ok", [
  z.looseObject({ ok: z.literal(true), data: z.unknown(), meta: clientMetaSchema }),
  z.looseObject({
    ok: z.literal(false),
    error: z.looseObject({ ...failureEnvelopeSchema.shape.error.shape, code: z.string() }),
    meta: clientMetaSchema,
  }),
]);

async function parseEnvelope(response: Response) {
  return parseOrThrow(anyEnvelopeSchema, await readJson(response));
}

function parseOrThrow<T extends z.ZodType>(schema: T, value: unknown): z.infer<T> {
  const parsed = schema.safeParse(value);
  if (parsed.success) return parsed.data;
  throw unexpectedResponse(parsed.error);
}

function unexpectedResponse(cause: unknown): ApiError {
  return new ApiError(ERROR_CODES.INTERNAL, "Unexpected response from the server", undefined, { cause });
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch (error) {
    if (error instanceof SyntaxError) throw unexpectedResponse(error);
    throw error;
  }
}
