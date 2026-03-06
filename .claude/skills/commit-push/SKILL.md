---
name: commit-push
description: Stage, commit, and push changes across the agent repo and skills subrepo. Generates a commit message from the diff and pushes to remote.
disable-model-invocation: true
allowed-tools: Bash, Read, Grep, Glob
---

Commit and push all pending changes across the iagtm-agent repo and the skills subrepo.

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

For BOTH repos (even if only one has local changes), fetch and check for divergence:

```bash
git -C <repo-path> fetch
git -C <repo-path> log HEAD..origin/main --oneline
git -C <repo-path> log origin/main..HEAD --oneline
```

If there are remote commits not in the local branch:
- **Warn the user clearly** with the list of remote commits
- Suggest: `git pull --rebase` (clean history) or `git pull` (merge commit)
- Ask the user which approach they prefer
- If there are merge conflicts after pulling, show the conflicted files and ask the user how to resolve each one
- Do NOT force-push, do NOT discard remote changes, do NOT proceed until conflicts are resolved

## Step 3 — Pre-commit checks

Before staging, verify:

1. **No secrets staged**: Check for `.env`, `.env.*`, `credentials.json`, `*.token`, `*.key`, `*.pem` files. If found, warn and exclude them.
2. **SKILL.md frontmatter valid**: For any modified SKILL.md files, verify they have `---` delimited YAML frontmatter with at least a `name` field. Report any invalid ones.
3. **No large binaries**: Flag any staged files over 5MB — confirm with the user before including them.
4. **Symlink health**: Verify all symlinks in `.claude/skills/` still resolve. Report any broken ones.

If any check fails, report the issue and ask the user how to proceed.

## Step 4 — Commit and push the skills subrepo FIRST (if it has changes)

If the skills subrepo has changes:

1. Stage all changed files: `git -C skills add -A`
2. Generate a concise commit message from the diff (1-2 sentences, focus on "why" not "what")
3. Show the user the proposed message and list of staged files
4. Commit:
   ```bash
   git -C skills commit -m "<generated message>

   Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
   ```
5. Push the subrepo:
   ```bash
   git -C skills push
   ```
6. If push fails (e.g., rejected), report the error and ask the user how to proceed.

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

## Step 6 — Commit and push the agent repo (if it has changes)

The agent repo may have changes from:
- The subrepo pointer update (after committing skills/)
- Direct changes to CLAUDE.md, setup.sh, .claude/skills/ workflow files, etc.
- New symlinks created in step 5

1. Stage relevant files (be specific — don't use `git add -A` blindly):
   - Modified tracked files: `git add -u`
   - New files the user created (review untracked files and ask if unsure)
   - New symlinks from step 5
2. Generate a commit message from the diff
3. Show the user the proposed message and list of staged files
4. Commit:
   ```bash
   git commit -m "<generated message>

   Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
   ```
5. Push:
   ```bash
   git push
   ```
6. If push fails, report the error and ask the user how to proceed.

## Step 7 — Summary

Report what was committed and pushed:

```
## Commit & Push Summary
**Skills subrepo** (skills/): <commit hash> — <message> (X files changed) — pushed
**Agent repo** (iagtm-agent): <commit hash> — <message> (X files changed) — pushed

Both repos are now up to date with origin/main.
```

If only one repo had changes, only show that one.
