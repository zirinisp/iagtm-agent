#!/bin/bash
# Check for gws CLI updates
# Usage: bash services/google-workspace/check-update.sh

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "=== Google Workspace CLI Update Check ==="

# Current version
CURRENT=$(cd "$SCRIPT_DIR" && npx gws --version 2>/dev/null | head -1)
echo "Installed: $CURRENT"

# Check npm for latest
LATEST=$(npm view @googleworkspace/cli version 2>/dev/null)
echo "Latest:    gws $LATEST"

# Compare
INSTALLED_VER=$(echo "$CURRENT" | grep -oE '[0-9]+\.[0-9]+\.[0-9]+')
if [ "$INSTALLED_VER" = "$LATEST" ]; then
  echo "✓ Up to date"
else
  echo "⚠ Update available: $INSTALLED_VER → $LATEST"
  echo "  Run: cd services/google-workspace && npm update @googleworkspace/cli"
fi

# Auth status
echo ""
echo "=== Auth Status ==="
cd "$SCRIPT_DIR" && npx gws auth status --format json 2>/dev/null | grep -E '"user"|"token_valid"|"scope_count"'
