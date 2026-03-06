---
name: commit
description: Stage and commit changes across the agent repo and skills subrepo. Generates a commit message from the diff. Does not push.
disable-model-invocation: true
allowed-tools: Bash, Read, Grep, Glob
---

Commit all pending changes across the iagtm-agent repo and the skills subrepo. Do not push — use `/commit-push` for that.

## Step 1 — Check status of both repos

Run these in parallel:

```bash
# Agent repo status
git -C /Users/michaelai/claude-work-folder/iagtm-agent status
git -C /Users/michaelai/claude-work-folder/iagtm-agent diff --stat
```

```bash
# Skills subrepo status
git -C /Users/michaelai/claude-work-folder/iagtm-agent/skills status
git -C /Users/michaelai/claude-work-folder/iagtm-agent/skills diff --stat
```

If neither repo has changes, report "Nothing to commit" and stop.

## Step 2 — Check remote sync status

For each repo that has local changes, check if the remote has diverged:

```bash
git -C <repo-path> fetch --dry-run 2>&1
git -C <repo-path> log HEAD..origin/main --oneline
```

If there are remote commits not in the local branch, **warn the user** and suggest:
- `git pull --rebase` if no conflicts are expected
- `git pull` for a merge commit
- Ask the user which approach they prefer before proceeding

Do NOT force-push or discard remote changes.

## Step 3 — Pre-commit checks

Before staging, verify:

1. **No secrets staged**: Check for `.env`, `.env.*`, `credentials.json`, `*.token`, `*.key`, `*.pem` files. If found, warn and exclude them.
2. **SKILL.md frontmatter valid**: For any modified SKILL.md files, verify they have `---` delimited YAML frontmatter with at least a `name` field. Report any invalid ones.
3. **No large binaries**: Flag any staged files over 5MB — confirm with the user before including them.
4. **Symlink health**: Verify all symlinks in `.claude/skills/` still resolve. Report any broken ones.

If any check fails, report the issue and ask the user how to proceed.

## Step 4 — Commit the skills subrepo FIRST (if it has changes)

If the skills subrepo has changes:

1. Stage all changed files: `git -C skills add -A`
2. Generate a concise commit message from the diff (1-2 sentences, focus on "why" not "what")
3. Show the user the proposed message and list of staged files
4. Commit:
   ```bash
   git -C skills commit -m "<generated message>

   Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
   ```

## Step 5 — Refresh symlinks (if new skills were added)

After committing the subrepo, check if any new skill directories exist that don't have symlinks yet:

```bash
for skill_dir in skills/*/; do
  skill_name=$(basename "$skill_dir")
  if [ -f "$skill_dir/SKILL.md" ] && [ ! -L ".claude/skills/$skill_name" ]; then
    ln -sfn "../../skills/$skill_name" ".claude/skills/$skill_name"
    echo "Created new symlink: $skill_name"
  fi
done
```

Also check for symlinks pointing to skills that no longer exist and remove them.

## Step 6 — Commit the agent repo (if it has changes)

The agent repo may have changes from:
- The subrepo pointer update (after committing skills/)
- Direct changes to CLAUDE.md, setup.sh, .claude/skills/ workflow files, etc.

1. Stage relevant files (be specific — don't use `git add -A` blindly):
   - Modified tracked files: `git add -u`
   - New files the user created (review untracked files and ask if unsure)
2. Generate a commit message from the diff
3. Show the user the proposed message and list of staged files
4. Commit:
   ```bash
   git commit -m "<generated message>

   Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
   ```

## Step 7 — Summary

Report what was committed:

```
## Commit Summary
**Skills subrepo** (skills/): <commit hash> — <message> (X files changed)
**Agent repo** (iagtm-agent): <commit hash> — <message> (X files changed)

Not pushed. Run `/commit-push` or `git push` to push.
```

If only one repo had changes, only show that one.
