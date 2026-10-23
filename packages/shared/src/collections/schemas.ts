import { z } from "zod";
import { RESOURCE_KINDS } from "../links/constants";
import { COLLECTION_COVER_SIZE, COLLECTION_NAME_MAX_LENGTH } from "./constants";

const collectionName = z
  .string()
  .trim()
  .min(1, { error: "name must not be empty" })
  .max(COLLECTION_NAME_MAX_LENGTH, {
    error: `name must be at most ${String(COLLECTION_NAME_MAX_LENGTH)} characters`,
  });

export const collectionRequestSchema = z.object({ name: collectionName });

export const updateCollectionRequestSchema = z
  .strictObject({ name: collectionName.optional(), pinned: z.boolean().optional() })
  .refine((body) => Object.keys(body).length > 0, { error: "Send at least one of name or pinned" });

export const collectionSchema = z.strictObject({
  id: z.uuid(),
  name: z.string(),
  pinned: z.boolean(),
  createdAt: z.iso.datetime(),
  lastUsedAt: z.iso.datetime(),
});

// domain is the canonical URL's host as-is, so the web can draw a letter tile
// when there is no thumbnail.
export const coverTileSchema = z.strictObject({
  kind: z.enum(RESOURCE_KINDS).nullable(),
  thumbnailUrl: z.string().nullable(),
  domain: z.string(),
});

// cover is the newest filings first, at most COLLECTION_COVER_SIZE of them.
export const listedCollectionSchema = collectionSchema.extend({
  linkCount: z.number().int().nonnegative(),
  cover: z.array(coverTileSchema).max(COLLECTION_COVER_SIZE),
});

export const listCollectionsResponseSchema = z.strictObject({
  items: z.array(listedCollectionSchema),
});
