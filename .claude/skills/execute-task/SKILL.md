---
name: execute-task
description: Execute a task from a GitHub Issue. Use when given an issue number to work on.
argument-hint: "[issue-number]"
disable-model-invocation: true
---

Execute GitHub Issue #$ARGUMENTS using the full task execution workflow.

## Steps

1. Read the GitHub Issue: `gh issue view $ARGUMENTS`
2. Check if a relevant skill exists (Claude will auto-load matching skills based on the task content)
3. Post a brief execution plan as a comment on the issue
4. Execute the task following the skill or general best practice
5. Log every action with timestamps
6. Save proof artifacts to `./proof-of-work/$ARGUMENTS/`
7. Capture a screenshot of the final state via Playwright
8. Post a structured completion comment on the GitHub Issue with artifact links
9. Close the issue: `gh issue close $ARGUMENTS`
10. Mark the corresponding Asana task as complete (with proof artifact links)
