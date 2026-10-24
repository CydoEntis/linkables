# Deploy

Production runs on an OVHcloud VPS (x86_64, Ubuntu 26.04, `40.160.103.45` and
`2604:2dc0:101:200::3b68`) at `https://linkables.app` (ADR-0005). The owner's
Raspberry Pi, over Tailscale, was the earlier private host. Turn its copy off so
it is not a second production writer:
`sudo systemctl disable --now linkables-update.timer && cd /srv/linkables && sudo docker compose down`,
then `sudo tailscale serve reset`.

```
push to main → CI: verify, e2e, image smoke test
             → publish: migrate Supabase, build web, push amd64+arm64 images to GHCR
server timer (every 5 min) → docker compose pull && up -d
host Caddy (HTTPS :443) → web container 127.0.0.1:8080 (Caddy)
                            ├─ /api/*, /health → api container :3000
                            └─ everything else → the built SPA
```

CI never connects to the server; it only publishes images, and the server pulls
them. The server will also host other static sites, each one more site block in
the host's Caddyfile.

## One-time server setup

Run on the server as a user with sudo.

1. **SSH.** Key-only login. `/etc/ssh/sshd_config.d/00-hardening.conf`:
   ```
   PasswordAuthentication no
   KbdInteractiveAuthentication no
   PermitRootLogin no
   ```
2. **Firewall.** ufw allows only OpenSSH, `80/tcp`, `443/tcp` and `443/udp`
   (HTTP/3).
3. **Updates.** `unattended-upgrades` is on.
4. **Docker.** Docker and compose v2 from Ubuntu's own packages.
5. **Caddy.** Installed on the host from Caddy's official apt repository. It
   owns ports 80 and 443 and gets certificates automatically. One site block
   per domain in `/etc/caddy/Caddyfile`:
   ```
   linkables.app {
   	encode zstd gzip
   	reverse_proxy 127.0.0.1:8080
   }

   www.linkables.app {
   	redir https://linkables.app{uri} permanent
   }
   ```
   Then `sudo systemctl reload caddy`.
6. **Stack folder.** Copy `deploy/docker-compose.yml` to `/srv/linkables/`, and
   write `/srv/linkables/.env` from `deploy/.env.production.example`
   (`chmod 600`).
7. **Registry login.** The images are private. Create a GitHub classic token
   with only `read:packages`, then:
   ```sh
   sudo docker login ghcr.io -u <github-user> --password-stdin
   ```
   (`sudo`, because the update timer runs as root.)
8. **Update timer.**
   ```sh
   sudo cp deploy/linkables-update.service deploy/linkables-update.timer /etc/systemd/system/
   sudo systemctl daemon-reload
   sudo systemctl enable --now linkables-update.timer
   ```

## DNS

At Porkbun, for both `linkables.app` and `www.linkables.app` (the `www` block
needs its own records to get a certificate):

- `A` → `40.160.103.45`
- `AAAA` → `2604:2dc0:101:200::3b68`

Keep Resend's records (`resend._domainkey`, `send`, `rsend`); sign-in email
depends on them.

## GitHub settings

- Variable `APP_ORIGIN`: `https://linkables.app`
- Variable `IOS_SHORTCUT_URL` (optional): the iCloud link to the Shortcut.
- Secret `MIGRATION_DATABASE_URL`: Supabase's session pooler URL (port 5432).
- Secrets `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`: the production project's
  URL and public anon key, baked into the web build.

## Supabase

Authentication → URL Configuration: Site URL `https://linkables.app`, and add
`https://linkables.app/**` to Redirect URLs.

## Google OAuth

Nothing to change for a new app origin. Google only sees Supabase's callback
(`https://<project-ref>.supabase.co/auth/v1/callback`) as the redirect URI; the
app's own address is checked by Supabase's Redirect URLs above.

## Day to day

- Deploy: merge to main. The server runs it within about 5 minutes of CI
  finishing.
- Force an update now: `sudo systemctl start linkables-update.service`
- Logs: `cd /srv/linkables && docker compose logs -f api`
- Roll back: pin `image:` in `/srv/linkables/docker-compose.yml` to a commit
  SHA tag (`ghcr.io/cydoentis/linkables-api:<sha>`) and run the update service.
- Add another site: add its site block to `/etc/caddy/Caddyfile` and run
  `sudo systemctl reload caddy`.
- shortcut: the server does not pick up changes to `deploy/docker-compose.yml`;
  copy it to `/srv/linkables/` by hand when it changes.
