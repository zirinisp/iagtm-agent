# Scheduled Jobs (crontab)

System cron jobs on Mac Mini "Paddington". Manage with `crontab -e` (edit) or `crontab -l` (view).

## Jobs

| Schedule | Job | Log |
|----------|-----|-----|
| Daily 6:17am | Pull latest Anthropic plugin marketplaces (`anthropic-agent-skills` + `claude-plugins-official`) | `/tmp/claude-plugins-update.log` |

## Plugin Update Job

Pulls both official Anthropic plugin repos so skills like `skill-creator`, `document-skills`, `asana`, and `frontend-design` stay current.

**Repos pulled:**
- `~/.claude/plugins/marketplaces/anthropic-agent-skills` (from `anthropics/skills`)
- `~/.claude/plugins/marketplaces/claude-plugins-official` (from `anthropics/claude-plugins-official`)

**To check if it ran:**
```bash
cat /tmp/claude-plugins-update.log
```

**To run manually:**
```bash
cd ~/.claude/plugins/marketplaces/anthropic-agent-skills && git pull origin main
cd ~/.claude/plugins/marketplaces/claude-plugins-official && git pull origin main
```
