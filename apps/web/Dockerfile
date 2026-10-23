# Serves the built SPA and proxies the API on one origin, so the browser
# never makes a cross-origin call. TLS is added in front by Tailscale.
# Build `apps/web/dist` first, then from the repo root:
#   docker build -f apps/web/Dockerfile .
FROM caddy:2.10-alpine
COPY apps/web/Caddyfile /etc/caddy/Caddyfile
COPY apps/web/dist /srv
