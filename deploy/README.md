# Operate a self-hosted instance

Start with the installation steps in the [README](../README.md). Commands below
run from your source checkout. One API process serves requests and runs the
metadata worker. Caddy serves the web app and proxies the API on the same origin.

## Set the external address

Set `APP_ORIGIN` in `.env` to the exact origin people open. The web build discovers
its API from the current origin; it contains no instance credentials or hostname.

### Use Tailscale HTTPS

Install Tailscale on the host and client devices. Join them to your own tailnet.
Find the host's `*.ts.net` name in `tailscale status` and set, for example:

```dotenv
APP_ORIGIN=https://your-host.your-tailnet.ts.net
```

Recreate the API after changing `.env`, then enable private HTTPS:

```sh
docker compose up -d
sudo tailscale serve --bg http://127.0.0.1:8080
```

Serve uses your tailnet's HTTPS setup and may ask you to enable it. This does not
make the service public. Do not enable Tailscale Funnel for a private instance.
Users still need Linkables accounts for personal libraries. An owner can share a
read-only collection by URL with another device that can reach the instance.

### Use a public reverse proxy

Keep the Docker port bound to loopback. Point your domain at the host and proxy
HTTPS to `127.0.0.1:8080`. A host Caddy configuration can use:

```caddyfile
links.example.com {
    reverse_proxy 127.0.0.1:8080
}
```

Never expose the API container or SQLite volume directly. `TRUST_PROXY=false` is
the default. Change it only when your trusted proxy overwrites `X-Real-IP`, the
API cannot be reached through another path, and you have verified the proxy chain.
The default Caddy container does not trust incoming forwarded-IP headers.

## Manage accounts

Account creation and password resets run on the server. Neither needs SMTP.
Pass the password through stdin, as in the README. To reset a password, use:

```sh
read -rsp 'New password (12+ characters): ' LINKABLES_PASSWORD; printf '\n'
printf '%s' "$LINKABLES_PASSWORD" | docker compose exec -T api node_modules/.bin/tsx src/auth/user-cli.ts --reset --email you@example.com
unset LINKABLES_PASSWORD
```

A reset revokes all sessions for that account. It also establishes the first local
password for a migrated Google or email-code account while preserving its user ID.
Do not pass passwords as command arguments or commit them to configuration files.

## Back up and restore

Backups contain personal libraries and local password hashes. Keep them private
and copy them to another device. Back up `.env` separately, especially `AUTH_SECRET`.

Prepare the backup mount once so the container's `node` user can write it:

```sh
mkdir -p backups
docker compose exec --user root api chown node:node /backups
docker compose exec --user root api chmod 700 /backups
```

Create a new snapshot without stopping the app:

```sh
docker compose exec api node_modules/.bin/tsx src/maintenance/cli.ts backup /data/linkables.db /backups/library-2026-10-27.db
```

Use a new filename for each backup. The command refuses existing destinations,
includes committed WAL pages, checks database integrity and foreign keys, and
publishes the result only after validation. Copy the snapshot off the host. On a
host where your UID differs from the container's UID 1000, use Docker to copy it
to a directory you own:

```sh
docker compose cp api:/backups/library-2026-10-27.db ./library-offsite.db
```

Rehearse restoration into a new database before replacing a live file:

```sh
docker compose exec api node_modules/.bin/tsx src/maintenance/cli.ts restore /backups/library-2026-10-27.db /data/restored.db
docker compose exec api node_modules/.bin/tsx src/maintenance/cli.ts check /data/restored.db
```

To use the restored database, stop the app and change the compose `DATABASE_URL`
to `file:/data/restored.db`, then recreate the API. Keep the original database
until sign-in, link counts, collections, search, and a test save all work. A
restored session works only with the corresponding auth secret and an unexpired
session; users can sign in again if needed.

Do not overwrite an active database, copy its live WAL and database separately,
or restore over an existing file. The tools deliberately require a new path.

## Upgrade and roll back

1. Make a verified backup and save the current source commit and `.env`.
2. Check out the release you want to run.
3. Run `docker compose up -d --build`.
4. Check `docker compose ps`, sign in, and exercise saving and search.

The API applies pending SQLite migrations before listening. For a rollback across
an incompatible migration, restore the matching database backup to a new path
and run the previous source release. Do not expect an old image to understand a
new schema. No CI job migrates your database remotely or updates your instance.

## Optional mail

Private collection shares that verify a recipient's email need a configured mail
provider. The current adapter uses Resend. Personal accounts, link saving, public
token shares, and account deletion work without it. Setting `RESEND_API_KEY`
and `MAIL_FROM` enables viewer mail. `MAIL_FROM` is a plain sender email address
on a domain you verify with Resend. Set `OWNER_EMAIL` as well to receive access
requests and optional account-deletion notices. There are no default sender or
owner addresses. An existing private share never becomes
public because mail is unavailable.

## Operations

```sh
docker compose logs -f api
docker compose ps
docker compose stop
```

The default log driver rotates logs. SQLite belongs on local disk, not an NFS
share. Run one API container against a database file. The default compose file
builds locally on ARM64 or AMD64 and needs no registry login.
