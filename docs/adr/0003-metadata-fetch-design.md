# ADR-0003: Metadata fetching in the Node API, behind an SSRF guard, with a DB-backed job table

**Status:** accepted (2026-10-21; amended 2026-10-21 after the second Opus 5.5 audit, before any code)

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
  `connect.lookup`) for host names, so the IP that is checked is the IP that is
  connected, and **directly on the parsed host** for IP-literal URLs, because Node
  skips the lookup for IP literals (strip IPv6 brackets before checking). The
  lookup handles both the `all: true` array form (Node's default
  `autoSelectFamily`) and the single-address form, and refuses if any returned
  address is blocked.
- Redirects are followed by hand, not by undici's redirect interceptor (which has
  no per-hop hook and no port check): each `Location` is resolved against the
  current URL and checked for scheme, port and IP literal before it is requested
  through the same guarded agent.
- Refused ranges: 0.0.0.0/8, 10/8, 100.64/10, 127/8, 169.254/16, 172.16/12,
  192.168/16, 224/4 and up, ::, ::1, fc00::/7, fe80::/10, IPv4-mapped IPv6
  (`::ffff:a.b.c.d` and its hex form are checked as IPv4), 64:ff9b::/96 and
  2002::/16 (embedded IPv4 checked as IPv4), 198.18/15, 192.0.0/24, and multicast.
- Allow only http and https, only ports 80 and 443, at most 5 redirects. Proxy
  environment variables are ignored: the fetcher always passes its own undici
  `Agent` (never `EnvHttpProxyAgent` or global `fetch`). It never forwards
  `X-Request-Id` or `traceparent` to the target.
- 2 s connect timeout (`connect.timeout`), 10 s total timeout
  (`AbortSignal.timeout` across all hops; undici has no total-time option). Stream the body; stop at `</head>` or
  512 KB, whichever comes first, and hard-abort at 2 MB. `fetchHtml` accepts only
  `text/html`; any other content type records the type with no title. `fetchJson`
  accepts only a 2xx response whose media type is `application/json` (oEmbed
  errors are plain text labelled as JSON) and is used only for the YouTube oEmbed
  endpoint.
- Tests may inject a DNS lookup, allowed ports, and an exact-IP allow list (for the
  local test server only) to run size, timeout, redirect and content-type tests.
  The blocked-address check always runs; production builds the fetcher with no
  overrides. Refusals throw a distinct error type so tests cannot pass on a plain
  connection failure.
- Failures are recorded on the resource (`fetch_failed`, with reason). The user
  can still save and edit it.

**Dedupe key.** The normalised submitted URL (canonicalisation rules in P1-04:
tracking parameters stripped, host lowercased, default port dropped). The page's
`<link rel=canonical>` (`resource.rel_canonical_url`) and the final redirect URL
(`resource.final_url`) are stored but **not** used to merge records in Phase 1.
The submitted URL is kept per user on `saved_link.original_url`, never on the shared
resource.

**YouTube.** YouTube URLs (`youtube.com/watch`, `youtu.be`, `/shorts`) use the
oEmbed endpoint (title, author, thumbnail) instead of scraping the HTML. The oEmbed
request goes through the guarded fetcher (`fetchJson`) like any other fetch. P1-08
builds the URL and parses the JSON as pure functions; P1-07 makes the call. oEmbed
reliability from a server is unverified, so P1-07 includes a live smoke test gated
by `LIVE_TESTS=1`.

**Job claiming.** Claim with
`UPDATE job SET locked_until = now() + 60s, attempts = attempts + 1 WHERE id = (SELECT id FROM job WHERE run_after <= now() AND (locked_until IS NULL OR locked_until < now()) ORDER BY id FOR UPDATE SKIP LOCKED LIMIT 1) RETURNING *`.
At most 3 attempts in total, with backoff of 30 s then 2 min via `run_after`. The
job row is deleted on success or after the last failed attempt; final failure sets
`fetch_status = 'fetch_failed'` and `fetch_error`. Poll every 1 s when idle.
Process at most 4 fetches at once and at most 1 per host. Only a save that creates
the resource row inserts a job. The claim is one statement in its own implicit
transaction and uses no session state, so it works through the transaction
pooler; row locks last only for the statement and the `locked_until` lease is the
guard. P1-18 confirms it in production.

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

undici docs and source: `connect.lookup` takes a custom DNS function; per-request
`maxRedirections` was removed and `interceptors.redirect` has no per-hop hook, so
redirects are handled by hand. Node source: `net.connect` skips `lookup` for IP
literals, including on redirect hops (probe on Node 24 / undici 8). YouTube oEmbed
(`https://www.youtube.com/oembed?url=...&format=json`) needs no key and returns
`title`, `author_name`, `thumbnail_url`; errors are plain text. Unverified: YouTube oEmbed behaviour and consent pages
served to datacenter IPs.
