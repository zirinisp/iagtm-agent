# Agent System — Claude Code Context

> This file is the primary context document for Claude Code running on Mac Mini "Paddington".
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

Skills are structured knowledge files that define how to perform specific tasks.
They live in the skills subrepo, mounted at: `./skills/`

### Loading Skills
Before starting any task, check if a relevant skill exists:
```bash
ls ./skills/
cat ./skills/<skill-name>/SKILL.md
```

Skills take precedence over general reasoning. If a skill exists for the task type, follow it.

### Skills Subrepo
The skills library is a Git submodule pointing to the real skills repository:
```
agent-system/
└── skills/          ← git submodule: github.com/zirinisp/iagtm-skills
```

**Always sync before starting a task:**
```bash
git submodule update --remote --merge skills
```

This ensures you always have the latest skills before executing. The submodule tracks the `main` branch of `zirinisp/iagtm-skills`.

To initialise on a fresh clone of the project:
```bash
git submodule update --init --recursive
```

---

## 4. Proof-of-Work Requirements

Every completed task MUST produce proof artifacts. This is non-negotiable.

| Artifact | Required | Notes |
|----------|----------|-------|
| Action log | Always | Timestamped list of every action taken |
| Final state screenshot | Always | Screenshot of end state via Playwright |
| Error log | If errors occurred | What failed and how it was resolved |
| Video recording | For browser tasks | Screen recording of the session |
| Output files | If applicable | Any files created/modified |

Artifacts are stored in: `./proof-of-work/<github-issue-number>/`

After completion, post a summary comment on the GitHub Issue with artifact links.

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
| Playwright | Browser control | Local via MCP |

### Node.js
Always use Node v20. If running npx commands:
```bash
export PATH=/Users/michaelai/.nvm/versions/node/v20.19.4/bin:$PATH
```

### Chrome Extension Note
The Claude Desktop Chrome extension is **disabled on MacBook** to prevent pairing conflicts.
Playwright on Mac Mini controls Chrome directly — do not rely on the Chrome extension for automation.

---

## 6. Task Execution Workflow (Mode A)

```
1. Read GitHub Issue fully
2. Check ./skills/ for relevant skill
3. Plan: write a brief execution plan as a GitHub comment
4. Execute: follow skill or general best practice
5. Document: log every action with timestamps
6. Proof: capture screenshot/video of final state
7. Report: post completion comment on GitHub Issue
8. Sync: confirm Asana task is marked complete
```

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

- **Never mark a task complete in Asana without proof artifacts**
- Use the Asana MCP to read task details, not just the GitHub Issue
- Custom fields on Asana tasks may contain routing hints (e.g., `agent: claude-code`)
- When creating sub-tasks or follow-up tasks, create them in Asana first, then sync

---

## 9. Known Issues & Workarounds

| Issue | Workaround |
|-------|-----------|
| n8n MCP Node version | Use bash wrapper to force Node 20 (see setup.md) |
| Chrome extension pairing conflict | Extension disabled on MacBook; Playwright used on Mac Mini |
| MCP rate limiting (429) | Wait 3+ minutes before retrying after repeated failures |

---

## 10. What Good Looks Like

A well-executed task ends with:
1. GitHub Issue closed with a structured completion comment
2. Asana task marked complete with proof artifact links
3. `./proof-of-work/<issue-number>/` folder containing all artifacts
4. No open questions or incomplete sub-tasks

When in doubt: **do less, document more.**
