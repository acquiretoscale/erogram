#!/usr/bin/env bash
# TGempire VPS setup — no domain required.
#
# Prereqs on VPS: Node 20+, npm, pm2, git. App listens on 127.0.0.1:3942 only.
#
# Usage (on VPS, after cloning erogram repo):
#   cd ~/erogram/tg-manager
#   cp .env.example .env.local    # fill secrets (or scp your local .env.local)
#   bash scripts/vps-install.sh
#
# Access dashboard from your Mac (SSH tunnel, no public port):
#   ssh -L 3002:127.0.0.1:3942 root@146.190.137.231
#   open http://127.0.0.1:3002
#
set -euo pipefail

APP_DIR="$(cd "$(dirname "$0")/.." && pwd)"
DEPLOY_USER="$(whoami)"
PORT="${TGEMPIRE_PORT:-3942}"
HOST="${TGEMPIRE_HOST:-127.0.0.1}"

echo "==> TGempire VPS install"
echo "    dir:  $APP_DIR"
echo "    user: $DEPLOY_USER"
echo "    bind: $HOST:$PORT"

if [[ ! -f "$APP_DIR/.env.local" ]]; then
  echo "ERROR: $APP_DIR/.env.local missing. Copy from .env.example and fill values."
  exit 1
fi

if ! grep -qE '^CRON_SECRET=.+' "$APP_DIR/.env.local"; then
  echo "ERROR: CRON_SECRET must be set in .env.local (generate: openssl rand -hex 32)"
  exit 1
fi

command -v node >/dev/null || { echo "ERROR: node not found"; exit 1; }
command -v pm2 >/dev/null || { echo "ERROR: pm2 not found (npm i -g pm2)"; exit 1; }

cd "$APP_DIR"
echo "==> npm ci"
npm ci
echo "==> npm run build"
npm run build

echo "==> PM2: tgempire on $HOST:$PORT"
pm2 delete tgempire 2>/dev/null || true
PORT="$PORT" pm2 start ecosystem.config.cjs
pm2 save

# systemd cron loop (needs sudo)
if command -v systemctl >/dev/null; then
  SERVICE=/etc/systemd/system/tgempire-cron.service
  sed -e "s|__DEPLOY_USER__|$DEPLOY_USER|g" \
      -e "s|__APP_DIR__|$APP_DIR|g" \
      "$APP_DIR/scripts/tgempire-cron.service" | sudo tee "$SERVICE" >/dev/null
  sudo touch /var/log/tgempire-cron.log
  sudo chown "$DEPLOY_USER":"$DEPLOY_USER" /var/log/tgempire-cron.log
  sudo systemctl daemon-reload
  sudo systemctl enable --now tgempire-cron.service
  echo "==> systemd tgempire-cron.service enabled"
else
  echo "WARN: systemctl not found — run manually: TG_CRON_URL=http://$HOST:$PORT/api/cron/post bash scripts/local-cron.sh"
fi

# Daily stats snapshot at 08:00 UTC
CRON_SECRET=$(grep -E '^CRON_SECRET=' "$APP_DIR/.env.local" | cut -d= -f2- | tr -d '\r')
STATS_LINE="0 8 * * * curl -sf -H \"Authorization: Bearer ${CRON_SECRET}\" http://${HOST}:${PORT}/api/cron/stats >> /var/log/tgempire-stats.log 2>&1"
( crontab -l 2>/dev/null | grep -v 'api/cron/stats' || true; echo "$STATS_LINE" ) | crontab -
echo "==> crontab: daily stats at 08:00 UTC"

echo ""
echo "Done. TGempire running at http://${HOST}:${PORT} (localhost on VPS)."
echo "Tunnel from Mac:  ssh -L 3002:${HOST}:${PORT} ${DEPLOY_USER}@146.190.137.231"
echo "Then open:        http://127.0.0.1:3002"
echo ""
echo "Logs:  pm2 logs tgempire"
echo "       tail -f /var/log/tgempire-cron.log"
