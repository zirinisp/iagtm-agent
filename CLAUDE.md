# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

> This is the primary context document for Claude Code running on Mac Mini "Paddington".
> Read this fully before starting any task. All behaviour, routing, and workflow decisions derive from here.

---

## 1. What This System Is

An autonomous agent system where AI agents operate like remote employees:
- Tasks are assigned in **Asana** (by a human or orchestrating agent)
- Tasks sync to **GitHub Issues** via n8n automation
- GitHub Issues trigger **Claude Code** (this agent) or **Cursor Cloud** for execution
- Completed work is documented with **proof-of-work artifacts** (logs, screenshots, video)
- Results are reported back to Asana

The Mac Mini "Paddington" is the always-on execution environment. Chrome is the primary browser, controlled via Playwright.

---

## 2. Two Modes of Operation

### Mode A — Monitored / Asana-Driven (Project Management Mode)
The agent works within the Asana → GitHub → execution pipeline.

- Check Asana for assigned tasks before starting work
- Each task has a GitHub Issue as its execution ticket
- Update the GitHub Issue with progress and proof-of-work
- Mark Asana task complete only after proof artifacts are attached

### Mode B — Instruction-Following Mode (Direct Agent Mode)
A human or orchestrating agent provides direct instructions in the session.

- Follow instructions precisely and sequentially
- Do not deviate or interpret beyond what is asked
- Document every action taken
- Report back with a structured summary at the end

**How to determine which mode:** If the session starts with a GitHub Issue number or Asana task ID, use Mode A. If it starts with direct instructions or a task description, use Mode B.

---

## 3. Skills System

Skills are structured knowledge files that teach Claude how to handle specific operational tasks. Claude Code **auto-discovers skills** based on their descriptions — when a user's message matches a skill's keywords, Claude loads and follows that skill automatically.

### How It Works

Skills are stored in `.claude/skills/` which is where Claude Code looks for them. Each skill has a `SKILL.md` file with YAML frontmatter containing a `name` and `description`. The description controls when Claude activates the skill.

There are two types of skills in this project:

| Type | Location | Invocation |
|------|----------|------------|
| **Domain skills** (menu, inventory, etc.) | `.claude/skills/<name>` → symlinked to `./skills/<name>` | Auto-triggered by Claude when your message matches the description keywords |
| **Workflow skills** (execute-task, proof-of-work, check-tasks) | `.claude/skills/<name>/SKILL.md` | Manually invoked via `/execute-task`, `/proof-of-work`, `/check-tasks` |

Domain skills take precedence over general reasoning. If a skill exists for the task type, Claude will follow it.

### Available Domain Skills

| Skill | Triggers On |
|-------|------------|
| `iagtm-menu` | Menu items, pricing, categories, Deliverect, Lightspeed POS, Uber Eats menus |
| `iagtm-inventory` | Stock levels, suppliers, purchasing, Marketman, food cost |
| `iagtm-avt` | Actual vs Theoretical variance, inventory accuracy, recipe errors, counting errors |
| `iagtm-uber-marketing` | Uber Eats ads, campaigns, ROAS, ad spend, offers, promotions |
| `iagtm-menu-photographer` | Food photos, menu images, photography specs |
| `iagtm-staff-scheduler` | Scheduling, shifts, rosters, Deputy, labour costs |
| `iagtm-finance` | Revenue, P&L, profit, financial reports, cross-system consolidation |
| `iagtm-reports` | Branded report generation (HTML, PDF, Excel, PowerPoint, Word) — layers IAGTM brand on official document skills |
| `iagtm-asana` | Asana tasks, projects, sections, attachments, custom fields, tags, API, task lifecycle |
| `iagtm-scripts` | Script registry, reusable scripts, `services/REGISTRY.md`, creating/finding/organizing automation scripts |
| `iagtm-browser` | Browser automation, Playwright MCP, CDP, web scraping, screenshots, login flows |
| `iagtm-menu-eval` | Menu item health evaluation, scoring, performance review, sales vs margin analysis |
| `skill-monitor` | Skill health checks, improvement reviews |
| `skill-creator` | Creating new skills (official Anthropic plugin — see custom instructions below) |

### Available Workflow Skills

| Skill | Purpose |
|-------|---------|
| `/execute-task <issue-number>` | Full task execution workflow: read issue, plan, execute, proof, report, close |
| `/proof-of-work` | Generate a structured proof-of-work summary for the current task |
| `/check-tasks` | Query Asana for assigned tasks and sync status with GitHub Issues |
| `/commit` | Stage and commit changes in both agent repo and skills subrepo (does not push) |
| `/commit-push` | Stage, commit, and push changes in both repos to remote |

### Skill Creator — Custom Instructions

The `skill-creator` plugin (official Anthropic plugin) is installed globally. When creating or modifying IAGTM domain skills, follow these rules:

