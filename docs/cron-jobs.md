# Scheduled Jobs (crontab)

System cron jobs on Mac Mini "Paddington". Manage with `crontab -e` (edit) or `crontab -l` (view).

## Jobs

| Schedule | Job | Log |
|----------|-----|-----|
| Daily 6:17am | Pull latest Anthropic plugin marketplaces (`anthropic-agent-skills` + `claude-plugins-official`) | `docs/plugin-updates.log` |

## Plugin Update Job

Pulls both official Anthropic plugin repos so skills like `skill-creator`, `document-skills`, `asana`, and `frontend-design` stay current.

**Repos pulled:**
- `~/.claude/plugins/marketplaces/anthropic-agent-skills` (from `anthropics/skills`)
- `~/.claude/plugins/marketplaces/claude-plugins-official` (from `anthropics/claude-plugins-official`)

**Log file:** `docs/plugin-updates.log` — only logs entries when updates are found. Format:
```
[2026-03-14 06:17] anthropic-agent-skills — UPDATED
  b0cbd3d skill-creator: drop ANTHROPIC_API_KEY requirement from description optimizer
```

**To check update history:**
```bash
cat docs/plugin-updates.log
```

**To run manually:**
```bash
bash setup/update-plugins.sh
```

**Script:** `setup/update-plugins.sh` — pulls both repos, compares before/after hashes, logs only actual changes.
