#!/usr/bin/env bash
# Paste into DigitalOcean Droplet → Access → Launch Console (as root).
# Restores deploy SSH key + runs the latest fix from GitHub.

set -euo pipefail

PUB='ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAICYPtZfxIM/tmYij45f9wVO+5NDofySZtlqE12Im+sWa cursor-deploy-erogram'

mkdir -p /root/.ssh
chmod 700 /root/.ssh
grep -qF 'cursor-deploy-erogram' /root/.ssh/authorized_keys 2>/dev/null || echo "$PUB" >> /root/.ssh/authorized_keys
chmod 600 /root/.ssh/authorized_keys

APP_DIR="${APP_DIR:-/root/erogram}"
if [ ! -d "$APP_DIR/.git" ]; then
  apt-get update -qq && apt-get install -y -qq git
  git clone https://github.com/acquiretoscale/erogram.git "$APP_DIR"
fi

cd "$APP_DIR"
git fetch origin main
git reset --hard origin/main
bash scripts/vps-deploy-erogram.sh

echo "Bootstrap + deploy finished."
