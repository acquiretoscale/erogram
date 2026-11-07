#!/usr/bin/env bash
# Simple VPS deploy — same folder as 3 days ago, ~few minutes.
# git pull → build into .next-new (live .next stays until this works) → swap →
# restart `erogram` on port 3941.
# Run on the VPS: bash scripts/vps-deploy-erogram.sh

set -euo pipefail

LIVE_DIR="${APP_DIR:-$(cd "$(dirname "$0")/.." && pwd)}"
PM2_APP="${EROGRAM_PM2_APP:-erogram}"
HEALTH_HOST="${EROGRAM_HEALTH_HOST:-erogramx.com}"
HEALTH_PORT="${EROGRAM_HEALTH_PORT:-3941}"

cd "$LIVE_DIR"

echo "==> Erogram deploy in $LIVE_DIR"

if [[ ! -f .env ]]; then
  echo "ERROR: missing .env in $LIVE_DIR"
  exit 1
fi

if command -v nvm >/dev/null 2>&1; then
  # shellcheck disable=SC1090
  source "$NVM_DIR/nvm.sh" 2>/dev/null || true
  nvm use 20 2>/dev/null || nvm install 20
fi

restart_live() {
  if ! pm2 describe "$PM2_APP" >/dev/null 2>&1; then
    echo "ERROR: pm2 app '$PM2_APP' not found (nginx uses :$HEALTH_PORT)"
    pm2 list
    exit 1
  fi
  pm2 restart "$PM2_APP" --update-env
}

health_ok() {
  local html chunk chunk_code
  html="$(curl -sS --max-time 20 \
    -H "Host: $HEALTH_HOST" -H "X-Forwarded-Proto: https" \
    "http://127.0.0.1:${HEALTH_PORT}/" || true)"
  printf '%s' "$html" | grep -q "Best Porn Telegram" || return 1
  printf '%s' "$html" | grep -q 'id="__next_error__"' && return 1
  chunk="$(printf '%s' "$html" | grep -oE '/_next/static/chunks/[^"[:space:]]+\.js' | head -1 || true)"
  [[ -n "$chunk" ]] || return 1
  chunk_code="$(curl -sS -o /tmp/erogram-chunk-check --max-time 15 -w '%{http_code}' \
    -H "Host: $HEALTH_HOST" "http://127.0.0.1:${HEALTH_PORT}${chunk}" || echo 000)"
  [[ "$chunk_code" == "200" ]] || return 1
  grep -q "Internal Server Error" /tmp/erogram-chunk-check 2>/dev/null && return 1
  echo "    health: homepage + ${chunk} OK"
  return 0
}

echo "==> git fetch/reset origin/main"
OLD_LOCK="$(md5sum package-lock.json | awk '{print $1}')"
PREV_SHA="$(git rev-parse HEAD)"
git fetch origin main
git reset --hard origin/main
NEW_LOCK="$(md5sum package-lock.json | awk '{print $1}')"

if [[ "$OLD_LOCK" != "$NEW_LOCK" ]]; then
  echo "==> npm ci (lockfile changed)"
  npm ci
else
  echo "==> npm ci skipped (lockfile unchanged)"
fi

echo "==> build into .next-new (live .next stays until this succeeds)"
rm -rf .next-new
export EROGRAM_SKIP_TYPECHECK=1
export NEXT_DIST_DIR=.next-new
export NODE_OPTIONS="${NODE_OPTIONS:---max-old-space-size=2048}"
npm run build

if [[ ! -f .next-new/BUILD_ID ]]; then
  echo "ERROR: build produced no .next-new — live site not swapped"
  exit 1
fi

echo "==> swap .next and restart $PM2_APP"
rm -rf .next.bak
if [[ -d .next ]]; then
  mv .next .next.bak
fi
mv .next-new .next
restart_live

echo "==> health check"
ok=0
for i in 1 2 3 4 5 6; do
  sleep 2
  if health_ok; then
    ok=1
    break
  fi
  echo "    retry $i/6"
done

if [[ "$ok" != "1" ]]; then
  echo "ERROR: new version failed health check — rolling back"
  rm -rf .next
  if [[ -d .next.bak ]]; then
    mv .next.bak .next
  fi
  git reset --hard "$PREV_SHA"
  restart_live
  exit 1
fi

rm -rf .next.bak
echo "==> live SHA $(git rev-parse --short HEAD) — done"
