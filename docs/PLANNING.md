# Linkables plan

## Goal

Run Linkables as a free, open-source link library on your own hardware. Save from
a browser or phone, find links later, and share collections with people who can
reach your instance. The personal deployment uses a Raspberry Pi and Tailscale;
other installations can use their own reverse proxy.

On 2026-10-27, the owner replaced the hosted subscription product direction with
this self-hosted target. The former hosted plan and Plane ticket map remain in
[git history](https://github.com/CydoEntis/linkables/blob/a9d9fa8/docs/PLANNING.md).
They do not authorize new hosted-service features or backlog execution.

## Product scope

Keep the existing personal library: saving, metadata, search, sorting and filters,
notes, pins, collections, groups, reader mode, exports, account deletion, read-only
sharing, and the existing browser capture workflows. Mobile access uses the PWA.

The target requires local SQLite storage, local password accounts, runtime server
selection in extensions, portable Docker builds, migration, recovery tools, and
installation documentation. Personal use must not require Supabase, an external
identity provider, or a mail account. Optional private-share email verification
can use an operator-configured provider.

AI summaries, MCP, billing, team collaboration, native mobile apps, and a hosted
public service are outside this conversion. Evaluate new features from actual
personal use and explicit requests after the conversion is stable.

## Architecture

- Node 24, one Hono API and metadata worker process.
- Local SQLite file through Drizzle and `@libsql/client`.
- Better Auth local password accounts and sessions. Operators create accounts.
- Vite React SPA with the existing Tailwind, Base UI, TanStack, and Zod stack.
- Chrome and Firefox extension source with a configurable instance origin.
- Docker Compose on ARM64 or AMD64. Tailscale Serve is an optional HTTPS front end.

The replacement decision and its tradeoffs are in
[ADR-0009](adr/0009-self-hosted-sqlite-local-accounts.md). The glossary remains in
[CONTEXT.md](../CONTEXT.md).

## Conversion stages

1. **Preserve the source.** Back up the hosted Postgres database and deployment
   configuration. Rehearse restoring the app tables. Keep the hosted app running.
2. **Replace storage and auth.** Preserve API behavior and ownership while moving
   to SQLite and local sessions. Migrate every existing library and identity.
3. **Connect portable clients.** Remove hosted credentials from web and extension
   builds. Preserve existing capture, groups, reader, and sharing workflows.
4. **Prove recovery.** Convert a full snapshot, compare source data, create an
   online backup, and exercise a restored instance.
5. **Deploy privately.** Build native ARM64 containers, run the restored library
   on the Pi, and verify web, extension, and PWA access through HTTPS.
6. **Publish and retire hosting.** Publish the source under AGPL-3.0-only after
   independent review and a history secret scan. Stop only Linkables services on
   the old shared host after the replacement is verified. Retain recovery copies.

The conversion is complete only after all stages have evidence. Container builds,
store signing, phone installation, publication, and old-service retirement are
separate checks; source tests alone do not prove them.

## Verification

- `pnpm verify`: type checks, lint, and behavior tests. DB tests use temporary
  SQLite files without a running database service.
- `pnpm e2e`: user workflows on the running web app.
- `pnpm --filter extension e2e`: browser capture against a running local API.
- `bash deploy/smoke-test.sh <api-image>`: fresh container, local account, save,
  online backup, restored database, and restored sign-in.
- `pnpm maintenance check <database>`: SQLite integrity and foreign-key checks.
- Source-to-target migration comparisons and independent review.

Keep authorization, private-share behavior, SSRF restrictions, redacted logs,
safe worker leases, and saves that never wait for metadata fetching. Migration
and backup commands never overwrite a destination or print personal data.

## Operate and maintain

Install from the [README](../README.md). Follow [deployment operations](../deploy/README.md)
for accounts, HTTPS, backups, restore, upgrades, and rollback. Follow
[the migration procedure](self-hosting-migration.md) for an existing hosted library.

Use explicit owner requests or GitHub issues for new work. The planner, builder,
and independent reviewer pipeline remains the development process. Do not select
unrelated tasks from the historical hosted-product backlog.
