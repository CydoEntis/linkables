# linkaroo

Save any URL in seconds, find it later from any device, share it when needed.

**Status:** Phase 1 (personal MVP) is planned; no code yet.

## Where things are

- [`docs/PLANNING.md`](docs/PLANNING.md): goal, scope, phases, rules and the
  ticket map. Start here.
- [`docs/adr/`](docs/adr/): architecture decisions (stack, Supabase, metadata
  fetching, data model, hosting).
- [`CONTEXT.md`](CONTEXT.md): what the words mean (Resource, Saved link, Inbox, ...).
- [`AGENTS.md`](AGENTS.md): rules for anyone (human or agent) writing code here,
  and how a ticket gets worked.
- Tickets: Plane project `linkaroo` (LNK-1 onward).

## Develop

```sh
corepack enable                          # pnpm version comes from packageManager
pnpm install
cp apps/api/.env.example apps/api/.env   # local database URLs are filled in
docker compose up -d                     # Postgres 17 on localhost:5432
pnpm db:migrate                          # applies apps/api/drizzle to MIGRATION_DATABASE_URL
pnpm verify                              # typecheck + lint + test
```

The compose Postgres holds two databases: `linkaroo` for the running app
(`DATABASE_URL`, `MIGRATION_DATABASE_URL`) and `linkaroo_test` for integration
tests (`TEST_DATABASE_URL`), which truncate every table and migrate it
themselves. Values set in the shell win over `apps/api/.env`.

After changing `apps/api/src/db/schema.ts`, run `pnpm --filter api db:generate`
and commit the new file under `apps/api/drizzle/`. Never edit a migration after
it is merged.
