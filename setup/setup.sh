#!/bin/bash
# =============================================================================
# Agent System Bootstrap — Mac Mini "Paddington"
# Run this once to set up the full environment for Claude Code agent execution
# Usage: bash setup/setup.sh  (from repo root)
# =============================================================================

set -e  # Exit on any error

AGENT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
NODE_VERSION="v20.19.4"
NVM_NODE="$HOME/.nvm/versions/node/$NODE_VERSION/bin"

echo ""
echo "╔══════════════════════════════════════════════╗"
echo "║   Agent System Bootstrap — Paddington        ║"
echo "╚══════════════════════════════════════════════╝"
echo ""
echo "Project root: $AGENT_DIR"
echo ""

# ── 1. Node version check ─────────────────────────────────────────────────────
echo "▶ Checking Node.js version..."
export PATH="$NVM_NODE:$PATH"
NODE_ACTUAL=$(node --version 2>/dev/null || echo "not found")
if [[ "$NODE_ACTUAL" != "$NODE_VERSION" ]]; then
  echo "  ⚠️  Expected Node $NODE_VERSION, got $NODE_ACTUAL"
  echo "  → Install via: nvm install $NODE_VERSION && nvm use $NODE_VERSION"
  echo "  → Then re-run this script."
  exit 1
fi
echo "  ✅ Node $NODE_ACTUAL"

# ── 2. Required CLI tools ──────────────────────────────────────────────────────
echo ""
echo "▶ Checking required tools..."

check_tool() {
  if command -v "$1" &>/dev/null; then
    echo "  ✅ $1"
  else
    echo "  ❌ $1 not found — install with: $2"
  fi
}

check_tool "git"        "xcode-select --install"
check_tool "gh"         "brew install gh"
check_tool "node"       "nvm install $NODE_VERSION"
check_tool "npx"        "(included with node)"
check_tool "claude"     "npm install -g @anthropic-ai/claude-code"

# ── 3. Git submodule (skills) ─────────────────────────────────────────────────
echo ""
echo "▶ Initialising git submodules..."
if [ -f "$AGENT_DIR/.gitmodules" ]; then
  git -C "$AGENT_DIR" submodule update --init --recursive
  echo "  ✅ Skills submodule initialised"
else
  echo "  ⚠️  No .gitmodules found — skipping"
fi

# ── 4. Proof-of-work directory ─────────────────────────────────────────────────
echo ""
echo "▶ Ensuring proof-of-work directory exists..."
mkdir -p "$AGENT_DIR/proof-of-work"
echo "  ✅ $AGENT_DIR/proof-of-work/"

# ── 5. Docs directory ─────────────────────────────────────────────────────────
echo ""
echo "▶ Ensuring docs directory exists..."
mkdir -p "$AGENT_DIR/docs"
echo "  ✅ $AGENT_DIR/docs/"

# ── 6. n8n MCP config snippet ──────────────────────────────────────────────────
echo ""
echo "▶ Writing n8n MCP config snippet..."
cat > "$AGENT_DIR/docs/n8n-mcp-config.json" << EOF
{
  "_comment": "Add this to ~/Library/Application Support/Claude/claude_desktop_config.json under mcpServers",
  "paz-n8n-mcp": {
    "command": "/bin/bash",
    "args": [
      "-c",
      "export PATH=$NVM_NODE:\$PATH && exec npx -y mcp-remote https://n8n-mcp-michael.paz-labs.com/mcp --header 'Authorization: Bearer <YOUR_TOKEN>'"
    ],
    "env": {
      "PATH": "$NVM_NODE:/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin",
      "NODE_PATH": "$HOME/.nvm/versions/node/$NODE_VERSION/lib/node_modules"
    }
  }
}
EOF
echo "  ✅ Saved to $AGENT_DIR/docs/n8n-mcp-config.json"

# ── 7. Clear stale npx cache ───────────────────────────────────────────────────
echo ""
echo "▶ Clearing stale npx cache..."
CACHE_DIR="$HOME/.npm/_npx/705d23756ff7dacc"
if [ -d "$CACHE_DIR" ]; then
  rm -rf "$CACHE_DIR"
  echo "  ✅ Cleared stale cache"
else
  echo "  ✅ No stale cache found"
fi

# ── 8. Summary ────────────────────────────────────────────────────────────────
echo ""
echo "╔══════════════════════════════════════════════╗"
echo "║   Setup Complete                             ║"
echo "╚══════════════════════════════════════════════╝"
echo ""
echo "Project root:    $AGENT_DIR"
echo "Skills:          $AGENT_DIR/skills/"
echo "Proof of work:   $AGENT_DIR/proof-of-work/"
echo "Claude commands: $AGENT_DIR/.claude/commands/"
echo "Docs:            $AGENT_DIR/docs/"
echo ""
echo "Next steps:"
echo "  1. Add n8n Bearer token to docs/n8n-mcp-config.json"
echo "  2. Merge n8n config into ~/Library/Application Support/Claude/claude_desktop_config.json"
echo "  3. Run: cd $AGENT_DIR && claude"
echo ""
