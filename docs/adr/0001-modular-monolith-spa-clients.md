# ADR-0001: Modular monolith with one API and SPA clients

**Status:** accepted (2026-10-21)

## Problem

The product has three clients: a web app (and PWA), a Chrome extension, and later a
mobile share target. All three need the same save, search and sharing API. The
marketing site is separate.

## Options

1. **Next.js full-stack.** One app serves UI, API and pages. Good for SSR and SEO.
   The extension and PWA still need the API, and the marketing site is the only
   part that needs SSR.
2. **Vite React SPA + one Node API (chosen).** Clients call a single TypeScript
   service. The extension and PWA reuse the same API and UI code.
3. **Microservices** (separate metadata, search, auth services). Rejected: many
   deployables for one developer.
4. **Fastify instead of Hono for the API.** Rejected: Hono ships a JWT/JWKS
   middleware that fits Supabase token verification, and P1-01 is already built
   around it.

## Decision

Option 2. One Node API on **Hono**: a single long-running process that serves HTTP
and runs the metadata worker loop (enabled by `WORKER_ENABLED`). The SPA is served
from a separate static origin, and the API allows it through a CORS allowlist read
from env. A Chrome MV3 extension shares UI code with the SPA (Phase 2). The
marketing site is separate and deferred.

## Reasoning

- Two non-web clients need a plain JSON API. Next.js would still need one.
- One deployable for the API and the worker keeps operations to one service.
- Modules inside the API (links, collections, metadata, auth) keep boundaries
  without network hops.

## Tradeoffs

- Two front-end builds (web and extension) to maintain.
- No SSR for public pages in the MVP. Public sharing in Phase 3 may need revisiting.
- The worker shares a process with the API, so a runaway fetch can affect request
  latency. The concurrency caps in ADR-0003 limit this.

## Revisit when

- Public shared collections need SEO, which makes SSR for those pages worth it.
- The API needs independent scaling for AI work, or the worker needs its own process.
