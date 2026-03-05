#!/bin/bash
# =============================================================================
# Agent System Bootstrap — Mac Mini "Paddington"
# Run this once to set up the full environment for Claude Code agent execution
# Usage: bash setup.sh
# =============================================================================

set -e  # Exit on any error

AGENT_DIR="$HOME/agent-system"
NODE_VERSION="v20.19.4"
NVM_NODE="$HOME/.nvm/versions/node/$NODE_VERSION/bin"

echo ""
echo "╔══════════════════════════════════════════════╗"
echo "║   Agent System Bootstrap — Paddington        ║"
echo "╚══════════════════════════════════════════════╝"
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

# ── 3. Project directory ───────────────────────────────────────────────────────
echo ""
echo "▶ Setting up project directory at $AGENT_DIR..."

if [ ! -d "$AGENT_DIR" ]; then
  mkdir -p "$AGENT_DIR"
  echo "  ✅ Created $AGENT_DIR"
else
  echo "  ✅ Directory exists"
fi

# ── 4. Skills subrepo ─────────────────────────────────────────────────────────
echo ""
echo "▶ Setting up skills subrepo..."

SKILLS_DIR="$AGENT_DIR/skills"
SKILLS_REPO="https://github.com/zirinisp/iagtm-skills.git"

if [ ! -d "$SKILLS_DIR/.git" ]; then
  echo "  → Cloning skills repo..."
  git clone "$SKILLS_REPO" "$SKILLS_DIR"
  echo "  ✅ Skills repo cloned"
else
  echo "  → Updating skills to latest..."
  git -C "$SKILLS_DIR" pull --quiet origin main
  echo "  ✅ Skills up to date"
fi

# ── 5. Proof-of-work directory ─────────────────────────────────────────────────
echo ""
echo "▶ Setting up proof-of-work directory..."
mkdir -p "$AGENT_DIR/proof-of-work"
echo "  ✅ $AGENT_DIR/proof-of-work/"

# ── 6. .claude directory & commands ───────────────────────────────────────────
echo ""
echo "▶ Setting up Claude Code commands..."
mkdir -p "$AGENT_DIR/.claude/commands"

# Slash command: /execute-task
cat > "$AGENT_DIR/.claude/commands/execute-task.md" << 'EOF'
# /execute-task

Execute a task from a GitHub Issue.

## Usage
/execute-task <issue-number>

## Steps
1. Read the GitHub Issue: `gh issue view <number>`
2. Check ./skills/ for a relevant skill
3. Post a plan comment on the issue
4. Execute the task
5. Save proof artifacts to ./proof-of-work/<number>/
6. Post completion comment with artifact summary
7. Close the issue
8. Update Asana task to complete
EOF

# Slash command: /proof-of-work
cat > "$AGENT_DIR/.claude/commands/proof-of-work.md" << 'EOF'
# /proof-of-work

Generate a proof-of-work summary for the current task.

## Output format
```
## Proof of Work — Issue #<number>
**Completed**: <timestamp>
**Actions taken**:
- <action 1>
- <action 2>
**Artifacts**:
- [ ] Screenshot: proof-of-work/<number>/final-state.png
- [ ] Action log: proof-of-work/<number>/actions.log
- [ ] Video (if browser task): proof-of-work/<number>/recording.mp4
**Result**: <one sentence summary>
```
EOF

# Slash command: /check-tasks
cat > "$AGENT_DIR/.claude/commands/check-tasks.md" << 'EOF'
# /check-tasks

Check Asana for assigned tasks and sync with GitHub Issues.

## Steps
1. Query Asana for tasks assigned to this agent
2. For each open task, check if a GitHub Issue exists
3. List any tasks without GitHub Issues (need manual sync)
4. Report summary: pending / in-progress / blocked tasks
EOF

echo "  ✅ Commands created: execute-task, proof-of-work, check-tasks"

# ── 7. n8n MCP config snippet ──────────────────────────────────────────────────
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

mkdir -p "$AGENT_DIR/docs"
echo "  ✅ Saved to $AGENT_DIR/docs/n8n-mcp-config.json"

# ── 8. Clear stale npx cache ───────────────────────────────────────────────────
echo ""
echo "▶ Clearing stale npx cache..."
CACHE_DIR="$HOME/.npm/_npx/705d23756ff7dacc"
if [ -d "$CACHE_DIR" ]; then
  rm -rf "$CACHE_DIR"
  echo "  ✅ Cleared stale cache"
else
  echo "  ✅ No stale cache found"
fi

# ── 9. Git submodule setup (for when skills repo exists) ───────────────────────
echo ""
echo "▶ Writing .gitmodules template..."
cat > "$AGENT_DIR/.gitmodules.template" << 'EOF'
[submodule "skills"]
    path = skills
    url = https://github.com/zirinisp/iagtm-skills.git
    branch = main
EOF
echo "  ✅ .gitmodules.template written (rename to .gitmodules when skills repo is live)"

# ── 10. Summary ────────────────────────────────────────────────────────────────
echo ""
echo "╔══════════════════════════════════════════════╗"
echo "║   Setup Complete                             ║"
echo "╚══════════════════════════════════════════════╝"
echo ""
echo "Project root:    $AGENT_DIR"
echo "Skills:          $SKILLS_DIR"
echo "Proof of work:   $AGENT_DIR/proof-of-work"
echo "Claude commands: $AGENT_DIR/.claude/commands"
echo ""
echo "Next steps:"
echo "  1. Update SKILLS_REPO in this script with your actual GitHub repo URL"
echo "  2. Add n8n Bearer token to docs/n8n-mcp-config.json"
echo "  3. Merge n8n config into ~/Library/Application Support/Claude/claude_desktop_config.json"
echo "  4. Run: cd $AGENT_DIR && claude"
echo ""
