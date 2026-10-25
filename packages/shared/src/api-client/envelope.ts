import { z } from "zod";
import { ERROR_CODES } from "../http/constants";
import { failureEnvelopeSchema, metaSchema } from "../http/schemas";
import type { ErrorCode } from "../http/types";

// How the web app and the extension read API responses.

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

// Looser than the shared schemas on purpose: deployed clients (the PWA keeps old
// bundles, the extension is installed by hand) must survive additive API changes,
// which the contract calls non-breaking.
const clientMetaSchema = z.looseObject(metaSchema.shape);
const anyEnvelopeSchema = z.discriminatedUnion("ok", [
  z.looseObject({ ok: z.literal(true), data: z.unknown(), meta: clientMetaSchema }),
  z.looseObject({
    ok: z.literal(false),
    error: z.looseObject({ ...failureEnvelopeSchema.shape.error.shape, code: z.string() }),
    meta: clientMetaSchema,
  }),
]);

function unexpectedResponse(cause: unknown): ApiError {
  return new ApiError(ERROR_CODES.INTERNAL, "Unexpected response from the server", undefined, { cause });
}

export function parseData<T extends z.ZodType>(schema: T, value: unknown): z.infer<T> {
  const parsed = schema.safeParse(value);
  if (parsed.success) return parsed.data;
  throw unexpectedResponse(parsed.error);
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch (error) {
    if (error instanceof SyntaxError) throw unexpectedResponse(error);
    throw error;
  }
}

export async function readEnvelope(response: Response) {
  return parseData(anyEnvelopeSchema, await readJson(response));
}
