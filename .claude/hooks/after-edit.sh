#!/usr/bin/env bash
set -euo pipefail
cd "$CLAUDE_PROJECT_DIR"

echo "— Before formatting (git status):"
git status --porcelain || true

# Run your existing scripts (put Prettier last so it wins formatting)
# If ESLint exits non-zero, don't block Claude — just show output
npm run -s lint -- --fix || true
npm run -s format

echo "— After formatting (git status):"
git status --porcelain || true
