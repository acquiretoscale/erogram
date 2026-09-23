#!/bin/bash
# Local TGempire scheduler - hits cron every 60s while the app is running
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
SECRET=$(grep -E '^CRON_SECRET=' .env.local | cut -d= -f2- | tr -d '\r')
SECRET=${SECRET:-local-cron}
URL=${TG_CRON_URL:-http://127.0.0.1:${PORT:-3002}/api/cron/post}
LOG=${TG_CRON_LOG:-/tmp/tgempire-cron.log}

echo "[$(date)] TGempire local cron started → $URL" | tee -a "$LOG"
while true; do
  CODE=$(curl -s -o /tmp/tgempire-cron-body.json -w "%{http_code}" \
    -H "Authorization: Bearer ${SECRET}" \
    "$URL" || echo err)
  BODY=$(head -c 400 /tmp/tgempire-cron-body.json 2>/dev/null)
  echo "[$(date)] HTTP $CODE $BODY" >> "$LOG"
  sleep 60
done
