# ADR-0002: Supabase for Postgres and Auth; no object storage in the MVP

**Status:** proposed (accept with the plan)

## Problem

The app needs Postgres, sign-in that works from the web app, the extension and
the PWA, and somewhere to keep thumbnails. The owner is a solo developer, so
operational load matters more than vendor independence.

## Options

1. **Supabase: Postgres + Auth (chosen).** Managed Postgres, managed email and
   OAuth sign-in, token refresh, and row-level security if needed later.
2. **Self-hosted Postgres + managed auth (Clerk or similar).** Keeps auth portable,
   adds a second vendor.
3. **Supabase for everything, including fetching in edge functions.** Rejected for
   the fetcher: SSRF checks, redirect limits and tests are harder in that runtime.
   See ADR-0003.
4. **Supabase Storage for thumbnails.** Deferred: the MVP only needs thumbnail
   URLs. The brief asks for object storage only where justified.

## Decision

Option 1. Supabase provides Postgres and Auth. The Node API performs all metadata
fetching and any server-side calls. Thumbnails are stored as remote URLs. No
Supabase Storage in the MVP.

## Reasoning

- Postgres is portable: plain SQL, Drizzle migrations, pg_dump for backup.
- Auth is the main lock-in. The extension needs a token flow against it, and that
  flow is one of the Phase 1 tickets.

## Tradeoffs

- Auth and any RLS policies are tied to Supabase.
- Remote thumbnails can break or leak referrers. Caching them is a later decision.

## Revisit when

- Auth needs a provider Supabase does not offer.
- Thumbnail or file storage becomes a real requirement.
