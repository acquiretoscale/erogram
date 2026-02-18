#!/usr/bin/env bash
# Prevents EMFILE (too many open files) when starting Next.js dev.
# Run with: npm run dev (which calls this script)
ulimit -n 65536 2>/dev/null || true
export NODE_OPTIONS="${NODE_OPTIONS:-} --max-old-space-size=8192"
export WATCHPACK_POLLING=true
exec node ./node_modules/.bin/next dev -H 127.0.0.1
