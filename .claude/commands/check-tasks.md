# /check-tasks

Check Asana for assigned tasks and sync with GitHub Issues.

## Steps
1. Query Asana for tasks assigned to this agent
2. For each open task, check if a GitHub Issue exists
3. List any tasks without GitHub Issues (need manual sync)
4. Report summary: pending / in-progress / blocked tasks
