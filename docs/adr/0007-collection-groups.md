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
  own. Saved links gain an optional `groupId` only in a list scoped to one
  collection.

The migration only adds a table and a nullable column, so the previous image
keeps working against the new schema (add before you use).

## Next step: sharing by group

Not built yet. The design, so the data model above is not changed again:

- `collection.share_ungrouped` (default true) and the groups' `shared` flag decide
  what a share link shows. Everything is shared by default, so existing links
  change nothing.
- `GET /collections/:id/share` also returns the scope; `PUT
  /collections/:id/share/scope` `{ ungrouped, groupIds }` sets it in one
  transaction. Turning the link off and on keeps the scope.
- The public `GET /shared/:token` keeps `links` (the ungrouped shared links, so an
  old web bundle still renders) and adds `groups: [{ name, linkCount, links }]` in
  position order, with no group ids, flags or omitted group names, and empty
  groups left out. Filtering is in the query on `collection_item.group_id`, in
  that one collection only. The public-route reasoning in AGENTS.md changes by one
  fact: it also reads the names of the groups the owner chose to show.

## Rollback caveat

Rolling the image back is safe while every group is shared. Once any group is
unshared (when sharing by group ships), do not roll back below that release: the
old public page ignores `shared` and would show the omitted links. Until then the
flag is never written to false, so rolling back to the image before this
migration shows every link, as before.

## Consequences

- Sidebar counts are unaffected: a collection's `linkCount` stays the total.
- Links inside a group keep the page's sort order; there is no manual link order.
- The extension ignores groups; the change is additive.
