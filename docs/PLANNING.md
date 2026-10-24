# linkables — Plan

Source of truth for scope and order. Records (ADRs, glossary, tickets) are linked
here, never copied in. Last checked against code: 2026-10-22, after P1-01 to P1-11, P1-13, P1-17 and
P1-22 merged.

**Verify:** `pnpm verify` (DB tests need `docker compose up -d` and
`TEST_DATABASE_URL`; see README).
**Base branch:** `main` (origin `CydoEntis/linkables`).

## Goal

Save any URL in seconds, find it later from any device, share it when needed.
Success condition: save a YouTube video or article on the home computer, find it
from the work computer, with no Discord message and no open tab.

## Shape

- Phase 1 is planned in full. Phases 2 to 6 are outlines and get tickets only
  when they become the active phase.
- Architecture: modular monolith. Vite React SPA (web and PWA), Chrome MV3
  extension sharing UI code, one TypeScript Node API on Hono that also runs the
  worker loop, Postgres via Drizzle on Supabase (Postgres + Auth). No Supabase
  Storage in the MVP. Marketing site deferred.
- Sign-in in Phase 1: email magic link / OTP.
- Hosting: one long-running container on the owner's Raspberry Pi, over Tailscale.

## Decisions

- Modular monolith, one Hono API that also runs the worker; SPA clients. Rejected:
  Next.js full-stack, microservices, Fastify.
  → [ADR-0001](adr/0001-modular-monolith-spa-clients.md)
- Supabase for Postgres and Auth; the API verifies tokens and owns authorization;
  Data API off; no object storage in MVP. Rejected: Supabase edge functions for
  fetching. → [ADR-0002](adr/0002-supabase-postgres-and-auth.md)
- Metadata fetching behind an SSRF guard that checks inside the DNS lookup, with a
  DB-backed job table; YouTube via oEmbed. Rules out Redis/BullMQ in the MVP.
  → [ADR-0003](adr/0003-metadata-fetch-design.md)
- Shared `resource`, per-user `saved_link`; Inbox is derived. Rules out one shared
  row carrying user edits. → [ADR-0004](adr/0004-data-model.md)
- One long-running container for API and worker; never serverless.
  → [ADR-0005](adr/0005-hosting.md)
- Web UI on Tailwind CSS v4 and shadcn/ui (Base UI), Lucide icons; design brief
  and prompt in `docs/design/`. → [ADR-0006](adr/0006-ui-kit.md)
- Screens follow the designer's handoff (`docs/design/handoff/`, dark theme only
  until a light theme is drawn). The UI calls the Inbox **To sort**; pinned items
  sort first everywhere; Undo replaces confirm dialogs. Web stack: TanStack Query,
  TanStack Router, Zustand, shadcn/ui, Tailwind CSS v4, Zod, react-hook-form. → [ADR-0006](adr/0006-ui-kit.md)
- The API follows the Dev Deck API contract (envelope, 8 error codes, `/api/v1`
  prefix); P1-01 builds it. → `AGENTS.md`, API contract

## Rules

Each rule names a check. A `not yet:` marker names the ticket that makes it true.

1. Outbound fetches refuse private, loopback, link-local, CGNAT, multicast and
   IPv4-mapped addresses, on every redirect hop.
   Check: `pnpm --filter api test fetcher`.
2. No code outside `apps/api/src/metadata/fetcher.ts` makes outbound HTTP, except
   the Supabase JWKS fetch inside the auth middleware (ADR-0002).
   Check: ESLint in `apps/api` excluding that file bans `fetch` and
   `globalThis.fetch`, and static or dynamic imports of `undici` (and subpaths),
   `http`, `https` and `http2` (test files may import `http` for local test
   servers); `pnpm lint`.
3. Every route except `/health` needs a valid Supabase JWT, and every query is
   scoped to `sub`. Check: `apps/api/test/authz.db.test.ts` (every route: no
   token → 401, another user's ids → 404, no leaks in any listing; fails if a route
   is missing from it).
