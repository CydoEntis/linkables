import { z } from "zod";
import { COLLECTION_GROUPS_MAX } from "../groups/constants";
import { RESOURCE_KINDS } from "../links/constants";
import { SHARE_TOKEN_LENGTH, SHARED_LINKS_MAX } from "./constants";

export const shareTokenSchema = z
  .string()
  .length(SHARE_TOKEN_LENGTH)
  .regex(/^[A-Za-z0-9_-]+$/);

export const shareGroupSchema = z.strictObject({ id: z.uuid(), name: z.string(), shared: z.boolean() });

// token is null while the collection's view-only link is off. ungrouped and groups
// are sent only for a collection that has groups, so a bundle from before groups
// existed still parses every other collection's state.
export const shareStateSchema = z.strictObject({
  token: shareTokenSchema.nullable(),
  ungrouped: z.boolean().optional(),
  groups: z.array(shareGroupSchema).optional(),
});

// Sets the whole scope: groups not listed become unshared.
export const shareScopeRequestSchema = z.strictObject({
  ungrouped: z.boolean(),
  groupIds: z
    .array(z.uuid())
    .max(COLLECTION_GROUPS_MAX)
    .refine((ids) => new Set(ids).size === ids.length, { error: "groupIds must not repeat" }),
});

// Display fields only: no ids, notes, pins or dates, nothing about the owner.
export const sharedLinkSchema = z.strictObject({
  url: z.string(),
  title: z.string().nullable(),
  description: z.string().nullable(),
  thumbnailUrl: z.string().nullable(),
  faviconUrl: z.string().nullable(),
  kind: z.enum(RESOURCE_KINDS).nullable(),
});

// A group the owner chose to show: its name and links, never an id or a flag.
export const sharedGroupSchema = z.strictObject({
  name: z.string(),
  linkCount: z.number().int().nonnegative(),
  links: z.array(sharedLinkSchema).max(SHARED_LINKS_MAX),
});

// links holds the newest filings first, at most SHARED_LINKS_MAX; linkCount counts them all.
// updatedAt is the UTC day the newest link was filed, null while the collection
// is empty. Optional so a bundle and an API from either side of a deploy agree.
// links is the ungrouped links the owner shares. groups is sent only when at least
// one group has a link to show, so a bundle that predates groups parses the rest.
export const sharedCollectionSchema = z.strictObject({
  name: z.string(),
  linkCount: z.number().int().nonnegative(),
  updatedAt: z.iso.datetime().nullable().optional(),
  links: z.array(sharedLinkSchema).max(SHARED_LINKS_MAX),
  groups: z.array(sharedGroupSchema).optional(),
});

// The signed-in owner's collections whose link is on, for Settings. Owner-only:
// it names collections by id, which the public view never does.
export const ownSharedCollectionSchema = z.strictObject({ id: z.uuid(), name: z.string(), token: shareTokenSchema });

export const ownSharedCollectionsResponseSchema = z.strictObject({ items: z.array(ownSharedCollectionSchema) });
