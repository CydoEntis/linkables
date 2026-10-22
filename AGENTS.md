# linkaroo

Save any URL, find it later, share it when needed. The plan, scope and phase
order live in `docs/PLANNING.md`; decisions are in `docs/adr/`; terms are in
`CONTEXT.md`. Tickets are in Plane (project `linkaroo`, LNK-1 onward).

## Dev Deck

- **Stack:** TypeScript on Node. Vite + React SPA (web and PWA), Chrome MV3
  extension (Phase 2), one Node API on Hono (also runs the worker loop), Postgres
  via Drizzle on Supabase (Postgres + Auth). Source: ADR-0001, ADR-0002.
- **House style:** the shared Dev Deck conventions apply: vertical slice,
  colocation, small explicit functions, DRY/KISS, WHY-not-WHAT comments, and its
  definition of done. Read `conventions/code-style.md`, `conventions/commits.md`
  and `conventions/contract.md` in the Dev Deck repo (`CydoEntis/dev-deck`; local
  copy under `~/.claude/plugins/marketplaces/dev-deck/conventions/`).
- **Playbooks:** pick the matching mode (new app, refactor, debug, system
  design, performance, restructure, multi-agent build, UI component) from Dev
  Deck `conventions/playbooks/README.md`. Its "Which rules win" order applies.
- **Commits:** `feat(scope): ...` / `fix(scope): ...`, one logical change per
  commit, no `git add -A`, no ticket IDs in commit messages.
- **Verify:** `pnpm verify` (typecheck + lint + test). not yet: P1-01 creates it.

## Layout

- `apps/api`: Hono API and worker. One folder per feature under `src/`
  (`links/`, `collections/`, `metadata/`, `auth/`, ...) holding its routes,
  logic and tests. Cross-cutting HTTP code (envelope, errors, request id) in
  `src/http/`; DB schema and client in `src/db/`; integration tests and
  fixtures in `apps/api/test/`.
- `apps/web`: React SPA, one folder per feature under `src/`; Playwright tests
  in `apps/web/e2e`.
- `packages/shared`: anything that crosses HTTP or is used by two apps, per
  feature: `src/<feature>/schemas.ts` (Zod; the schema is the contract),
  `types.ts`, `constants.ts`. App-internal types stay in the app.

## API contract

The API follows the Dev Deck contract (`conventions/contract.md`):

- Every response is `{ ok: true, data, meta }` or `{ ok: false, error: { code,
  message, details? }, meta }`, with `meta.requestId` mirrored in `X-Request-Id`.
- Errors use the 8 registry codes (`VALIDATION`, `UNAUTHENTICATED`, `FORBIDDEN`,
  `NOT_FOUND`, `CONFLICT`, `RATE_LIMIT`, `UPSTREAM`, `INTERNAL`) via the error
  subclasses and one top-level handler. Another user's row is `NOT_FOUND`, never
  `FORBIDDEN` (don't leak existence). DELETE returns 200 with `data: null`.
- Routes mount under `/api/v1`. **Paths in tickets are relative to that
  prefix** (`POST /links` means `POST /api/v1/links`). Only `GET /health` is
  unversioned. Pagination lives inside `data` as `{ items, cursor }`.

## Rules

- TypeScript strict; no `any` outside narrow, commented escape hatches.
- Validate every request body, query and external response with Zod at the
  boundary; trust the types inside.
- All data access goes through the API and is scoped to the signed-in user's
  `sub`. No query returns another user's rows (plan Rule 3). Every new route gets
  a two-user test and an entry in `apps/api/test/authz.test.ts`.
- Anything that fetches a user-supplied URL goes through the SSRF-guarded
  fetcher (ADR-0003, `apps/api/src/metadata/fetcher.ts`). Never call `fetch` on a
  saved URL directly; never weaken the guard to make a test pass.
- The test auth path (`AUTH_TEST_JWKS`, the committed test key pair) works only
  with `NODE_ENV=test`. Never add another way around token verification.
- Logs never contain a URL's query string or fragment; use the redacting logger.
- Migrations are Drizzle migrations, committed, never edited after merge.
- React: function components; server state in TanStack Query; all API calls go
  through the one API client module.
- Tests: Vitest beside the source; DB integration tests run serially; one test
  per behaviour, named after it.

## Working a ticket

The Dev Deck pipeline (planner → builder → reviewer) is used for every ticket.
Plane is the ticket source, not `.plan/`:

1. **Pick:** the lowest-numbered Phase 1 ticket in Backlog or Todo whose
   `Blocked by:` tickets are all Done. Skip tickets marked `[owner]`; those are
   the owner's. Blockers live only in the ticket body's `Blocked by:` line;
   never create native Plane relations (this Plane cannot remove them).
2. **Start:** move it to In Progress and branch from `main` as
   `lnk-<n>-<short-slug>`.
3. **Plan:** Phase 1 tickets are already planned. The planner copies the Plane
   ticket into `.plan/tickets.md` (scratch, gitignored) and adds only an
   implementation note. It does not change scope. If the ticket is wrong or
   impossible as written, stop and report instead of improvising.
4. **Build and review:** builder test-first; reviewer blind against the ticket's
   Verify line and this file.
5. **Finish:** open a PR to `main` named `P1-xx <ticket title>`, linking the
   Plane ticket. After merge, move the ticket to Done and update any
   `not yet:` marker in `docs/PLANNING.md` that the ticket made true.
