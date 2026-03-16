#!/usr/bin/env bash
# Prevents EMFILE (too many open files) when starting Next.js dev.
# Run with: npm run dev (which calls this script)
ulimit -n 65536 2>/dev/null || true

# 2GB heap (down from 4GB) — keeps Turbopack from bloating into swap.
# --expose-gc lets Turbopack trigger GC when it detects pressure.
export NODE_OPTIONS="${NODE_OPTIONS:-} --max-old-space-size=2048 --expose-gc"

exec node ./node_modules/.bin/next dev -H 127.0.0.1 -p ${PORT:-3939}
