import type { Db } from "../db/client";
import { accessRequest } from "../db/schema";
import { InternalError } from "../http/errors";
import type { Logger } from "../log/logger";

export type NewAccessRequest = {
  email: string;
  name: string | undefined;
  useCase: string | undefined;
  userAgent: string | undefined;
};

function pgCode(error: unknown): unknown {
  return error instanceof Error ? (error.cause as { code?: unknown } | undefined)?.code : undefined;
}

// Returns whether this is the first request from the address. A repeat changes
// nothing, so the first answers are kept.
export async function recordAccessRequest(db: Db, logger: Logger, request: NewAccessRequest): Promise<boolean> {
  try {
    const created = await db.insert(accessRequest).values(request).onConflictDoNothing().returning({ id: accessRequest.id });
    return created.length > 0;
  } catch (error) {
    // Drizzle's message lists the query's params, so logging it would log the email.
    logger.error("access request insert failed", { code: pgCode(error) });
    throw new InternalError("Internal server error");
  }
}
