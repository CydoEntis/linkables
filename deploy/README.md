# Deploy

Production runs on the owner's Raspberry Pi (arm64, Ubuntu), reachable only
over Tailscale at `https://linkables.taild1b88b.ts.net` (ADR-0005).

```
push to main → CI: verify, e2e, image smoke test
             → publish: migrate Supabase, build web, push arm64 images to GHCR
Pi timer (every 5 min) → docker compose pull && up -d
Tailscale serve (HTTPS :443) → web container :8080 (Caddy)
                                 ├─ /api/*, /health → api container :3000
                                 └─ everything else → the built SPA
```

Nothing on the internet connects to the Pi. CI only publishes images; the Pi
pulls them.

## One-time server setup

Run on the Pi as a user with sudo.

1. **Tailscale HTTPS.** MagicDNS and HTTPS Certificates on in the Tailscale
   admin (DNS page), then:
   ```sh
   sudo tailscale serve --bg --https=443 http://127.0.0.1:8080
   ```
2. **Stack folder.** Copy `deploy/docker-compose.yml` to `/srv/linkaroo/`, and
   write `/srv/linkaroo/.env` from `deploy/.env.production.example`
   (`chmod 600`).
3. **Registry login.** The images are private. Create a GitHub classic token
   with only `read:packages`, then:
   ```sh
   sudo docker login ghcr.io -u <github-user> --password-stdin
   ```
   (`sudo`, because the update timer runs as root.)
4. **Update timer.**
   ```sh
   sudo cp deploy/linkaroo-update.service deploy/linkaroo-update.timer /etc/systemd/system/
   sudo systemctl daemon-reload
   sudo systemctl enable --now linkaroo-update.timer
   ```

## GitHub settings

- Variable `APP_ORIGIN`: `https://linkables.taild1b88b.ts.net`
- Variable `IOS_SHORTCUT_URL` (optional): the iCloud link to the Shortcut.
- Secret `MIGRATION_DATABASE_URL`: Supabase's session pooler URL (port 5432).
- Secrets `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`: the production project's
  URL and public anon key, baked into the web build.

## Supabase

Authentication → URL Configuration: Site URL `https://linkables.taild1b88b.ts.net`,
and add `https://linkables.taild1b88b.ts.net/**` to Redirect URLs.

## Day to day

- Deploy: merge to main. The Pi runs it within about 5 minutes of CI finishing.
- Force an update now: `sudo systemctl start linkaroo-update.service`
- Logs: `cd /srv/linkaroo && docker compose logs -f api`
- Roll back: pin `image:` in `/srv/linkaroo/docker-compose.yml` to a commit
  SHA tag (`ghcr.io/cydoentis/linkables-api:<sha>`) and run the update service.
- shortcut: the Pi does not pick up changes to `deploy/docker-compose.yml`;
  copy it to `/srv/linkaroo/` by hand when it changes.
