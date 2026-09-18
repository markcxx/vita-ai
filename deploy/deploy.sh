#!/bin/sh
set -eu
APP_DIR=/opt/vitaai
RELEASE="${1:?Usage: deploy.sh <40-character commit SHA>}"
case "$RELEASE" in *[!a-f0-9]*|'') echo 'Invalid release SHA' >&2; exit 1;; esac
[ "${#RELEASE}" -eq 40 ] || exit 1
cd "$APP_DIR"
[ -f .env.production ] || { echo 'Missing production environment' >&2; exit 1; }
# Prevent concurrent manual / CI deployments.
exec 9>deploy.lock
flock -n 9 || { echo 'Another deployment is running' >&2; exit 1; }
compose() {
  version="$1"
  shift
  VITAAI_FRONTEND_IMAGE="ghcr.io/markcxx/vita-ai-frontend:$version" \
  VITAAI_BACKEND_IMAGE="ghcr.io/markcxx/vita-ai-backend:$version" \
  docker compose --project-name vitaai --file compose.yaml "$@"
}
previous="$(cat current-release 2>/dev/null || true)"
compose "$RELEASE" pull
if ! compose "$RELEASE" up -d --wait --wait-timeout 180 --remove-orphans; then
  echo 'Release unhealthy; restoring previous release' >&2
  if [ -n "$previous" ]; then
    [ ! -d previous-config ] || cp previous-config/compose.yaml previous-config/nginx.conf .
    compose "$previous" up -d --wait --wait-timeout 180 --remove-orphans
  fi
  exit 1
fi
printf '%s\n' "$RELEASE" > current-release
printf 'VITAAI_FRONTEND_IMAGE=ghcr.io/markcxx/vita-ai-frontend:%s\nVITAAI_BACKEND_IMAGE=ghcr.io/markcxx/vita-ai-backend:%s\n' "$RELEASE" "$RELEASE" > .env
chmod 600 .env
mkdir -p previous-config
cp compose.yaml nginx.conf previous-config/
echo "VitaAI $RELEASE is healthy on 127.0.0.1:3003"
