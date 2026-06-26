#!/usr/bin/env bash
# Prevents EMFILE (too many open files) when starting Next.js dev.
# Run with: npm run dev (which calls this script)
ulimit -n 65536 2>/dev/null || true

# Kill any lingering dev servers on the same port
lsof -ti:${PORT:-3939} | xargs kill -9 2>/dev/null
sleep 1

# Only wipe .next if explicitly requested: PORT=3939 CLEAN=1 npm run dev
if [ "${CLEAN:-}" = "1" ]; then rm -rf .next 2>/dev/null; fi

# 3GB heap — Turbopack needs room with 100+ routes + 78 pages.
# --expose-gc lets Turbopack trigger GC when it detects pressure.
export NODE_OPTIONS="${NODE_OPTIONS:-} --max-old-space-size=3072 --expose-gc"

exec node ./node_modules/.bin/next dev --webpack -H 127.0.0.1 -p ${PORT:-3939}