4. The database is reachable only through the API.
   Check: the SQL in P1-02's verify returns 0 and the Data API is off on the
   project (turned off 2026-10-22).
5. Saving never waits on a network fetch.
   Check: the Rule 5 test in `apps/api/src/metadata/worker.db.test.ts` (fetcher
   hanging, `POST /links` still returns 201 within 500 ms).
6. Logs never contain a URL's query string or fragment.
   Check: the logger tests in `apps/api/src/log/logger.test.ts`.

## Glossary

[CONTEXT.md](../CONTEXT.md)

## Out of scope (now)

- Sharing and collaboration (Phase 3)
- AI features (Phase 4)
- Billing and team plans (Phase 5)
- Native mobile apps, nested collections, marketing site (Phase 6 or later)
- Firefox extension
- Tags, archive, bulk actions, account deletion (not asked for; add when wanted)

## Phases

### Phase 0 — Definition  *(done: ADR-0001 to ADR-0005 and CONTEXT.md written and linked)*

- Objective: the decisions in this plan are recorded and the glossary exists.
- Exit: ADRs and CONTEXT.md are written and linked here.

### Phase 1 — Personal MVP  *(active)*

- Objective: a usable personal link library on desktop and mobile browsers.
- In: auth; save URL; async metadata fetch; Inbox; collections; Postgres full-text
  search; sort and filter; JSON export of the user's links; responsive web UI;
  saving without copy and paste (Android share target, bookmark button, iPhone
  Shortcut, drag and drop), added 2026-10-22 because saving must be effortless.
- Deferred: browser extension, any sharing.
- Exit: the success condition above is met, and the owner uses it for two weeks
  without falling back to Discord.
- Tickets: Plane project `linkables` (LNK), workspace `ideayard`, project id
  `34d1ff25-ab11-4617-bb3b-7b56acb0c8cd`. 33 tickets, revised 2026-10-21 after the
  second Opus 5.5 audit; P1-23 to P1-25 added 2026-10-22.
- Product renamed from linkaroo to linkables on 2026-10-22; the GitHub repo is now
  `CydoEntis/linkables` (the old URL redirects). The Plane and Supabase projects
  were renamed too; their ids and refs did not change.
- Supabase project: `linkables`, ref `tiechzmcvmdlceyovskg`, region `us-east-1`,
  free plan, created 2026-10-22 (ES256 signing key by default).
