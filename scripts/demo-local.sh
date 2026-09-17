#!/usr/bin/env bash
set -euo pipefail

npm test
npm run scenario:small
npm run benchmark:compare
npm run scenario:small:simulate
npm run scenario:small:risk

echo "OptiFlow local demo checks passed."
