# Publishing the self-hosted extensions

The self-hosted release uses local email/password accounts and a server address
chosen by the user. It does not use Supabase, Google sign-in, or an emailed
sign-in code. Do not upload the old hosted-service package or reuse screenshots
that show its authentication flow.

## Chrome Web Store

1. Bump the version in package.json for a new release.
2. Run `pnpm --filter extension release:store` from the repository root.
3. Upload release/linkables-chrome-store-VERSION.zip in the publisher dashboard.
4. Describe this as a client for a user-operated Linkables server. Installation
   is free; users supply the server and any private-network access themselves.
5. Declare the permissions in the generated manifest. Required permissions cover
   explicit tab actions, extension storage, the side panel, and context menus.
   Server hosts and the follow-tabs permission are requested only when needed.
6. Provide reviewers a reachable test instance and a local account. A server
   accessible only through the owner's Tailscale cannot serve as a public review
   environment.
7. Check privacy disclosures and replace old hosted-service screenshots before
   submitting.

The store assigns its own extension id. Configure that exact
chrome-extension:// origin in the self-hosted server's CORS_ORIGINS.
The unpacked development build keeps its separate committed public key and id.

The app links to its installation guide until a compatible store release exists.
Store approval is separate from producing a working package.

## Firefox

Run `pnpm --filter extension release:firefox` to build and lint the Firefox
package. Run `pnpm --filter extension release:firefox:source` to create an
unsigned source ZIP for temporary installation and inspection.

A persistent installation in ordinary Firefox needs a Mozilla-signed release.
The existing `sign:firefox` script reads WEB_EXT_API_KEY and WEB_EXT_API_SECRET
from the environment; never commit these credentials. Mozilla accepts each
version only once. Signing generates a new XPI and can copy it into the web
public/downloads directory for distribution.

Do not serve an unsigned source ZIP as an installable XPI, or distribute the old
hosted-service signed add-on as compatible with the new authentication system.
