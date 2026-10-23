import { ERROR_CODES, HTTP_STATUS, type ErrorCode } from "@linkables/shared/http";
import type { ContentfulStatusCode } from "hono/utils/http-status";

type Details = Record<string, unknown>;

export abstract class ApiError extends Error {
  abstract readonly code: ErrorCode;
  abstract readonly status: ContentfulStatusCode;

  constructor(
    message: string,
    readonly details?: Details,
  ) {
    super(message);
    this.name = new.target.name;
  }
}

export class ValidationError extends ApiError {
  readonly code = ERROR_CODES.VALIDATION;
  readonly status = HTTP_STATUS.BAD_REQUEST;
}

export class UnauthenticatedError extends ApiError {
  readonly code = ERROR_CODES.UNAUTHENTICATED;
  readonly status = HTTP_STATUS.UNAUTHORIZED;
}

export class ForbiddenError extends ApiError {
  readonly code = ERROR_CODES.FORBIDDEN;
  readonly status = HTTP_STATUS.FORBIDDEN;
}

export class NotFoundError extends ApiError {
  readonly code = ERROR_CODES.NOT_FOUND;
  readonly status = HTTP_STATUS.NOT_FOUND;
}

export class ConflictError extends ApiError {
  readonly code = ERROR_CODES.CONFLICT;
  readonly status = HTTP_STATUS.CONFLICT;
}

export class RateLimitError extends ApiError {
  readonly code = ERROR_CODES.RATE_LIMIT;
  readonly status = HTTP_STATUS.TOO_MANY_REQUESTS;
}

export class UpstreamError extends ApiError {
  readonly code = ERROR_CODES.UPSTREAM;
  readonly status = HTTP_STATUS.BAD_GATEWAY;
}

export class InternalError extends ApiError {
  readonly code = ERROR_CODES.INTERNAL;
  readonly status = HTTP_STATUS.INTERNAL_SERVER_ERROR;
}
