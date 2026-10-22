# ADR-0004: Shared resource, per-user saved link; Inbox is derived

**Status:** accepted (2026-10-21)

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

- `resource` (global): `canonical_url` unique, title, description, favicon,
  thumbnail URL, content type, `fetch_status`, `fetch_error`.
- `saved_link` (per user): `user_id`, `resource_id`, `title_override`, `note`,
  `pinned`, `saved_at`; unique (`user_id`, `resource_id`).
- `collection`: `user_id`, `name`.
- `collection_item`: (`collection_id`, `saved_link_id`) as the primary key.
- `job`: the metadata fetch queue (ADR-0003).
- **Inbox** is a user's saved links that belong to no collection. It is derived;
  there is no Inbox row.
- Edits go only to `saved_link`. Search runs over
  `coalesce(title_override, resource.title)`.

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
