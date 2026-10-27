# Move a hosted library to SQLite

This procedure migrates an existing Linkables Postgres database to a new SQLite
file. It preserves user IDs, resources, notes, pins, collection membership, groups,
reader copies, share tokens, share visibility, and timestamps to microsecond
precision. The source database is never changed.

Existing sign-in sessions, email verification codes, and viewer sessions are not
transferred. Imported users have no local password until the operator sets one.
Worker jobs keep their attempts and schedule, but old worker leases are cleared.

## Back up the hosted instance

Before migration, make a Postgres custom-format backup with `pg_dump`, using the
source instance's connection settings. Save its deployment configuration and
secrets outside the repository. Rehearse restoring the app's public schema into a
separate Postgres database. Do not retire the old service yet.

Use the new self-hosted source checkout and install its Node 24 dependencies:

```sh
corepack enable
pnpm install --frozen-lockfile
```

Read the source connection string without putting it in shell history. The
connection needs permission to read the app tables and `auth.users` identities:

```sh
read -rsp 'Source Postgres connection string: ' MIGRATION_DATABASE_URL; printf '\n'
export MIGRATION_DATABASE_URL
pnpm export:postgres /secure/location/postgres-snapshot.json
unset MIGRATION_DATABASE_URL
```

The exporter uses one read-only repeatable-read transaction. PostgreSQL creates
each row's JSON so timestamp precision survives. The snapshot contains personal
data and share tokens. Keep it protected and outside the source checkout.

## Convert to a new database

Choose a destination that does not exist:

```sh
pnpm maintenance import-postgres /secure/location/postgres-snapshot.json /secure/location/migrated.db
pnpm maintenance check /secure/location/migrated.db
```

The importer validates the snapshot, refuses cross-user collection membership,
imports in one transaction, and checks integrity and foreign keys. It creates the
destination only after verification. Existing destinations are never replaced.
Malformed input or a failed import leaves no published destination.

The standard library JSON export is not a full database migration: it omits
resource metadata, reader copies, IDs, groups, and share settings. Use the database
snapshot for this procedure.

## Deploy the migrated database

Follow the [installation guide](../README.md) to build the containers and create
the persistent volume. Stop the API before selecting the migrated database:

```sh
docker compose stop api
docker compose cp /secure/location/migrated.db api:/data/migrated.db
docker compose run --rm --user root api chown node:node /data/migrated.db
```

Set `DATABASE_URL=file:/data/migrated.db` in the checkout's `.env`. Preserve the
original `linkables.db` until the migration is verified. Then start the app:

```sh
docker compose up -d
```

Set local passwords with the reset command in the [operator guide](../deploy/README.md#manage-accounts).
Use each imported account's existing email. This keeps its UUID and library.
The old Google and emailed-code sign-in methods no longer apply to local accounts.

## Verify before retiring hosting

Compare the source and target counts for users, links, resources, collections,
groups, memberships, and reader copies. Inspect representative notes, pins,
timestamps, group ordering, and private-share settings.

On the running replacement, verify sign-in, search, save, edit, export, reader
mode, and browser extension access. Test a shared collection from a separate
browser context. A private Tailscale instance cannot serve recipients outside
the permitted network, even when they hold a share URL.

Create an online SQLite backup and restore it into a fresh database. Open the
restored database with the app and repeat sign-in and retrieval checks. Retain
the matching `.env` and auth secret with your protected recovery material.
Use the operator guide's `backup-current` command, which reads the selected
database from the running container instead of assuming the original filename.

Only after these checks pass, stop the old app and its automatic update timer.
Remove only Linkables resources from a shared host. Keep the old Postgres backup
and snapshot until you are satisfied with the replacement. Database deletion is
a separate final cleanup action, not part of export or import.
