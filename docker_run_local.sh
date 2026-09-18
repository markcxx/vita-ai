#!/bin/sh
set -eu

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
ENV_PATH="$SCRIPT_DIR/.env"

fail() {
  echo "[deploy] ERROR: $*" >&2
  exit 1
}

command -v docker >/dev/null 2>&1 || fail "Docker is not installed or not available in PATH."
[ -f "$ENV_PATH" ] || fail "Missing $ENV_PATH. Copy .env.example to .env and configure it first."

echo "[deploy] Building and starting frontend, backend, and gateway ..."
docker compose --project-directory "$SCRIPT_DIR" up --build --detach --wait

echo "[deploy] Application: http://127.0.0.1:3000"
echo "[deploy] Backend health: http://127.0.0.1:3000/api/v1/health/ready"
