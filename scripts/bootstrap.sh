#!/usr/bin/env sh
set -eu
ROOT=$(CDPATH='' cd -- "$(dirname -- "$0")/.." && pwd)
cd "$ROOT/backend"
uv sync --frozen
uv run python "$ROOT/scripts/bootstrap_env.py"
cd "$ROOT"
docker compose up -d --wait db redis
cd "$ROOT/backend"
uv run alembic upgrade head
uv run python -m app.bootstrap
cd "$ROOT/frontend"
npm ci --cache "$ROOT/.local/npm-cache" --no-audit --no-fund
printf '%s\n' 'Initialized. Start API and frontend using README. Credentials remain in local .env.'
