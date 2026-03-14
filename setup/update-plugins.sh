#!/bin/bash
# Daily plugin marketplace updater — called by crontab
# Logs timestamped entries to docs/plugin-updates.log

LOG_DIR="$(cd "$(dirname "$0")/.." && pwd)/docs"
LOG_FILE="$LOG_DIR/plugin-updates.log"
TIMESTAMP=$(date '+%Y-%m-%d %H:%M')

update_repo() {
  local name="$1"
  local path="$2"

  cd "$path" || return
  local before=$(git rev-parse HEAD)
  git pull origin main --quiet 2>&1
  local after=$(git rev-parse HEAD)

  if [ "$before" != "$after" ]; then
    local changes=$(git log --oneline "$before..$after")
    echo "[$TIMESTAMP] $name — UPDATED" >> "$LOG_FILE"
    echo "$changes" | sed 's/^/  /' >> "$LOG_FILE"
  fi
}

update_repo "anthropic-agent-skills" "$HOME/.claude/plugins/marketplaces/anthropic-agent-skills"
update_repo "claude-plugins-official" "$HOME/.claude/plugins/marketplaces/claude-plugins-official"
