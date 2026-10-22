# ADR-0005: One long-running container for the API and worker; static SPA

**Status:** accepted (2026-10-21); vendor intended, not yet purchased

## Problem

The metadata worker is a poll loop inside the API process (ADR-0001, ADR-0003). A
serverless host never runs that loop, so every link would stay `pending` forever.

## Options

1. **Serverless functions for the API.** Rejected: no persistent process for the
   worker loop.
2. **Container PaaS (Fly.io, Railway, Render).** Runs a persistent process with
   little ops work. Pricing unverified.
3. **Own server on DigitalOcean or similar (chosen, intended).** A droplet running
   the API container, with a reverse proxy for TLS. Cheap and fully in the owner's
   control; the owner handles updates and the server's security.

## Decision

The API and worker run as **one long-running container**, never serverless. The
SPA is built to static files and served from a static host or the same reverse
proxy. The owner intends to run this on their own DigitalOcean server. The vendor
is not final until the server is bought; the constraints below hold for any host.

**Constraints for any host:** a persistent process; outbound IPv4 (Supabase's
shared pooler is IPv4; its direct connection is IPv6-only); TLS in front; env vars
for secrets; deploys from CI on `main`.

## Reasoning

- Without a persistent process the worker cannot run.
- A single container keeps the operational surface to one thing to deploy and watch.

## Tradeoffs

- A self-managed server means OS updates, firewall and TLS renewal are the owner's
  job. A container PaaS removes that at higher cost (unverified).
- The only copy of the process is on one machine; there is no failover.

## Revisit when

- Uptime matters to other users (Phase 3 and later).
- Server upkeep costs more time than a managed host would cost money.
