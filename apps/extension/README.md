# Linkables for Chrome and Firefox

The free extension connects to a self-hosted Linkables instance. It saves the
current tab, supports pinning and collection/group filing, and includes the
library side panel, sharing controls, right-click saving and quiet-save shortcut.

## Connect

1. Install a matching self-hosted extension release.
2. Open the extension and enter your server's bare HTTPS address.
3. Allow access to that host, then sign in with your local email and password.
4. If the instance is private, connect your device to its Tailscale network first.

The instance address and session are stored in extension storage. Changing the
server clears the prior session and cached library. Tokens are sent only to the
server associated with that session. No Supabase account or build-time keys are
required. HTTP is accepted only for localhost development.

Sign out from the popup or side-panel settings. The side-panel settings also
offer Change server, which disconnects locally even when the old server is
unreachable. This does not revoke the abandoned server session; it expires on
that server normally.

## Build and package

Run from the repository root:

```sh
pnpm --filter extension build
pnpm --filter extension release
pnpm --filter extension release:store
pnpm --filter extension release:firefox
```

Chrome's unpacked build is in apps/extension/dist. Open chrome://extensions,
enable Developer mode and choose Load unpacked. Store packaging omits the
development public key so the store can assign its own identifier.

Firefox's build is in apps/extension/dist-firefox. For development, open
about:debugging, choose This Firefox and Load Temporary Add-on, then select its
manifest.json. Temporary installs end when Firefox restarts. A persistent release
requires Mozilla signing; existing sign:firefox tooling reads WEB_EXT_API_KEY
and WEB_EXT_API_SECRET from the environment. Never commit those credentials.
The previous hosted-service signed artifact is incompatible and is not shipped.

## Permissions and shortcuts

The manifests retain activeTab, storage and contextMenus; Chrome additionally
uses sidePanel. The extension requests access only to the selected server at
connection time. The optional tabs permission enables Follow the tab you're on.

Alt+Shift+L opens the side panel/sidebar. Alt+Shift+S saves the current tab
quietly and reports the result through its toolbar badge. Firefox uses an event
page for the worker and sidebar_action for the panel; Chrome uses a service
worker and side_panel. Both use the same application source.
