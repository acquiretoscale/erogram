#!/usr/bin/env bash
# Run from Mac after SSH key is on the VPS (see vps-install.sh header).
set -euo pipefail

VPS="${TGEMPIRE_VPS:-root@146.190.137.231}"
SSH_KEY="${TGEMPIRE_SSH_KEY:-$HOME/.ssh/erogram_vps}"
ENV_SRC="${TGEMPIRE_ENV:-/Users/themaf/Desktop/ErogramPRO-scratch/tgempire-app/.env.local}"
REMOTE_DIR="${TGEMPIRE_REMOTE_DIR:-/root/erogram/tg-manager}"

SSH=(ssh -i "$SSH_KEY" -o BatchMode=yes "$VPS")
SCP=(scp -i "$SSH_KEY" -o BatchMode=yes)

echo "==> 1/3 git pull on VPS"
"${SSH[@]}" 'cd ~/erogram && git pull'

echo "==> 2/3 copy .env.local"
if [[ ! -f "$ENV_SRC" ]]; then
  echo "ERROR: missing $ENV_SRC"
  exit 1
fi
"${SCP[@]}" "$ENV_SRC" "${VPS}:${REMOTE_DIR}/.env.local"

echo "==> 3/3 vps-install.sh"
"${SSH[@]}" "cd ${REMOTE_DIR} && bash scripts/vps-install.sh"

echo ""
echo "Done. Tunnel: ssh -i $SSH_KEY -L 3002:127.0.0.1:3942 $VPS"
echo "Open: http://127.0.0.1:3002"
