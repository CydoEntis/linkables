# linkaroo — Plan

Source of truth for scope and order. Records (ADRs, glossary, tickets) are linked
here, never copied in. Last checked against code: not yet (no code exists).

**Verify:** not yet (no code).
**Base branch:** not yet (no repo).

## Goal

Save any URL in seconds, find it later from any device, share it when needed.
Success condition: save a YouTube video or article on the home computer, find it
from the work computer, with no Discord message and no open tab.

## Shape

- Phase 1 is planned in full. Phases 2 to 6 are outlines and get tickets only
  when they become the active phase.
- Architecture: modular monolith. Vite React SPA (web and PWA), Chrome MV3
  extension sharing UI code, one TypeScript Node API (Hono or Fastify), Postgres
  via Drizzle, hosted on Supabase for Postgres and Auth. No Supabase Storage in
  the MVP. Marketing site deferred.

## Decisions

- Modular monolith with one API; SPA clients. Rejected: Next.js full-stack,
  microservices. → [ADR-0001](adr/0001-modular-monolith-spa-clients.md)
- Supabase for Postgres and Auth; no object storage in MVP; thumbnails stored as
  remote URLs. Rejected: Supabase edge functions for fetching.
  → [ADR-0002](adr/0002-supabase-postgres-and-auth.md)
- Metadata fetching runs in the Node API behind an SSRF guard, with a DB-backed
  job table. → [ADR-0003](adr/0003-metadata-fetch-design.md)

## Rules

- Metadata fetching refuses private, loopback and link-local addresses.
  not yet: Phase 1 metadata ticket
- A user can read only their own resources in Phase 1. not yet: Phase 1 auth ticket

## Glossary

[CONTEXT.md](../CONTEXT.md)

## Out of scope (now)

- Sharing and collaboration (Phase 3)
- AI features (Phase 4)
- Billing and team plans (Phase 5)
- Native mobile apps, nested collections, marketing site (Phase 6 or later)
- Firefox extension

## Phases

### Phase 0 — Definition  *(done: ADR-0001 to ADR-0003 and CONTEXT.md written and linked)*

- Objective: the decisions in this plan are recorded and the glossary exists.
- Exit: ADR-0001 to ADR-0003 and CONTEXT.md are written and linked here.

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
  - Critical path to the success check: P1-01 → P1-02 → P1-03 → P1-05 → P1-10 → P1-11 → P1-14 → P1-16.
  - P1-04 and P1-06 can start right after P1-01. P1-15 is off the critical path.
  - First point you can stop and have a useful product: P1-16 (the exit condition).
  - Rules not yet true: SSRF refusal is made true by P1-06; per-user read access by P1-03.

### Phase 2 — Chrome extension and PWA share target

- Objective: saving tabs and phone links is effortless.
- In: save current tab, selected tabs, a whole window; choose Inbox or collection;
  detect already-saved URLs; close tabs only after confirmed save; PWA share target.
- Exit: a 50-tab save in one pass loses no tabs, and the phone share sheet saves
  reliably on Android and iOS.
- Tickets: none (outline only).

### Phase 3 — Sharing and collaboration

- Objective: coworkers and friends can use shared collections.
- In: share links and collections; roles (owner, editor, viewer); invitations;
  follow collections; contributor attribution.
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
  [0003](adr/0003-metadata-fetch-design.md)
- Glossary: [CONTEXT.md](../CONTEXT.md)
- Source brief: [brief.md](brief.md) (the original request, kept for reference)
