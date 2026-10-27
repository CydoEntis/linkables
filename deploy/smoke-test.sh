#!/usr/bin/env bash
set -euo pipefail

image="${1:?supply an API image}"
name="linkables-smoke-$$"
volume="$name-data"
port="${SMOKE_PORT:-3999}"
origin="http://127.0.0.1:$port"
cookie="$(mktemp)"
cleanup() {
  docker rm -f "$name" >/dev/null 2>&1 || true
  docker volume rm "$volume" >/dev/null 2>&1 || true
  rm -f "$cookie"
}
trap cleanup EXIT
docker volume create "$volume" >/dev/null

start() {
  docker run -d --name "$name" -p "127.0.0.1:$port:3000" -v "$volume:/data" \
    -e NODE_ENV=production -e "APP_ORIGIN=$origin" \
    -e AUTH_SECRET=smoke-only-secret-not-for-any-real-instance \
    -e "DATABASE_URL=file:/data/$1" -e WORKER_ENABLED=false "$image" >/dev/null
  for _ in $(seq 1 30); do
    if curl -fsS "$origin/health" >/dev/null 2>&1; then return; fi
    sleep 1
  done
  docker logs "$name"
  echo "API never became healthy" >&2
  exit 1
}

start linkables.db
[ "$(curl -s -o /dev/null -w '%{http_code}' "$origin/api/v1/links")" = 401 ]
printf '%s' 'smoke-password-only-12345' | docker exec -i "$name" node_modules/.bin/tsx src/auth/user-cli.ts --email smoke@example.test --name Smoke
curl -fsS -c "$cookie" -H "Origin: $origin" -H 'Content-Type: application/json' \
  -d '{"email":"smoke@example.test","password":"smoke-password-only-12345"}' "$origin/api/v1/auth/sign-in" >/dev/null
curl -fsS -b "$cookie" -H 'Content-Type: application/json' \
  -d '{"url":"https://example.com/smoke"}' "$origin/api/v1/links" >/dev/null
docker exec "$name" node_modules/.bin/tsx src/maintenance/cli.ts backup-current /data/backup.db
docker exec "$name" node_modules/.bin/tsx src/maintenance/cli.ts restore /data/backup.db /data/restored.db
docker rm -f "$name" >/dev/null
start restored.db
curl -fsS -b "$cookie" "$origin/api/v1/links" | grep -q 'https://example.com/smoke'
docker exec "$name" node_modules/.bin/tsx src/maintenance/cli.ts backup-current /data/after-restore-backup.db
echo 'Fresh install, local sign-in, save, online backup and restored-session checks passed.'
