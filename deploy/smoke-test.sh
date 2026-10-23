#!/usr/bin/env bash
# Proves an API image boots against a real Postgres and refuses the test-auth
# escape hatch in production. Usage: deploy/smoke-test.sh <image>
# Needs SMOKE_DATABASE_URL pointing at a reachable, empty-or-migrated database.
set -euo pipefail

image="$1"
db="${SMOKE_DATABASE_URL:?set SMOKE_DATABASE_URL}"
port=3999
name="linkables-smoke-$$"

env_args=(
  -e "DATABASE_URL=$db"
  -e "MIGRATION_DATABASE_URL=$db"
  -e "SUPABASE_URL=https://example.supabase.co"
  -e "CORS_ORIGINS=https://app.example.com"
  -e "WORKER_ENABLED=true"
  -e "PORT=$port"
)

cleanup() { docker rm -f "$name" "$name-jwks" >/dev/null 2>&1 || true; }
trap cleanup EXIT

echo "migrating with the image's own drizzle-kit"
docker run --rm --network host "${env_args[@]}" "$image" node_modules/.bin/drizzle-kit migrate

echo "starting the API"
docker run -d --name "$name" --network host "${env_args[@]}" "$image" >/dev/null
for _ in $(seq 1 30); do
  if curl -fsS "http://127.0.0.1:$port/health" >/dev/null 2>&1; then
    echo "health: 200"
    break
  fi
  sleep 1
done
curl -fsS "http://127.0.0.1:$port/health" >/dev/null || { docker logs "$name"; echo "health never answered"; exit 1; }

echo "checking the API refuses AUTH_TEST_JWKS in production"
# Its own port, so a clash with the running container can't fake the failure.
# timeout's 124 means it kept running, which is the failure we're guarding.
status=0
timeout 30 docker run --rm --name "$name-jwks" --network host "${env_args[@]}" -e "PORT=$((port + 1))" \
  -e 'AUTH_TEST_JWKS={"keys":[]}' "$image" || status=$?
if [ "$status" -eq 0 ] || [ "$status" -eq 124 ]; then
  echo "container with AUTH_TEST_JWKS set did not exit non-zero (status $status)"
  exit 1
fi
echo "smoke test passed"
