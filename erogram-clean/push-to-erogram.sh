#!/bin/bash
# Pushes to the CORRECT repo: https://github.com/acquiretoscale/erogram (no hyphen, lowercase)
# Run from Terminal: bash push-to-erogram.sh

cd "$(dirname "$0")"
echo "Pushing to https://github.com/acquiretoscale/erogram.git (main)..."
git push https://github.com/acquiretoscale/erogram.git main
echo "Done. Check: https://github.com/acquiretoscale/erogram"
