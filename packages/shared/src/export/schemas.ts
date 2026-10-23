import { z } from "zod";
import { collectionSchema } from "../collections/schemas";
import { EXPORT_FORMAT_VERSION } from "./constants";

// title is the fetched title, null until the metadata worker has one.
// collectionIds is the link's memberships, so the file needs no separate list.
export const exportedLinkSchema = z.strictObject({
  canonicalUrl: z.string(),
  originalUrl: z.string(),
  title: z.string().nullable(),
  titleOverride: z.string().nullable(),
  note: z.string().nullable(),
  pinned: z.boolean(),
  savedAt: z.iso.datetime(),
  collectionIds: z.array(z.uuid()),
});

export const exportResponseSchema = z.strictObject({
  version: z.literal(EXPORT_FORMAT_VERSION),
  exportedAt: z.iso.datetime(),
  links: z.array(exportedLinkSchema),
  collections: z.array(collectionSchema.pick({ id: true, name: true, createdAt: true })),
});
