# Linkables

Save links, organize collections, and find your research later. Linkables is free,
open-source software that you run on your own server or Raspberry Pi.

- Web app and installable mobile web app (PWA).
- Chrome and Firefox extension source with a configurable server address.
- Search, notes, pins, collections, collection groups, and reader mode.
- Read-only collection sharing with controls for which groups appear.
- SQLite and local password accounts. No Supabase account or email service needed.
- Library export, account deletion, database migration, and verified backup tools.

The mobile client is a PWA, not a native App Store or Play Store app. A private
Tailscale instance is reachable only from devices that your tailnet permits.

## Run your own instance

Install Docker Engine with Docker Compose, Git, and a TLS reverse proxy for remote
access. Run these commands in a terminal on your host:

```sh
git clone https://github.com/CydoEntis/linkables.git
cd linkables
cp .env.example .env
```

Set `AUTH_SECRET` in `.env` to a random value of at least 32 characters. Generate
one with `openssl rand -hex 32`. Set `APP_ORIGIN` to your instance's full origin,
such as `https://links.example.com`, without a trailing slash.
The default `DATABASE_URL=file:/data/linkables.db` stores your library in the
persistent data volume. Shipped browser extensions are trusted by default.

```sh
mkdir -p backups
docker compose up -d --build
```

The web server binds to `127.0.0.1:8080`. For a local trial, keep
`APP_ORIGIN=http://localhost:8080` and open that address. For remote access, set up
[Tailscale HTTPS or your own reverse proxy](deploy/README.md).

Create an account from the operator CLI. On a Unix shell, this reads the password
without putting it in shell history:

```sh
read -rsp 'Password (12+ characters): ' LINKABLES_PASSWORD; printf '\n'
printf '%s' "$LINKABLES_PASSWORD" | docker compose exec -T api node_modules/.bin/tsx src/auth/user-cli.ts --email you@example.com --name 'Your name'
unset LINKABLES_PASSWORD
```

Sign in with that email and password. Public registration is disabled. The email
is an account identifier; local sign-in does not send a message.

## Use your phone and browser

Open the same HTTPS instance on your phone and add it to the home screen. Keep
Tailscale connected if your instance is private. Supported Android browsers can
share links into the installed PWA. iPhone saving instructions are in the app's
**Save from anywhere** page.

Open `/extension` on your instance for browser setup. The Chrome zip is available
at `/downloads/linkables-chrome.zip`. Firefox source is at
`/downloads/linkables-firefox-source.zip`; normal Firefox installations require
Mozilla signing before a permanent add-on install. See the
[extension development guide](apps/extension/README.md).

## Keep your data

The `data` Docker volume contains the SQLite database. Back up that volume with
the provided online backup command, and keep a separate protected copy of `.env`
with its auth secret. Do not copy only a running SQLite file or run
`docker compose down -v` unless you intend to delete the library.

Follow [backup and restore](deploy/README.md#back-up-and-restore) before upgrades.
For an existing hosted Linkables installation, follow the
[Postgres migration guide](docs/self-hosting-migration.md).

## Develop

Use Node 24 and the pnpm version declared in `package.json`:

```sh
corepack enable
pnpm install --frozen-lockfile
pnpm verify
```

Tests use temporary SQLite files. No database server or Supabase project is needed.
Copy `apps/api/.env.example` to `apps/api/.env`, configure local auth, and run
`pnpm --filter api dev`. In another terminal, run `pnpm --filter web dev`.

Read [AGENTS.md](AGENTS.md) for code conventions and [the current plan](docs/PLANNING.md)
for scope. Architecture decisions are in [docs/adr](docs/adr/).

## License

Copyright Cody Stine. Linkables is licensed under [AGPL-3.0-only](LICENSE).
Third-party packages, fonts, and assets retain their respective licenses. See
[THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
