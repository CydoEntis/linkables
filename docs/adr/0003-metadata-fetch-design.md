# ADR-0003: Metadata fetching in the Node API, behind an SSRF guard, with a DB-backed job table

**Status:** proposed (accept with the plan)

## Problem

Saving a URL must return fast, but title, description, favicon and thumbnail come
from fetching the remote page. Fetching untrusted URLs risks SSRF into private
networks, malicious redirects, huge downloads, and untrusted HTML.

## Options

1. **Fetch inline, in the save request.** Simple, but slow pages block saving and
   a bad URL can tie up the API.
2. **Fetch in a Node worker, triggered by a DB-backed job table (chosen).** The save
   request writes the resource and a job row, then returns. A worker polls the table.
3. **Redis + BullMQ.** Rejected for the MVP: a second service with no proven need.
4. **Supabase edge functions.** Rejected: see ADR-0002.

## Decision

Option 2. Save writes the resource (status `pending`) and a job, and returns. A
worker in the Node API claims jobs, fetches with the guard below, and updates the
resource.

**Guard rules:**
- Resolve the hostname first; refuse private, loopback, link-local and multicast
  addresses, and recheck after every redirect.
- Follow at most 5 redirects; allow only http and https.
- Fetch with a 2-second connect timeout, a 10-second total timeout, and a 2 MB body
  cap. Parse only the head section.
- Strip known tracking parameters before storing the canonical URL; keep the
  original URL too.
- Failures are recorded on the resource (`fetch_failed`, with reason). The user
  can still save and edit it.

## Reasoning

- Saving stays fast and never waits on remote servers.
- The job table is the queue, so there is no Redis to run.
- The guard runs in one place, so it can be tested directly.

## Tradeoffs

- Polling adds latency of a few seconds before metadata appears.
- DNS rebinding needs the resolved address to be the one connected to, which the
  fetch client must enforce.

## Revisit when

- Job volume outgrows polling, or retries need scheduling beyond what a table can do.
- YouTube or other sites need dedicated extractors.
