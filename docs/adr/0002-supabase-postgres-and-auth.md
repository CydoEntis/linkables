# ADR-0002: Supabase for Postgres and Auth; authorization lives only in the API

**Status:** superseded by [ADR-0009](0009-self-hosted-sqlite-local-accounts.md) for the self-hosted target. Historical decision follows.

## Problem

The app needs Postgres, sign-in that works from the web app, the extension and
the PWA, and somewhere to keep thumbnails. The owner is a solo developer, so
operational load matters more than vendor independence. The web app ships
Supabase's public (anon) key, so any second route into the data must be closed.

## Options

1. **Supabase: Postgres + Auth (chosen).** Managed Postgres, managed sign-in, token
   refresh.
2. **Self-hosted Postgres + managed auth (Clerk or similar).** Keeps auth portable,
   adds a second vendor.
3. **Supabase for everything, including fetching in edge functions.** Rejected for
   the fetcher: SSRF checks, redirect limits and tests are harder in that runtime.
   See ADR-0003.
4. **Supabase Storage for thumbnails.** Deferred: the MVP only needs thumbnail
   URLs. The brief asks for object storage only where justified.

## Decision

Option 1. Supabase provides Postgres and Auth. The Node API performs all metadata
fetching and any server-side calls. Thumbnails are stored as remote URLs. No
Supabase Storage in the MVP.

**Token verification.** The API verifies Supabase access tokens itself.
The project signs access tokens with an asymmetric key (ES256 or RS256): the
default for projects created since 2025-10-01; older projects use Settings > JWT
Keys > Migrate JWT secret, then Rotate keys. The JWKS endpoint returns no keys
while only the legacy HS256 secret is in use. The API checks the signature against
`https://<ref>.supabase.co/auth/v1/.well-known/jwks.json` with `jose`
(`createRemoteJWKSet` + `jwtVerify`, which caches keys and refetches on an unknown
`kid`; `hono/jwk` refetches the JWKS on every request), with `algorithms` limited
to the project's signing algorithm, plus `iss = https://<ref>.supabase.co/auth/v1`,
`aud = authenticated` and `exp`. `sub` is the user id. The extension's token flow
is a Phase 2 ticket.

**Authorization.** Authorization lives only in the API. The API connects with the
postgres role through Drizzle. The **Supabase Data API is disabled**. As a
backstop, RLS is enabled on every table in `public` with no policies. The browser
uses supabase-js only for Auth.

**Database access.** Runtime: `postgres-js` + Drizzle over the Supavisor shared
pooler with `prepare: false`, so it works in transaction mode. Migrations:
`drizzle-kit` over the session pooler, because the direct connection is IPv6-only
without the paid add-on. `user_id` is a plain `uuid` equal to the JWT `sub`, with
**no foreign key to `auth.users`**, so plain Postgres can run integration tests in
CI.

**Sign-in.** Phase 1 leads with Google sign-in through Supabase Auth, because
single-use magic links get spent by iPhone link previews and in-app browsers. An
email magic link stays as the fallback, sent through Resend SMTP as
noreply@linkables.app.

## Reasoning

- Postgres is portable: plain SQL, Drizzle migrations, pg_dump for backup.
- Verifying tokens in the API keeps all access rules in one tested place.
- Closing the Data API removes the only other route to the tables.

## Tradeoffs

- Auth is the main lock-in; moving off it means re-issuing tokens and sign-ins.
- Remote thumbnails can break or leak referrers. Caching them is a later decision.

## Revisit when

- Auth needs a provider Supabase does not offer.
- Thumbnail or file storage becomes a real requirement.

## Sources (verified 2026-10-21 against Supabase docs)

JWT guide (JWKS, claims), Drizzle guide (Data API can be turned off), Connecting
guide (direct connection IPv6-only; shared pooler IPv4), SMTP guide (default SMTP
delivers to team addresses only).
