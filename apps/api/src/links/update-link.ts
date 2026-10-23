import type { SavedLink, updateLinkRequestSchema } from "@linkables/shared/links";
import { and, eq } from "drizzle-orm";
import type { z } from "zod";
import type { Db } from "../db/client";
import { savedLink } from "../db/schema";
import { NotFoundError } from "../http/errors";
import { loadSavedLink } from "./to-saved-link";

export type UpdateLinkInput = { userId: string; linkId: string; changes: z.output<typeof updateLinkRequestSchema> };

export async function updateLink(db: Db, { userId, linkId, changes }: UpdateLinkInput): Promise<SavedLink> {
  const [link] = await db
    .update(savedLink)
    .set(changes)
    .where(and(eq(savedLink.id, linkId), eq(savedLink.userId, userId)))
    .returning({ id: savedLink.id });
  if (!link) throw new NotFoundError("Link not found");
  return loadSavedLink(db, userId, link.id);
}
