# ADR-0003: Metadata fetching in the Node API, behind an SSRF guard, with a DB-backed job table

**Status:** accepted (2026-10-21)

## Problem

Saving a URL must return fast, but title, description, favicon and thumbnail come
from fetching the remote page. Fetching untrusted URLs risks SSRF into private
networks, malicious redirects, huge downloads, and untrusted HTML.

## Options

1. **Fetch inline, in the save request.** Simple, but slow pages block saving and
   a bad URL can tie up the API.
2. **Fetch in a worker loop, triggered by a DB-backed job table (chosen).** The save
   request writes the saved link and a job row, then returns. A worker loop in the
   API process claims jobs.
3. **Redis + BullMQ.** Rejected for the MVP: a second service with no proven need.
4. **Supabase edge functions.** Rejected: see ADR-0002.

## Decision

Option 2. Save writes the resource (status `pending`) and a job in one transaction,
and returns. The worker loop claims jobs, fetches with the guard below, and updates
the resource.

**Guard rules**
- Address checks run **inside the connection's DNS lookup** (undici
  `connect.lookup`), so the IP that is checked is the IP that is connected. Every
  redirect hop opens a connection through the same agent and is checked again.
- Refused ranges: 0.0.0.0/8, 10/8, 100.64/10, 127/8, 169.254/16, 172.16/12,
  192.168/16, 224/4 and up, ::, ::1, fc00::/7, fe80::/10, IPv4-mapped IPv6
  (`::ffff:a.b.c.d` is checked as IPv4), and multicast.
- Allow only http and https, only ports 80 and 443, at most 5 redirects. Proxy
  environment variables are ignored.
- 2 s connect timeout, 10 s total timeout. Stream the body; stop at `</head>` or
  512 KB, whichever comes first, and hard-abort at 2 MB. Accept only `text/html`;
  any other content type records the type with no title.
- Failures are recorded on the resource (`fetch_failed`, with reason). The user
  can still save and edit it.

**Dedupe key.** The normalised submitted URL (canonicalisation rules in P1-04:
tracking parameters stripped, host lowercased, default port dropped). The page's
`<link rel=canonical>` and the final redirect URL are stored but **not** used to
merge records in Phase 1.

**YouTube.** YouTube URLs (`youtube.com/watch`, `youtu.be`, `/shorts`) use the
oEmbed endpoint (title, author, thumbnail) instead of scraping the HTML. oEmbed
reliability from a server is unverified, so P1-08 includes a live smoke test.

**Job claiming.** Claim with
`UPDATE job SET locked_until = now() + 60s, attempts = attempts + 1 WHERE id = (SELECT id FROM job WHERE run_after <= now() AND (locked_until IS NULL OR locked_until < now()) ORDER BY id FOR UPDATE SKIP LOCKED LIMIT 1) RETURNING *`.
Retry at most 3 times with backoff. Process at most 4 fetches at once and at most
1 per host. Behaviour through the transaction pooler is unverified, so it gets an
integration test.

## Reasoning

- Saving stays fast and never waits on remote servers.
- The job table is the queue, so there is no Redis to run.
- The guard runs in one place, so it can be tested directly, and the lint rule in
  `docs/PLANNING.md` Rules keeps other code from making outbound requests.

## Tradeoffs

- Polling adds latency of a few seconds before metadata appears.
- The worker shares a process with the API (ADR-0001), bounded by the caps above.

## Revisit when

- Job volume outgrows polling, or retries need scheduling beyond what a table can do.
- oEmbed proves unreliable and YouTube needs another extractor.

## Sources (verified 2026-10-21)

undici docs: `connect.lookup` takes a custom DNS function; the redirect interceptor
takes `maxRedirections`. Unverified: YouTube oEmbed behaviour and consent pages
served to datacenter IPs.
