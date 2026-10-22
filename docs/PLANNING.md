# linkaroo — Plan

Source of truth for scope and order. Records (ADRs, glossary, tickets) are linked
here, never copied in. Last checked against code: not yet (no code exists).

**Verify:** `pnpm verify` — not yet: P1-01 creates it.
**Base branch:** `main` (origin `CydoEntis/linkaroo`).

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
- Hosting: one long-running container; the owner intends a DigitalOcean server.

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

## Rules

Each rule names a check. None can pass yet because no code exists.

1. Outbound fetches refuse private, loopback, link-local, CGNAT, multicast and
   IPv4-mapped addresses, on every redirect hop.
   Check: `pnpm --filter api test fetcher`. not yet: P1-06
2. No code outside `apps/api/src/metadata/fetcher.ts` makes outbound HTTP.
   Check: ESLint `no-restricted-globals: fetch` and `no-restricted-imports:
   undici, node:http, node:https` in `apps/api` excluding that file; `pnpm lint`.
   not yet: P1-06
3. Every route except `/health` needs a valid Supabase JWT, and every query is
   scoped to `sub`. Check: `apps/api/test/authz.test.ts`. not yet: P1-03a, P1-19
4. The database is reachable only through the API.
   Check: the SQL in P1-02's verify returns 0 and the Data API is off on the
   project. not yet: P1-02
5. Saving never waits on a network fetch.
   Check: the P1-05 test with the fetcher hanging. not yet: P1-05
6. Logs never contain a URL's query string or fragment.
   Check: the logger test from P1-17. not yet: P1-17

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
  search; sort and filter; JSON export of the user's links; responsive web UI.
- Deferred: browser extension, PWA share target, any sharing.
- Exit: the success condition above is met, and the owner uses it for two weeks
  without falling back to Discord.
- Tickets: Plane project `linkaroo` (LNK), workspace `ideayard`, project id
  `34d1ff25-ab11-4617-bb3b-7b56acb0c8cd`: LNK-1 to LNK-16, titled P1-01 to P1-16.
  Blockers are native Plane relations (set via `work-items/{id}/relations/`) and are
  also written in each ticket body.
  **Revision pending:** the Opus review proposes splitting, adding and re-blocking
  tickets; the list below is the original filing until step 2 is approved.
  - Critical path (original): P1-01 → P1-02 → P1-03 → P1-05 → P1-10 → P1-11 → P1-14 → P1-16.
  - Rules not yet true: see Rules above.

### Phase 2 — Chrome extension and PWA share target

- Objective: saving tabs and phone links is effortless.
- In: save current tab, selected tabs, a whole window; choose Inbox or collection;
  detect already-saved URLs; close tabs only after confirmed save; PWA share target;
  the extension's Supabase token flow.
- Exit: a 50-tab save in one pass loses no tabs, and the phone share sheet saves
  reliably on Android and iOS.
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
  [0005](adr/0005-hosting.md)
- Glossary: [CONTEXT.md](../CONTEXT.md)
- Source brief: [brief.md](brief.md) (the original request, kept for reference)
