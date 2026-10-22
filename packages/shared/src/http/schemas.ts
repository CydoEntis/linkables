import { z } from "zod";
import { API_VERSION, ERROR_CODES } from "./constants";

export const errorCodeSchema = z.enum(ERROR_CODES);

export const metaSchema = z.strictObject({
  requestId: z.uuid(),
  ms: z.int().nonnegative(),
  version: z.literal(API_VERSION),
});

export const failureEnvelopeSchema = z.strictObject({
  ok: z.literal(false),
  error: z.strictObject({
    code: errorCodeSchema,
    message: z.string(),
    details: z.record(z.string(), z.unknown()).optional(),
  }),
  meta: metaSchema,
});

export function successEnvelopeSchema<T extends z.ZodType>(data: T) {
  return z.strictObject({ ok: z.literal(true), data, meta: metaSchema });
}

export function envelopeSchema<T extends z.ZodType>(data: T) {
  return z.discriminatedUnion("ok", [successEnvelopeSchema(data), failureEnvelopeSchema]);
}
