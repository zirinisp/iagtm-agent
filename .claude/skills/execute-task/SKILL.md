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
4. Create a task folder: `tasks/YYYY-MM-DD-HHMM-<description>/` (use current date/time and a short description from the issue title)
5. Check `services/REGISTRY.md` for any existing scripts that may help
6. Execute the task following the skill or general best practice
7. Log every action with timestamps in the task folder's `README.md`
8. Save output to the appropriate format:
   - **Human-facing deliverables** (emails, proposals, summaries, data tables): create a Google Doc or Sheet via `services/google-workspace/deliverables.js` — NOT a `.md` file. Post the returned URL to Asana and the GitHub Issue.
   - **Agent-internal files** (action logs, scripts, intermediate data): save as files to `tasks/<folder-name>/output/`
9. Capture a screenshot of the final state via Playwright → `tasks/<folder-name>/screenshots/`
10. If new reusable scripts were created, move them to `services/` and update `services/REGISTRY.md`
11. Get the Google Drive link:
    ```bash
    export PATH=/Users/michaelai/.nvm/versions/node/v20.19.4/bin:$PATH
    node services/google-drive/gdrive-client.js "<folder-name>"
    ```
12. Post a structured completion comment on the GitHub Issue with artifact links and Google Drive link
13. Close the issue: `gh issue close $ARGUMENTS`
14. Mark the corresponding Asana task as complete (with proof artifact links and Drive link)