1. **Write skills to the subrepo, not `.claude/skills/`**
   - New domain skills go in `./skills/<skill-name>/SKILL.md` (the git submodule)
   - Then create a symlink: `ln -sfn ../../skills/<skill-name> .claude/skills/<skill-name>`
   - This keeps the subrepo as the single source of truth

2. **Follow the existing naming convention**
   - Skill directories are prefixed with `iagtm-` (e.g., `iagtm-menu`, `iagtm-finance`)
   - The SKILL.md `name` field matches the directory name

3. **Eval workspaces go outside the subrepo**
   - The skill-creator puts workspaces at `<skill-name>-workspace/` — ensure these are siblings of the skill directory, not inside the subrepo
   - Add workspace directories to `.gitignore` if needed

4. **Commit to both repos when done**
   - Use `/commit` or `/commit-push` to handle both the agent repo and the skills subrepo
   - The subrepo has its own git history at `github.com/zirinisp/iagtm-skills`

5. **Workflow skills stay in `.claude/skills/` directly**
   - Only domain/operational skills go in the subrepo
   - Workflow skills (like `execute-task`, `proof-of-work`, `commit`) are committed directly to `.claude/skills/`

6. **Description style**
   - Include "IAGTM (It's All Greek To Me)" in descriptions for brand context
   - List specific trigger keywords relevant to the domain
   - Reference the 6 London locations where applicable
   - Be "pushy" with triggers as the plugin recommends — list concrete keywords

### Official Anthropic Plugins (Auto-Updating)

Two plugin marketplaces are registered in `~/.claude/plugins/`:

| Marketplace | Repo | Installed Plugins |
|-------------|------|-------------------|
| `claude-plugins-official` | `anthropics/claude-plugins-official` | `skill-creator`, `asana`, `frontend-design` |
| `anthropic-agent-skills` | `anthropics/skills` | `document-skills` (pdf, xlsx, pptx, docx), `example-skills` (canvas-design, brand-guidelines, etc.) |

These provide the **HOW** — code patterns, library usage, and design principles. Our `iagtm-reports` skill provides the **WHAT** — IAGTM brand colors, templates, and layout conventions that layer on top.

**Python dependencies** (for pdf/xlsx/pptx/docx skills):
```bash
python3 -m pip install reportlab pypdf pdfplumber openpyxl python-pptx
```

**To update plugins:** Pull the marketplace repos in `~/.claude/plugins/marketplaces/`.

### Skills Subrepo

The domain skills are maintained in a separate Git repository and included here as a submodule:

```
iagtm-agent/
├── skills/                ← Git submodule: github.com/zirinisp/iagtm-skills (source of truth)
└── .claude/
    └── skills/
        ├── iagtm-menu     → ../../skills/iagtm-menu          (symlink)
        ├── iagtm-finance   → ../../skills/iagtm-finance        (symlink)
        ├── ...             → ...                               (symlinks)
        ├── execute-task/   ← Workflow skill (committed directly)
        ├── proof-of-work/  ← Workflow skill (committed directly)
        └── check-tasks/    ← Workflow skill (committed directly)
```

The symlinks let Claude Code discover the skills while keeping the subrepo as the single source of truth. The same subrepo also works with Claude Desktop via its own `sync-to-claude.sh` script.

**Always sync before starting a task:**
```bash
git submodule update --remote --merge skills
```

To initialise on a fresh clone:
```bash
bash setup/setup.sh
```

---

## 4. Task Folders & Proof-of-Work

### Task Folders

Every piece of work gets its own folder in `tasks/`:

```
tasks/YYYY-MM-DD-HHMM-description/
├── README.md        ← What was done, links to Asana/GitHub issue, proof-of-work summary
├── screenshots/     ← Screenshots captured during the task
└── output/          ← Generated files (PDFs, XLSX, HTML, data files)
```

The README.md in each task folder IS the proof-of-work — it contains the action log, results, and links to artifacts.

### Proof-of-Work Requirements

Every completed task MUST produce proof artifacts. This is non-negotiable.

| Artifact | Required | Notes |
|----------|----------|-------|
| Action log | Always | Timestamped list of every action taken (in task README.md) |
| Final state screenshot | Always | Screenshot of end state via Playwright |
| Error log | If errors occurred | What failed and how it was resolved |
| Video recording | For browser tasks | Screen recording of the session |
| Output files | If applicable | Any files created/modified |

After completion, post a summary comment on the GitHub Issue with artifact links.

### Reusable Scripts

When creating or reusing data scripts, the `iagtm-scripts` skill manages the `services/` directory and `services/REGISTRY.md`. Always check the registry before writing a new script, and register reusable scripts at task completion.

---

## 5. Environment & Tools

