# ADR-0008: Private shares (only the emails you allow)

Status: accepted, 2026-10-27

## Context

A view-only link opens for anyone who holds it. Owners want collections that only
chosen people can open, without making those people pay or sign up. Editors and
invited members stay out of scope.

## Decision

- A collection has a **who can see this** choice: anyone with the link (default),
  or only the emails the owner lists. It lives on `collection.share_private`, which
  is kept while the link is off. The listed addresses are rows of
  `share_allowed_email` (lower-cased, at most 50). The choice and the list are
  read and written through `GET/PUT /collections/:id/share/access`, a route of
  their own, so the share-state response that cached bundles parse strictly does
  not change.
- A viewer opens the link, enters an email, and gets a 6-digit code by mail. The
  code is single use, lasts 10 minutes and allows five tries. It is stored in
  `share_code` only as a per-row salted scrypt hash (a 6-digit code is too small
  for a plain hash to survive a leaked row), and compared in constant time.
- A right code earns a **viewer session**: 192 random bits sent as the
  `X-Viewer-Session` header, stored in `share_viewer_session` as a SHA-256 hash,
  good for 12 hours for that one collection. It is a row, not a signed token, so
  it can end the moment the owner removes the address, makes the share open to
  anyone, or turns the link off; no new secret has to be configured.
- `GET /shared/:token` on a private share without a valid session answers
  `FORBIDDEN`, not `UNAUTHENTICATED`: the web client treats the latter as a
  signed-out owner and would end a real session. The body names nothing of the
  collection. The groups the owner shares still decide what a verified viewer sees.
- No enumeration. `POST /shared/:token/code` always answers the same empty
  success and does the same work (a code is made and hashed) whether the address
  is listed or not, and whether the link is unknown, off or open to anyone; it
  mails only listed addresses. `POST /shared/:token/verify` answers every failure
  with the same `FORBIDDEN` and hashes a code even when there is none to check.
  Rate limits count before the list is read: per IP, per link-and-address, and an
  hourly cap on all code mail (past it mail is dropped and logged, never
  signalled).
- Mail goes through `apps/api/src/sharing/send-viewer-code.ts`, a sibling of the
  owner notifier on the same fixed Resend host, allowlisted in `eslint.config.js`.
  The mail names no collection or owner. When Resend is not configured (and not
  `NODE_ENV=test`) the owner cannot turn a private share on (`UPSTREAM`).
- Nothing about an address or a code is logged. Expired codes and sessions are
  deleted on the next code or verify request; used codes are deleted at once.

## Consequences

- Migration 0009 is additive: a column with a default and three new tables, so the
  previous image runs on the new schema.
- **Rollback caveat.** Do not roll the image back below this release while any
  share is private: the old public page does not know `share_private` and would
  show those collections to anyone with the link. Turn private shares off first.
- The code-request limits live in process memory like the other limiters
  (`shortcut:` in `rate-limit.ts`); the viewer-session and code rows are in Postgres.
- A viewer who loses the session asks for a new code; there is no account and no
  password to recover.
- The export does not include the allowed list.
