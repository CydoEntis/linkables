import type { SavedLink } from "@linkables/shared/links";
import type { Db } from "../db/client";
import { NotFoundError } from "../http/errors";
import { findSavedLink } from "./to-saved-link";

export type GetLinkInput = { userId: string; linkId: string };

export async function getLink(db: Db, { userId, linkId }: GetLinkInput): Promise<SavedLink> {
  const link = await findSavedLink(db, userId, linkId);
  if (link === undefined) throw new NotFoundError("Link not found");
  return link;
}
