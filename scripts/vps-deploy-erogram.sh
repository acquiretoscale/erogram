#!/usr/bin/env bash
# Run ON the DigitalOcean VPS (146.190.137.231), inside the Erogram app folder.
# Example: cd ~/erogram && bash scripts/vps-deploy-erogram.sh

set -euo pipefail

APP_DIR="${APP_DIR:-$(cd "$(dirname "$0")/.." && pwd)}"
cd "$APP_DIR"

echo "==> Erogram deploy in $APP_DIR"

if [[ ! -f .env ]]; then
  echo "ERROR: missing .env in $APP_DIR (copy from Vercel production env first)."
  exit 1
fi

# Node 20 (matches .nvmrc)
if command -v nvm >/dev/null 2>&1; then
  # shellcheck disable=SC1090
  source "$NVM_DIR/nvm.sh" 2>/dev/null || true
  nvm use 20 2>/dev/null || nvm install 20
fi

echo "==> git pull"
git pull origin main

echo "==> npm ci"
npm ci

echo "==> build (may take several minutes)"
export NODE_OPTIONS="${NODE_OPTIONS:---max-old-space-size=3072}"
npm run build

echo "==> pm2 restart"
if pm2 describe erogram-v2 >/dev/null 2>&1; then
  pm2 restart erogram-v2 --update-env
elif pm2 describe erogram >/dev/null 2>&1; then
  pm2 restart erogram --update-env
else
  pm2 start ecosystem.config.js
  pm2 save
fi

echo "==> smoke test (Spanish page should NOT be 500)"
sleep 2
CODE=$(curl -s -o /dev/null -w '%{http_code}' 'http://127.0.0.1:3941/es/ainsfw/nudify-biz-undress-ai' \
  -H 'Host: erogramx.com' -H 'X-Forwarded-Proto: https' || true)
echo "    local es/ainsfw HTTP $CODE (want 200)"
if [[ "$CODE" != "200" ]]; then
  echo "WARNING: still not 200 — check pm2 logs and nginx proxy to port 3941."
fi

echo "==> done"
