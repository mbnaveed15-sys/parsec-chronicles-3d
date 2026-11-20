#!/usr/bin/env bash
# One-command publish: commit any changes to the game and push to GitHub Pages.
# Usage: bash publish.sh "optional commit message"
export PATH="$PATH:/c/Program Files/GitHub CLI"
cd "$(dirname "$0")" || exit 1
git add -A
if git diff --cached --quiet; then
  echo "Nothing to publish (no changes)."
  exit 0
fi
git commit -m "${1:-Update game}" || exit 1
git push origin main || exit 1
echo "Published. Live at https://mbnaveed15-sys.github.io/parsec-chronicles-3d/ (updates in ~30-60s)"