- **Blockers live only in each ticket body's `Blocked by:` line.** Do not create
  native Plane relations: this self-hosted Plane's API can add a relation but not
  remove one, so every plan revision that drops a blocker left a stale one behind.

  | Ticket | Plane | Ticket | Plane |
  |---|---|---|---|
  | P1-01 scaffold + CI | LNK-1 | P1-13 edit, delete, pin | LNK-13 |
  | P1-02 schema + migration | LNK-2 | P1-14a app shell + Inbox cards | LNK-14 |
  | P1-03a API auth | LNK-3 | P1-14b collections UI | LNK-18 |
  | P1-03b web sign-in | LNK-17 | P1-14c search UI | LNK-19 |
  | P1-04 canonicalisation | LNK-4 | P1-14d edit/pin UI + export button | LNK-20 |
  | P1-05 save endpoint | LNK-5 | P1-15 export API | LNK-15 |
  | P1-06 SSRF fetcher | LNK-6 | P1-16 [owner] success check | LNK-16 |
  | P1-07 worker loop | LNK-7 | P1-17 config + logger | LNK-21 |
  | P1-08 metadata extraction | LNK-8 | P1-18 deploy skeleton | LNK-22 |
  | P1-09 collections | LNK-9 | P1-19 authz sweep | LNK-23 |
  | P1-10 Inbox list | LNK-10 | P1-20 [owner] provision server | LNK-24 |
  | P1-11 search | LNK-11 | P1-21 [owner] Supabase project | LNK-25 |
  | P1-12 sort and filter | LNK-12 | P1-22 e2e test harness | LNK-26 |
  | P1-23 `/save` page, installable app, Android share | LNK-27 | P1-24 bookmark button | LNK-28 |
  | P1-25 iPhone Shortcut, Save from anywhere page | LNK-29 | P1-26 collection names ignore case | LNK-30 |
  | P1-27 pinned links first | LNK-31 | P1-28 collection pin, recent order, covers | LNK-32 |
  | P1-29 link collections and saved-from device | LNK-33 | | |

  - Critical path to the success condition (P1-18 and P1-14a both done):
    P1-01 → P1-17 → P1-02 → P1-05 → P1-10 → P1-14a, where P1-14a also needs
    P1-02 + P1-03a → P1-03b → P1-22. P1-18 needs P1-03b and P1-05 + P1-06 + P1-08
    → P1-07, plus the owner tasks P1-21 → P1-20.
  - First point you can stop with a useful product: **P1-18 + P1-14a** (save at
    home, see it in the Inbox at work). Phase 1's exit adds P1-09 → P1-12 → P1-14c,
    P1-14b, P1-14d, P1-11 + P1-13 + P1-15 → P1-19, and P1-23 → P1-24 → P1-25
    (P1-23 needs P1-03b and P1-14a), all ending at P1-16.
  - **Build order from here (2026-10-22, after the design handoff):** API P1-26, P1-27,
    P1-28, P1-29 alongside P1-14a; then mobile saving first, because it is the main
    selling point: P1-23 → P1-25 → P1-24; then P1-14b, P1-14c, P1-14d; then P1-18
    and the success check P1-16.
  - P1-04, P1-06 and P1-17 can start right after P1-01; P1-08 after P1-04. P1-16, P1-20 and
    P1-21 are yours, not an agent's; do P1-21 early, since P1-20 and P1-18 wait on it.
  - Rules not yet true: see Rules above.

### Phase 2 — Chrome extension

- Objective: saving tabs is effortless.
- In: save current tab, selected tabs, a whole window; choose Inbox or collection;
  detect already-saved URLs; close tabs only after confirmed save; the extension's
  Supabase token flow. (The phone share target moved to Phase 1 as P1-23.)
- Exit: a 50-tab save in one pass loses no tabs.
- Tickets: none (outline only).

### Phase 3 — Sharing and collaboration

- Objective: coworkers and friends can use shared collections.
- In: share links and collections; roles (owner, editor, viewer); invitations;
  follow collections; contributor attribution; custom SMTP so others can sign up.
- Exit: private resources do not leak through API, search or metadata endpoints.
- Tickets: none (outline only).

### Phase 4 — AI features

- Objective: optional summaries and search over saved content, with citations.
- In: on-demand summaries, semantic search, library Q&A with citations, usage metering.
- Exit: every AI call is metered and capped; summaries state whether source text
  or only metadata was used.
- Tickets: none (outline only).

### Phase 5 — Commercialization

- Objective: find out whether people pay.
- In: subscription billing, AI credits, usage limits.
- Exit: a paid plan works end to end with controlled per-user AI cost.
- Tickets: none (outline only).

### Phase 6 — Later

- Objective: nothing committed. Each item is evaluated by user demand and cost.
- Candidates: native apps, nested collections, import integrations, public
  directories, marketing site.
- Tickets: none.

## Hub

- ADRs: [0001](adr/0001-modular-monolith-spa-clients.md),
  [0002](adr/0002-supabase-postgres-and-auth.md),
  [0003](adr/0003-metadata-fetch-design.md),
  [0004](adr/0004-data-model.md),
  [0005](adr/0005-hosting.md),
  [0006](adr/0006-ui-kit.md)
- Design: [brief](design/BRIEF.md), [prompt](design/PROMPT.md)
- Glossary: [CONTEXT.md](../CONTEXT.md)
- Source brief: [brief.md](brief.md) (the original request, kept for reference)