### Machine
- **Host**: Mac Mini "Paddington" (`michaelai`)
- **Always-on**: Yes — agent runs are expected at any time
- **Browser**: Chrome (primary), controlled via Playwright

### Key Services
| Service | Purpose | Endpoint |
|---------|---------|---------|
| Asana | Task management | MCP: `https://mcp.asana.com/v2/mcp` |
| GitHub | Issue tracking + code | Standard git + GH CLI |
| n8n | Workflow automation | `https://n8n-mcp-michael.paz-labs.com/mcp` |
| Playwright | Browser control | CDP via `http://localhost:9222` (multi-agent) |

### Scheduled Jobs

System cron jobs run on this Mac Mini. See `docs/cron-jobs.md` for details, or `crontab -l` to inspect.

### Node.js
Always use Node v20. If running npx commands:
```bash
export PATH=/Users/michaelai/.nvm/versions/node/v20.19.4/bin:$PATH
```

### Browser Access — CDP Multi-Agent Architecture

Multiple agents can use the browser simultaneously via Chrome DevTools Protocol (CDP). This replaces the old `--extension` mode which only supported one agent at a time.

**How it works:**
- A dedicated Chrome instance runs with `--remote-debugging-port=9222` using a cloned copy of the user's Chrome profile
- All login sessions are preserved from the user's Chrome
- Each agent connects via `--cdp-endpoint http://localhost:9222` and gets its own tab
- Agents work independently — no interference between tabs

**Before doing any browser work:**
1. Check CDP Chrome is running: `bash setup/chrome-cdp.sh status`
2. If not running: `bash setup/chrome-cdp.sh start`
3. If sessions have expired: ask the user to log in on their Chrome, then `bash setup/chrome-cdp.sh sync`

**Key rules:**
- **Never use `--extension` mode** — use `--cdp-endpoint` via the project `.mcp.json`
- The global Playwright plugin (which uses `--extension`) is for the user's personal use only
- If CDP Chrome is not running, start it yourself — don't fall back to extension mode
- The user's normal Chrome is separate and should not be controlled by agents

**Commands:**
```bash
bash setup/chrome-cdp.sh start    # Launch CDP Chrome (syncs profile if needed)
bash setup/chrome-cdp.sh stop     # Stop CDP Chrome
bash setup/chrome-cdp.sh sync     # Re-sync profile from user's Chrome
bash setup/chrome-cdp.sh status   # Check status
bash setup/chrome-cdp.sh restart  # Stop, sync, restart
```

### Chrome Extension Note
The Claude Desktop Chrome extension is **disabled on MacBook** to prevent pairing conflicts.
Playwright on Mac Mini uses CDP mode for multi-agent access — do not use extension mode.

---

## 6. Task Execution Workflow (Mode A)

```
1. Read GitHub Issue fully
2. Verify current date/time: run `date '+%Y-%m-%d %H:%M %Z'` — NEVER trust the session's injected currentDate
3. Create task folder: tasks/YYYY-MM-DD-HHMM-description/ (using the verified date)
4. Check services/REGISTRY.md for existing scripts
5. Plan: write a brief execution plan as a GitHub comment
6. Execute: follow the auto-loaded skill or general best practice
7. Document: log every action with timestamps in task folder README.md
8. Proof: capture screenshot/video → tasks/<folder>/screenshots/
9. If new reusable scripts were created, move to services/ and update REGISTRY.md
10. Get Google Drive link: node services/google-drive/gdrive-client.js "<folder-name>"
11. Report: post completion comment on GitHub Issue (with Drive link)
12. Sync: confirm Asana task is marked complete (with Drive link)
```

Or use `/execute-task <issue-number>` to run this workflow.

---

## 7. Smart Routing

When a task arrives, determine the right agent:

| Task Type | Route To | Reason |
|-----------|----------|--------|
| Browser automation, UI interaction | Cursor Cloud | Visual proof + video recording |
| GitHub PRs, code review, file edits | Claude Code (this) | Native git integration |
| n8n workflow creation/editing | Claude Code (this) | API-based, no UI needed |
| Research + structured output | Claude Code (this) | Reasoning-heavy |
| Form filling, web scraping | Cursor Cloud | Browser-native |

Routing decisions are logged in the GitHub Issue.

---

## 8. Asana Integration

Asana is the source of truth for task status. Rules:

- **Prefer the project-local Asana MCP (`mcp__asana__*`)** for all standard operations (tasks, projects, search, comments, dependencies)
- **Fall back to the global plugin (`mcp__plugin_asana_asana__*`)** for operations the local MCP doesn't support (delete task, create project, teams, users, typeahead, attachments, goals, portfolios, followers, allocations)
- **Use curl for Asana REST API** when neither MCP covers the operation (sections CRUD, multi-homing, attachment uploads, custom fields, tags, batch API, webhooks)
- See the `iagtm-asana` skill for the full tool routing table and curl patterns
- **Never mark a task complete in Asana without proof artifacts**
- Use the Asana MCP to read task details, not just the GitHub Issue
- Custom fields on Asana tasks may contain routing hints (e.g., `agent: claude-code`)
- When creating sub-tasks or follow-up tasks, create them in Asana first, then sync

