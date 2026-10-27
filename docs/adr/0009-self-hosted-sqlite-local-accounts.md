# ADR-0009: Self-hosted SQLite and local accounts

**Status:** accepted, 2026-10-27. Replaces ADR-0002's hosted Postgres and Supabase
Auth choice and ADR-0005's required public VPS deployment.

## Problem

The owner chose to keep Linkables as a personal tool and publish it as free,
self-hostable software. A fresh instance must not require a managed database,
external identity provider, mail account, or origin-specific frontend build.
Existing data and application features must survive the transition.

## Decision

- Keep the Vite React SPA, PWA, Hono API, and metadata worker. One API process
  owns one SQLite file on persistent local storage.
- Use Drizzle's SQLite schema and local `@libsql/client` driver. No hosted
  libSQL service or Turso account is involved. The async driver preserves the
  existing transaction interfaces.
- Serialize top-level driver operations and reserve the connection lane during
  transactions. This prevents native SQLite lock waits from blocking the event
  loop that needs to release an earlier transaction.
- Keep foreign keys enabled and use WAL. Worker claims use atomic updates and
  random lease tokens. A stale worker cannot complete another worker's claim.
- Store application timestamps as fixed-width UTC text with six fractional
  digits. Preserve PostgreSQL microseconds through snapshot migration and
  pagination. Better Auth's own timestamps use its millisecond schema.
- Replace Supabase Auth with Better Auth email/password accounts and persistent
  local sessions. Operators provision and reset accounts through CLI commands.
  Public signup stays disabled. Web sessions use HttpOnly cookies; extensions
  use bearer sessions. User IDs remain UUIDs and API ownership remains scoped
  to the authenticated identity.
- Build web and browser clients without instance secrets. The web uses its
  current origin. Extensions ask for a server address and request access to that
  host. Changing the address clears the old session and client cache.
- Supply Docker Compose builds for AMD64 and ARM64. Tailscale Serve is one
  private HTTPS option, not a required dependency. Other reverse proxies work.
- Keep the existing sharing, collection groups, reader mode, and account
  deletion. Private-share email codes are optional and require an explicitly
  configured mail provider and sender. No code falls back to the author's inbox.
- License the project under AGPL-3.0-only. Dependency and font licenses remain
  their owners' licenses.

## Search and ordering differences

SQLite FTS5 uses the Porter tokenizer for stemming, with title override,
description, and hostname content. Literal URL substring search remains.
User search syntax is parsed before it reaches FTS. Bind values and preserve the
documented stemming, phrases, alternatives, and exclusions without allowing raw
user input to become SQL or FTS syntax.

Title ordering uses a persisted title key maintained when titles change, with
deterministic Latin accent folding and ID tie-breaks. Stable pagination is
preserved. Ordering is not identical to every
PostgreSQL locale's collation for every script.

## Data transfer and recovery

Postgres export is a read-only snapshot. Offline import uses Node's SQLite API
and the committed Drizzle migration files, including the same migration ledger.
It preserves IDs, ownership, metadata, groups, reader copies, share settings,
and microseconds, then publishes a new database after validation. Old auth and
viewer sessions do not transfer. Existing users receive local passwords through
the operator reset command.

SQLite backup uses its online backup API, including committed WAL data. Restore
creates a new validated file instead of overwriting a live database. Retain the
auth secret and deployment configuration with protected recovery material.

## Tradeoffs

SQLite permits one writer at a time. This target is one host with personal or
small-group use, not a horizontally scaled hosted service. Network storage and
multiple API containers sharing one file are outside the supported deployment.

Local operators own updates, disk health, access controls, and backup retention.
A PWA supplies mobile access; native mobile apps remain outside this conversion.
Firefox source builds still need Mozilla signing for permanent installation in
standard Firefox. Store publication is separate from source availability.

## Verification

Behavior tests cover authorization, save/deduplication, search, pagination,
groups, sharing privacy, reader data, worker leases, and local sessions.
Migration tests cover ownership, preserved data, failed-import rollback,
non-overwrite, and reopening through the runtime migrator. Backup tests exercise
committed WAL data and an independent restore. The container smoke test boots a
fresh database, provisions an account, saves a link, and signs in after restore.
