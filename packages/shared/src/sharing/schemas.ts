import { z } from "zod";
import { COLLECTION_GROUPS_MAX } from "../groups/constants";
import { RESOURCE_KINDS } from "../links/constants";
import {
  SHARE_ACCESS_MODES,
  SHARE_CODE_LENGTH,
  SHARE_EMAIL_MAX_LENGTH,
  SHARE_EMAILS_MAX,
  SHARE_TOKEN_LENGTH,
  SHARED_LINKS_MAX,
  VIEWER_SESSION_LENGTH,
} from "./constants";

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

// Addresses are compared ignoring case, so one person listed twice is one person.
export const shareEmailSchema = z
  .string()
  .trim()
  .max(SHARE_EMAIL_MAX_LENGTH, { error: "Enter a shorter email address" })
  .pipe(z.email({ error: "Enter a valid email address" }))
  .transform((email) => email.toLowerCase());

// Who may open the link: anyone holding it, or only the listed people. The list is kept while the mode is "link".
export const shareAccessSchema = z
  .strictObject({
    mode: z.enum(SHARE_ACCESS_MODES),
    emails: z
      .array(shareEmailSchema)
      .max(SHARE_EMAILS_MAX, { error: `List at most ${String(SHARE_EMAILS_MAX)} emails` })
      .transform((emails) => [...new Set(emails)]),
  })
  .refine((access) => access.mode === "link" || access.emails.length > 0, {
    path: ["emails"],
    error: "Add at least one email, or let anyone with the link in",
  });

export const viewerCodeRequestSchema = z.strictObject({ email: shareEmailSchema });

export const viewerCodeSchema = z.string().regex(new RegExp(`^\\d{${String(SHARE_CODE_LENGTH)}}$`));

export const viewerVerifyRequestSchema = z.strictObject({ email: shareEmailSchema, code: viewerCodeSchema });

export const viewerSessionSchema = z.strictObject({
  session: z
    .string()
    .length(VIEWER_SESSION_LENGTH)
    .regex(/^[A-Za-z0-9_-]+$/),
  expiresAt: z.iso.datetime(),
});
