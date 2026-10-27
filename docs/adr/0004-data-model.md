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
  (default false), `saved_at`, `saved_from` (nullable; the platform the link was
  first saved from, one of the shared `LINK_SOURCES`); unique (`user_id`,
  `resource_id`). `saved_from` is plain text checked by the request schema, not a
  Postgres enum, so a new platform needs no migration. Only the insert sets it,
  so saving the link again keeps the original.
- `collection`: `id`, `user_id`, `name` (stored as typed, trimmed), `pinned`
  (default false), `created_at`, `last_used_at`; unique (`user_id`,
  `lower(name)`), so names that differ only in case are the same name for one
  user (owner decision, 2026-10-22). `lower()` folds case by the database's
  character type, so this needs a UTF-8 locale (local, CI and Supabase all use
  en_US.UTF-8); a `C` locale would fold only ASCII. `last_used_at` starts at
  creation and moves to now, in the same transaction, whenever a link is filed
  into or out of the collection; a request that changes no filing leaves it.
  Collections list by `pinned` desc, `last_used_at` desc, `id`.
  `share_token` (nullable, unique) is the collection's view-only link: 24 random
  bytes as base64url, null while the link is off. Turning it off clears it, so
  turning it on again issues a new one. `share_private` (default false) limits
  the link to the addresses in `share_allowed_email`; see ADR-0008 for it and for
  `share_code` and `share_viewer_session`.
- `collection_item`: (`collection_id`, `saved_link_id`) as the primary key, both
  foreign keys `on delete cascade`; `created_at` is the filing time, which orders
  a collection's cover (newest filings first). Rows filed before it existed took
  their link's `saved_at`.
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
