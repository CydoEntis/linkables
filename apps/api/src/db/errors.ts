import { LibsqlError } from "@libsql/client";
import { DrizzleQueryError } from "drizzle-orm/errors";

export function isUniqueViolation(error: unknown): boolean {
  return error instanceof DrizzleQueryError && error.cause instanceof LibsqlError && error.cause.extendedCode === "SQLITE_CONSTRAINT_UNIQUE";
}
