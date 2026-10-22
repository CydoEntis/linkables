import { HTTP_STATUS } from "@linkaroo/shared/http";
import type { ErrorHandler, NotFoundHandler } from "hono";
import { HTTPException } from "hono/http-exception";
import type { Logger } from "../log/logger";
import { fail } from "./envelope";
import type { AppEnv } from "./env";
import {
  ApiError,
  InternalError,
  NotFoundError,
  RateLimitError,
  UnauthenticatedError,
  ValidationError,
} from "./errors";

function fromHttpException(exception: HTTPException): ApiError {
  switch (exception.status) {
    case HTTP_STATUS.BAD_REQUEST:
    case HTTP_STATUS.PAYLOAD_TOO_LARGE:
      return new ValidationError("Invalid request");
    case HTTP_STATUS.UNAUTHORIZED:
      return new UnauthenticatedError("Authentication required");
    case HTTP_STATUS.NOT_FOUND:
      return new NotFoundError("Not found");
    case HTTP_STATUS.TOO_MANY_REQUESTS:
      return new RateLimitError("Too many requests");
    default:
      return new InternalError("Internal server error");
  }
}

function toKnownError(err: Error): ApiError | undefined {
  if (err instanceof ApiError) return err;
  if (err instanceof HTTPException) return fromHttpException(err);
  return undefined;
}

export function onError(logger: Logger): ErrorHandler<AppEnv> {
  return (err, c) => {
    const known = toKnownError(err);
    if (known) return fail(c, known);
    logger.error("unexpected error", { requestId: c.get("requestId"), err });
    return fail(c, new InternalError("Internal server error"));
  };
}

export const notFound: NotFoundHandler<AppEnv> = (c) => fail(c, new NotFoundError("Not found"));
