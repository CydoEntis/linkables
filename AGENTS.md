# linkaroo

Save any URL, find it later, share it when needed. The plan, scope and phase
order live in `docs/PLANNING.md`; decisions are in `docs/adr/`; terms are in
`CONTEXT.md`. Tickets are in Plane (project `linkaroo`, LNK-1 onward).

## Dev Deck

- **Stack:** TypeScript on Node. Vite + React SPA (web and PWA), Chrome MV3
  extension (Phase 2), one Node API on Hono (also runs the worker loop), Postgres
  via Drizzle on Supabase (Postgres + Auth). Source: ADR-0001, ADR-0002.
- **House style:** the shared conventions apply: vertical slice, colocation,
  small explicit functions, DRY/KISS, WHY-not-WHAT comments.
- **Commits:** `feat(scope): ...` / `fix(scope): ...`, one logical change per
  commit, no `git add -A`.
- **Stack rules (suggestions, edit freely):**
  - TypeScript strict mode; no `any` outside narrow, commented escape hatches.
  - Validate every request body and every external response at the boundary
    (e.g. with Zod); trust the types inside.
  - All data access goes through the API and is scoped to the signed-in user.
    No query returns another user's rows (plan Rule 3).
  - Anything that fetches a user-supplied URL goes through the SSRF-guarded
    fetcher from ADR-0003. Never call `fetch` on a saved URL directly.
  - Migrations are Drizzle migrations, committed, and never edited after merge.
  - React: function components; server state in TanStack Query.
- **API contract:** the web app and the extension are clients of the one API.
  The API is the source of truth; shared types live in the shared package.
- **Verify:** `pnpm verify` (typecheck + lint + test), not yet: P1-01 creates it.
- **Pipeline:** feature work goes through the pipeline skill
  (planner → builder → reviewer). Quick fixes can be done in-session.
