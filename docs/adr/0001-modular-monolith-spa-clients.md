# ADR-0001: Modular monolith with one API and SPA clients

**Status:** proposed (accept with the plan)

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

## Decision

Option 2. One Node API (Hono or Fastify) in a modular monolith, a Vite React SPA for
the web and PWA, and a Chrome MV3 extension sharing UI code. The marketing site is
separate and deferred.

## Reasoning

- Two non-web clients need a plain JSON API. Next.js would still need one.
- One deployable for the API keeps operations to one service.
- Modules inside the API (links, collections, metadata, auth) keep boundaries
  without network hops.

## Tradeoffs

- Two front-end builds (web and extension) to maintain.
- No SSR for public pages in the MVP. Public sharing in Phase 3 may need revisiting.

## Revisit when

- Public shared collections need SEO, which makes SSR for those pages worth it.
- The API needs independent scaling for AI work.
