import { z } from "zod";
import { RESOURCE_KINDS } from "../links/constants";
import { SHARE_TOKEN_LENGTH, SHARED_LINKS_MAX } from "./constants";

export const shareTokenSchema = z
  .string()
  .length(SHARE_TOKEN_LENGTH)
  .regex(/^[A-Za-z0-9_-]+$/);

// token is null while the collection's view-only link is off.
export const shareStateSchema = z.strictObject({ token: shareTokenSchema.nullable() });

// Display fields only: no ids, notes, pins or dates, nothing about the owner.
export const sharedLinkSchema = z.strictObject({
  url: z.string(),
  title: z.string().nullable(),
  description: z.string().nullable(),
  thumbnailUrl: z.string().nullable(),
  faviconUrl: z.string().nullable(),
  kind: z.enum(RESOURCE_KINDS).nullable(),
});

// links holds the newest filings first, at most SHARED_LINKS_MAX; linkCount counts them all.
export const sharedCollectionSchema = z.strictObject({
  name: z.string(),
  linkCount: z.number().int().nonnegative(),
  links: z.array(sharedLinkSchema).max(SHARED_LINKS_MAX),
});

// The signed-in owner's collections whose link is on, for Settings. Owner-only:
// it names collections by id, which the public view never does.
export const ownSharedCollectionSchema = z.strictObject({ id: z.uuid(), name: z.string(), token: shareTokenSchema });

export const ownSharedCollectionsResponseSchema = z.strictObject({ items: z.array(ownSharedCollectionSchema) });
