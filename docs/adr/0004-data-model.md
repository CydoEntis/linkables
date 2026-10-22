# ADR-0004: Shared resource, per-user saved link; Inbox is derived

**Status:** accepted (2026-10-21; columns pinned down 2026-10-21 after the second Opus 5.5 audit, before any code)

## Problem

Two users can save the same URL. Metadata (title, thumbnail) is a fact about the
URL, while notes, pins and title edits belong to one user. If they share a row, one
user's edit changes another's view.

## Options

1. **One row per user per URL, with metadata copied.** Simple, but the same page is
   fetched once per user and no shared record exists for later sharing.
2. **One shared resource row, with user edits on it.** Rejected: user A's title edit
   would change user B's view.
3. **Shared `resource` + per-user `saved_link` (chosen).**

## Decision

Option 3.

- `resource` (global): `id`, `canonical_url` (the normalised dedupe key from
  P1-04, unique), `final_url`, `rel_canonical_url`, `title`, `description`,
  `author`, `favicon_url`, `thumbnail_url`, `content_type` (MIME), `kind`
  (`video | page | other`), `fetch_status` (`pending | fetched | fetch_failed`),
  `fetch_error`, `fetched_at`, `created_at`.
- `saved_link` (per user): `id`, `user_id` (uuid, the token's `sub`),
  `resource_id`, `original_url` (as submitted; may hold user-specific query
  parameters, so it never goes on `resource`), `title_override`, `note`, `pinned`
  (default false), `saved_at`; unique (`user_id`, `resource_id`).
- `collection`: `id`, `user_id`, `name`, `created_at`; unique (`user_id`, `name`).
- `collection_item`: (`collection_id`, `saved_link_id`) as the primary key, both
  foreign keys `on delete cascade`.
- `job`: `id` bigserial, `resource_id` (`on delete cascade`), `run_after`,
  `locked_until`, `attempts`, `last_error`, `created_at` (the metadata fetch queue,
  ADR-0003).
- **Inbox** is a user's saved links that belong to no collection. It is derived;
  there is no Inbox row.
- Edits and deletes go only to `saved_link`; a user never changes or deletes a
  `resource`. Search runs over `coalesce(title_override, resource.title)`.

## Reasoning

- A shared resource means one fetch per URL, and later sharing can point several
  users at the same resource without copying.
- Per-user state on `saved_link` keeps edits, notes and pins private by construction.

## Tradeoffs

- Every list query joins `saved_link` to `resource`.
- A resource is shared across users, so its metadata must never contain anything
  specific to the user who saved it first.

## Revisit when

- Phase 3 sharing needs per-collection notes or per-member state beyond this model.
