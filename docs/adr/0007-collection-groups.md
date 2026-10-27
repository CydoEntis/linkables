# ADR-0007: Groups inside a collection

**Status:** accepted (2026-10-26)

## Problem

Long collections need sections. Recursive nested collections are Phase 6+, and a
section is much less than that: one level of named headings, with the option to
share only some of them.

## Decision

A **group** is a named heading inside one collection. A link in a collection is in
one group or ungrouped.

- Table `collection_group`: `id`, `collection_id` (FK, cascade), `name`,
  `position` (dense 0-based ints; a reorder rewrites them), `shared` (default
  true), `created_at`. Unique `(collection_id, lower(name))`, and unique
  `(collection_id, id)` so the filing can reference it.
- `collection_item.group_id`, nullable. Placement is on the filing, not the link,
  so the same link can be in group A of one collection and ungrouped in another.
  A composite FK `(collection_id, group_id)` to the group means a link can only
  sit in a group of its own collection; the database refuses anything else.
- Deleting a group makes its links ungrouped: `ON DELETE SET NULL ("group_id")`,
  a column list that needs Postgres 15 or later. Local, CI and Supabase all run
  Postgres 17, so the database does it and the handler needs no
  null-first step. The column list matters: a plain `SET NULL` would also try to
  null `collection_id`, which is part of the primary key.
- Names are trimmed, 1 to 60 characters, unique per collection ignoring case
  (`CONFLICT`). At most 20 groups per collection (`CONFLICT`); creates take a row
  lock on the collection so racing requests cannot pass the limit.
- A group created in a collection that is already shared starts shared (the
  `shared` default). Owner decision, 2026-10-26.
- Adding a link already in the collection keeps its group; adding it fresh puts it
  ungrouped.

API (relative to `/api/v1`, all JWT, scoped to the caller; another user's
collection or group is `NOT_FOUND`):

- `GET|POST /collections/:id/groups`, `PATCH|DELETE /collections/:id/groups/:groupId`,
  `PUT /collections/:id/groups/order` (exactly the collection's groups, else
  `VALIDATION`).
- `PATCH /collections/:id/links/:linkId` `{ groupId: uuid | null }` moves a link.
- `GET /links?collectionId=X&groupId=<uuid>|none` so each section pages on its
  own. Saved links gain an optional `groupId` only when the request carries the
  `groupId` filter, never on a plain `collectionId` list: web bundles already
  cached in browsers parse list items with a strict schema and would reject the
  extra key.

The migration only adds a table and a nullable column, so the previous image
keeps working against the new schema (add before you use).

## Sharing by group

Migration 0008 adds `collection.share_ungrouped boolean not null default true`
(additive, so the previous image keeps working). With the groups' `shared` flag
it decides what a share link shows. Everything starts shared, so existing links
change nothing, and a group created later starts shared.

- `GET /collections/:id/share` (and the POST and DELETE, which return the same
  state) add `ungrouped` and `groups: [{ id, name, shared }]` in position order.
  `PUT /collections/:id/share/scope` `{ ungrouped, groupIds }` sets the whole scope
  in one transaction: listed groups become shared, the rest of that collection's
  groups do not, so it is idempotent. A group id from another collection is
  NOT_FOUND. It works while the link is off, and turning the link off and on keeps
  the scope.
- The public `GET /shared/:token` keeps `links` (now the shared ungrouped links, so
  an old web bundle still renders them) and adds `groups: [{ name, linkCount,
  links }]` in position order, with no group ids, flags or omitted group names, and
  empty groups left out. `linkCount` counts only what the viewer can see, and
  `SHARED_LINKS_MAX` caps the total across both (ungrouped first, then groups in
  order). Filtering is in the query, on the filing's `group_id` joined inside that
  one collection, so a link that is also in an unshared group of another
  collection is unaffected.
- Old bundles parse the response and the owner's share state with strict Zod
  objects, so a new key would break a cached page (the lesson of PR #76). Both
  new keys are therefore sent only when there is something in them: the public
  `groups` only when a shared group has links, the owner's `ungrouped` and
  `groups` only for a collection that has groups. A collection with no groups gets
  byte-for-byte today's responses. A cached owner bundle still fails on a
  collection that has groups, but it has no groups UI to reach one with.
- The public-route reasoning in AGENTS.md changes by one fact: it also reads the
  names of the groups the owner chose to show.

## Rollback caveat

Rolling the image back is safe while every group is shared. Once any group is
unshared, do not roll back below the release that added sharing by group: the old
public page ignores `shared` and `share_ungrouped` and would show the omitted
links. Only the scope route writes those flags, so an image from before it shows
every link, as it always did, while nothing has been unshared.

## Consequences

- Sidebar counts are unaffected: a collection's `linkCount` stays the total.
- Links inside a group keep the page's sort order; there is no manual link order.
- The extension ignores groups; the change is additive.
