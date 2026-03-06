#!/bin/bash
# =============================================================================
# Chrome CDP Manager — Multi-Agent Browser Access
# Manages a Chrome instance with CDP (Chrome DevTools Protocol) enabled,
# allowing multiple Playwright MCP agents to connect simultaneously.
#
# Usage:
#   bash setup/chrome-cdp.sh start   — Sync profile & launch CDP Chrome
#   bash setup/chrome-cdp.sh stop    — Stop CDP Chrome
#   bash setup/chrome-cdp.sh sync    — Re-sync profile from user's Chrome
#   bash setup/chrome-cdp.sh status  — Check if CDP Chrome is running
#   bash setup/chrome-cdp.sh restart — Stop, sync, and restart
# =============================================================================

set -euo pipefail

CDP_PORT="${CDP_PORT:-9222}"
CDP_PROFILE_DIR="$HOME/chrome-agent-profiles/chrome-cdp-profile"
CHROME_USER_PROFILE="$HOME/Library/Application Support/Google/Chrome"
CHROME_APP="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
PID_FILE="$HOME/chrome-agent-profiles/.cdp-chrome.pid"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
NC='\033[0m'

log() { echo -e "${GREEN}[CDP]${NC} $1"; }
warn() { echo -e "${YELLOW}[CDP]${NC} $1"; }
err() { echo -e "${RED}[CDP]${NC} $1"; }

# Check if CDP Chrome is running
is_cdp_running() {
  if [ -f "$PID_FILE" ]; then
    local pid
    pid=$(cat "$PID_FILE")
    if kill -0 "$pid" 2>/dev/null; then
      return 0
    fi
    rm -f "$PID_FILE"
  fi
  return 1
}

# Check if user's normal Chrome is running
is_user_chrome_running() {
  pgrep -x "Google Chrome" >/dev/null 2>&1
}

# Wait for a process to exit
wait_for_exit() {
  local name="$1" max_wait="${2:-10}" i=0
  while pgrep -x "$name" >/dev/null 2>&1 && [ $i -lt $max_wait ]; do
    sleep 1
    i=$((i + 1))
  done
  ! pgrep -x "$name" >/dev/null 2>&1
}

# Sync Chrome profile from user's Chrome to CDP profile
do_sync() {
  log "Syncing Chrome profile..."
  mkdir -p "$CDP_PROFILE_DIR"

  # Check if user Chrome is running — need to close it briefly
  local chrome_was_running=false
  if is_user_chrome_running; then
    chrome_was_running=true
    log "Closing Chrome temporarily for profile sync..."
    osascript -e 'tell application "Google Chrome" to quit' 2>/dev/null || true
    sleep 2

    if ! wait_for_exit "Google Chrome" 10; then
      warn "Chrome didn't close gracefully, force-killing..."
      pkill -x "Google Chrome" 2>/dev/null || true
      sleep 2
    fi
  fi

  # Rsync the profile (only Default profile, skip cache for speed)
  log "Copying profile (this takes ~10 seconds)..."
  rsync -a --quiet \
    --exclude='Cache/' \
    --exclude='Code Cache/' \
    --exclude='Service Worker/CacheStorage/' \
    --exclude='GPUCache/' \
    --exclude='ShaderCache/' \
    --exclude='GrShaderCache/' \
    --exclude='component_crx_cache/' \
    "$CHROME_USER_PROFILE/" "$CDP_PROFILE_DIR/"

  log "Profile synced."

  # Reopen user's Chrome if it was running
  if [ "$chrome_was_running" = true ]; then
    log "Reopening Chrome..."
    open -a "Google Chrome"
    sleep 2
  fi
}

# Start CDP Chrome
do_start() {
  if is_cdp_running; then
    local pid
    pid=$(cat "$PID_FILE")
    log "CDP Chrome already running (PID $pid)"

    # Verify CDP endpoint is responsive
    if curl -s "http://localhost:$CDP_PORT/json/version" >/dev/null 2>&1; then
      log "CDP endpoint responsive at http://localhost:$CDP_PORT"
      return 0
    else
      warn "CDP endpoint not responsive, restarting..."
      do_stop
    fi
  fi

  # Sync profile if it doesn't exist
  if [ ! -d "$CDP_PROFILE_DIR/Default" ]; then
    log "No CDP profile found, syncing from user Chrome..."
    do_sync
  fi

  log "Launching CDP Chrome on port $CDP_PORT..."
  "$CHROME_APP" \
    --remote-debugging-port="$CDP_PORT" \
    --user-data-dir="$CDP_PROFILE_DIR" \
    --no-first-run \
    --no-default-browser-check \
    --disable-background-timer-throttling \
    --disable-backgrounding-occluded-windows \
    --disable-renderer-backgrounding \
    "about:blank" &>/dev/null &

  local pid=$!
  echo "$pid" > "$PID_FILE"
  sleep 3

  # Verify CDP is responsive
  if curl -s "http://localhost:$CDP_PORT/json/version" >/dev/null 2>&1; then
    log "CDP Chrome running (PID $pid) at http://localhost:$CDP_PORT"
  else
    err "CDP Chrome started but endpoint not responsive. Check for errors."
    return 1
  fi
}

# Stop CDP Chrome
do_stop() {
  if is_cdp_running; then
    local pid
    pid=$(cat "$PID_FILE")
    log "Stopping CDP Chrome (PID $pid)..."
    kill "$pid" 2>/dev/null || true
    sleep 2

    if kill -0 "$pid" 2>/dev/null; then
      warn "Force-killing CDP Chrome..."
      kill -9 "$pid" 2>/dev/null || true
    fi

    rm -f "$PID_FILE"
    log "CDP Chrome stopped."
  else
    log "CDP Chrome is not running."
  fi
}

# Show status
do_status() {
  if is_cdp_running; then
    local pid
    pid=$(cat "$PID_FILE")
    log "CDP Chrome running (PID $pid)"

    if curl -s "http://localhost:$CDP_PORT/json/version" >/dev/null 2>&1; then
      local browser
      browser=$(curl -s "http://localhost:$CDP_PORT/json/version" | python3 -c "import sys,json; print(json.load(sys.stdin)['Browser'])" 2>/dev/null || echo "unknown")
      log "Browser: $browser"
      log "CDP endpoint: http://localhost:$CDP_PORT"

      # Count open tabs
      local tabs
      tabs=$(curl -s "http://localhost:$CDP_PORT/json/list" | python3 -c "import sys,json; print(len(json.load(sys.stdin)))" 2>/dev/null || echo "?")
      log "Open tabs: $tabs"
    else
      warn "CDP endpoint not responsive"
    fi
  else
    log "CDP Chrome is not running."
  fi
}

# Main
case "${1:-}" in
  start)
    do_start
    ;;
  stop)
    do_stop
    ;;
  sync)
    local_was_running=false
    if is_cdp_running; then
      local_was_running=true
      do_stop
    fi
    do_sync
    if [ "$local_was_running" = true ]; then
      do_start
    fi
    ;;
  restart)
    do_stop
    do_sync
    do_start
    ;;
  status)
    do_status
    ;;
  *)
    echo "Usage: $0 {start|stop|sync|restart|status}"
    echo ""
    echo "Commands:"
    echo "  start    — Launch CDP Chrome (syncs profile if needed)"
    echo "  stop     — Stop CDP Chrome"
    echo "  sync     — Re-sync profile from user's Chrome (closes Chrome briefly)"
    echo "  restart  — Stop, sync, and restart CDP Chrome"
    echo "  status   — Check if CDP Chrome is running"
    exit 1
    ;;
esac
