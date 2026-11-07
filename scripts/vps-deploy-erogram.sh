#!/usr/bin/env bash
# Zero-downtime deploy for erogramx.com on the DigitalOcean VPS.
#
# NEVER build inside the live folder. Next.js deletes .next at the start of
# a build. This site is served from that folder, so a live-folder build takes
# the public site down for the whole compile (and leaves it dead if compile fails).
#
# Flow: fetch + build in /root/erogram-build → swap .next → restart `erogram`
# (the process nginx sends to port 3941) → health-check JS chunks → rollback
# if the new version is broken.
#
# Run on the VPS: bash scripts/vps-deploy-erogram.sh

set -euo pipefail

LIVE_DIR="${APP_DIR:-$(cd "$(dirname "$0")/.." && pwd)}"
BUILD_DIR="${EROGRAM_BUILD_DIR:-${LIVE_DIR}-build}"
PM2_APP="${EROGRAM_PM2_APP:-erogram}"
HEALTH_HOST="${EROGRAM_HEALTH_HOST:-erogramx.com}"
HEALTH_PORT="${EROGRAM_HEALTH_PORT:-3941}"

cd "$LIVE_DIR"

echo "==> Erogram deploy"
echo "    live:  $LIVE_DIR"
echo "    build: $BUILD_DIR"

if [[ ! -f "$LIVE_DIR/.env" ]]; then
  echo "ERROR: missing .env in $LIVE_DIR"
  exit 1
fi

if command -v nvm >/dev/null 2>&1; then
  # shellcheck disable=SC1090
  source "$NVM_DIR/nvm.sh" 2>/dev/null || true
  nvm use 20 2>/dev/null || nvm install 20
fi

restart_live() {
  if pm2 describe "$PM2_APP" >/dev/null 2>&1; then
    pm2 restart "$PM2_APP" --update-env
    return
  fi
  echo "ERROR: pm2 app '$PM2_APP' not found. nginx proxies erogramx.com to :$HEALTH_PORT."
  pm2 list
  exit 1
}

health_ok() {
  local html chunk chunk_code
  html="$(curl -sS --max-time 20 \
    -H "Host: $HEALTH_HOST" -H "X-Forwarded-Proto: https" \
    "http://127.0.0.1:${HEALTH_PORT}/" || true)"
  if ! printf '%s' "$html" | grep -q "Best Porn Telegram"; then
    echo "    health: homepage HTML missing expected title"
    return 1
  fi
  if printf '%s' "$html" | grep -q 'id="__next_error__"'; then
    echo "    health: Next.js error page"
    return 1
  fi
  chunk="$(printf '%s' "$html" | grep -oE '/_next/static/chunks/[^"[:space:]]+\.js' | head -1 || true)"
  if [[ -z "$chunk" ]]; then
    echo "    health: no JS chunk in homepage HTML"
    return 1
  fi
  chunk_code="$(curl -sS -o /tmp/erogram-chunk-check --max-time 15 -w '%{http_code}' \
    -H "Host: $HEALTH_HOST" "http://127.0.0.1:${HEALTH_PORT}${chunk}" || echo 000)"
  if [[ "$chunk_code" != "200" ]]; then
    echo "    health: chunk ${chunk} HTTP ${chunk_code}"
    return 1
  fi
  if grep -q "Internal Server Error" /tmp/erogram-chunk-check 2>/dev/null; then
    echo "    health: chunk body is Internal Server Error"
    return 1
  fi
  echo "    health: homepage + ${chunk} OK"
  return 0
}

echo "==> fetch origin/main (live files stay as they are)"
git fetch origin main

if [[ ! -d "$BUILD_DIR/.git" ]]; then
  echo "==> clone build directory (first run only)"
  git clone --branch main "$(git remote get-url origin)" "$BUILD_DIR"
fi

echo "==> update build directory to origin/main"
git -C "$BUILD_DIR" fetch origin main
git -C "$BUILD_DIR" reset --hard origin/main

echo "==> copy env into build directory"
cp -a "$LIVE_DIR/.env" "$BUILD_DIR/.env"
if [[ -f "$LIVE_DIR/.env.production" ]]; then
  cp -a "$LIVE_DIR/.env.production" "$BUILD_DIR/.env.production"
fi
if [[ -f "$LIVE_DIR/.env.production.local" ]]; then
  cp -a "$LIVE_DIR/.env.production.local" "$BUILD_DIR/.env.production.local"
fi

echo "==> npm ci in build directory (live node_modules untouched)"
git -C "$BUILD_DIR" submodule update --init --recursive 2>/dev/null || true
npm --prefix "$BUILD_DIR" ci

echo "==> production build in $BUILD_DIR (live .next untouched)"
export EROGRAM_SKIP_TYPECHECK=1
export NODE_OPTIONS="${NODE_OPTIONS:---max-old-space-size=2048}"
npm --prefix "$BUILD_DIR" run build

if [[ ! -f "$BUILD_DIR/.next/BUILD_ID" ]]; then
  echo "ERROR: build finished without .next/BUILD_ID — live site not touched"
  exit 1
fi

PREV_SHA="$(git rev-parse HEAD)"
OLD_LOCK="$(md5sum "$LIVE_DIR/package-lock.json" | awk '{print $1}')"

echo "==> update live source (not .next)"
git reset --hard origin/main
NEW_LOCK="$(md5sum "$LIVE_DIR/package-lock.json" | awk '{print $1}')"

echo "==> swap compiled app"
rm -rf "$LIVE_DIR/.next.bak"
if [[ -d "$LIVE_DIR/.next" ]]; then
  mv "$LIVE_DIR/.next" "$LIVE_DIR/.next.bak"
fi
mv "$BUILD_DIR/.next" "$LIVE_DIR/.next"

if [[ "$OLD_LOCK" != "$NEW_LOCK" ]]; then
  echo "==> package-lock changed — sync node_modules from the build we just compiled"
  rsync -a --delete "$BUILD_DIR/node_modules/" "$LIVE_DIR/node_modules/"
fi

echo "==> restart $PM2_APP (port $HEALTH_PORT)"
restart_live

echo "==> health check"
ok=0
for i in 1 2 3 4 5 6 7 8; do
  sleep 3
  if health_ok; then
    ok=1
    break
  fi
  echo "    retry $i/8"
done

if [[ "$ok" != "1" ]]; then
  echo "ERROR: new version failed health check — rolling back"
  rm -rf "$LIVE_DIR/.next"
  if [[ -d "$LIVE_DIR/.next.bak" ]]; then
    mv "$LIVE_DIR/.next.bak" "$LIVE_DIR/.next"
  fi
  git reset --hard "$PREV_SHA"
  restart_live
  sleep 3
  health_ok || echo "WARNING: rollback is up but health check still unhappy — check pm2 logs"
  exit 1
fi

rm -rf "$LIVE_DIR/.next.bak"
echo "==> live SHA $(git rev-parse --short HEAD) — done"