---

## 9. Known Issues & Workarounds

| Issue | Workaround |
|-------|-----------|
| n8n MCP Node version | Use bash wrapper to force Node 20 (see setup/setup.sh) |
| Chrome extension pairing conflict | Extension disabled on MacBook; CDP mode used on Mac Mini |
| MCP rate limiting (429) | Wait 3+ minutes before retrying after repeated failures |
| Uber Eats sessions expire quickly | Use email OTP re-login flow (automated — see services.md) |
| CDP Chrome not running | Run `bash setup/chrome-cdp.sh start` before browser work |
| Sessions expired in CDP Chrome | Ask user to log in on their Chrome, then run `bash setup/chrome-cdp.sh sync` |
| `currentDate` in context is stale | Claude Code injects a date at session start that may be wrong by the time work begins. **Always run `date` before any date-sensitive work** (reports, API queries, task folder naming). Never trust the injected date. |

---

## 10. What Good Looks Like

A well-executed task ends with:
1. GitHub Issue closed with a structured completion comment
2. Asana task marked complete with proof artifact links
3. `./tasks/YYYY-MM-DD-HHMM-description/` folder containing all artifacts
4. No open questions or incomplete sub-tasks

When in doubt: **do less, document more.**

---

## 11. Directory Structure

```
iagtm-agent/
├── CLAUDE.md              ← This file
├── .gitignore
├── setup/
│   ├── setup.sh           ← Bootstrap script (creates symlinks + directories)
│   └── chrome-cdp.sh      ← Chrome CDP lifecycle manager (multi-agent browser)
├── skills/                ← Git submodule: github.com/zirinisp/iagtm-skills
├── services/              ← Reusable scripts & API clients (the "toolbox")
│   ├── REGISTRY.md        ← Script index — check before writing new scripts
│   ├── lightspeed/        ← Lightspeed POS API client and reports
│   ├── xero/              ← Xero accounting API client and P&L fetchers
│   ├── deputy/            ← Deputy scheduling API client
│   └── reports/           ← Report generators that combine multi-service data
├── tasks/                 ← Task-based folders (one per piece of work)
│   └── YYYY-MM-DD-HHMM-description/
│       ├── README.md      ← Proof-of-work: what was done, action log, links
│       ├── screenshots/   ← Screenshots captured during the task
│       └── output/        ← Generated files (PDFs, XLSX, HTML, data)
├── research/              ← Investigation & data gathering (organized by topic)
├── docs/
│   ├── n8n-mcp-config.json
│   └── service-logins.md  ← How to authenticate to each external service
└── .claude/
    └── skills/            ← Claude Code skill discovery directory
        ├── iagtm-menu/          → symlink to ../../skills/iagtm-menu
        ├── iagtm-inventory/     → symlink to ../../skills/iagtm-inventory
        ├── iagtm-avt/           → symlink to ../../skills/iagtm-avt
        ├── iagtm-uber-marketing/ → symlink to ../../skills/iagtm-uber-marketing
        ├── iagtm-menu-photographer/ → symlink to ../../skills/iagtm-menu-photographer
        ├── iagtm-staff-scheduler/ → symlink to ../../skills/iagtm-staff-scheduler
        ├── iagtm-finance/       → symlink to ../../skills/iagtm-finance
        ├── iagtm-reports/       → symlink to ../../skills/iagtm-reports
        ├── iagtm-asana/         → symlink to ../../skills/iagtm-asana
        ├── iagtm-scripts/       → symlink to ../../skills/iagtm-scripts
        ├── skill-monitor/       → symlink to ../../skills/skill-monitor
        ├── (skill-creator, frontend-design, document-skills — official Anthropic plugins)
        ├── execute-task/        ← Workflow skill (committed)
        ├── proof-of-work/       ← Workflow skill (committed)
        ├── check-tasks/         ← Workflow skill (committed)
        ├── commit/              ← Workflow skill (committed)
        └── commit-push/         ← Workflow skill (committed)
```

---

## 12. Bootstrap

Run `bash setup/setup.sh` once on a fresh machine. It:
- Verifies Node v20 is active
- Checks required CLI tools (git, gh, node, npx, claude)
- Clones the skills subrepo
- Creates symlinks in `.claude/skills/` so Claude Code discovers all domain skills
- Creates the `tasks/` symlink to Google Drive Shared Drive
- Writes the n8n MCP config snippet to `docs/`

After setup, start the CDP Chrome for multi-agent browser access:
```bash
bash setup/chrome-cdp.sh start
```
