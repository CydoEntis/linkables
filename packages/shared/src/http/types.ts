import type { z } from "zod";
import type { errorCodeSchema, failureEnvelopeSchema, metaSchema } from "./schemas";

export type ErrorCode = z.infer<typeof errorCodeSchema>;
export type Meta = z.infer<typeof metaSchema>;
export type ApiFailure = z.infer<typeof failureEnvelopeSchema>;
export type ApiSuccess<T> = { ok: true; data: T; meta: Meta };
export type ApiResponse<T> = ApiSuccess<T> | ApiFailure;
