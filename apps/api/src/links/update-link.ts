import type { SavedLink, updateLinkRequestSchema } from "@linkables/shared/links";
import { and, eq } from "drizzle-orm";
import type { z } from "zod";
import type { Db } from "../db/client";
import { resource, savedLink } from "../db/schema";
import { InternalError, NotFoundError } from "../http/errors";
import { toSavedLink } from "./to-saved-link";

export type UpdateLinkInput = { userId: string; linkId: string; changes: z.output<typeof updateLinkRequestSchema> };

export async function updateLink(db: Db, { userId, linkId, changes }: UpdateLinkInput): Promise<SavedLink> {
  const [link] = await db
    .update(savedLink)
    .set(changes)
    .where(and(eq(savedLink.id, linkId), eq(savedLink.userId, userId)))
    .returning();
  if (!link) throw new NotFoundError("Link not found");
  const [res] = await db.select().from(resource).where(eq(resource.id, link.resourceId));
  if (!res) throw new InternalError("resource missing for saved link");
  return toSavedLink(link, res);
}
