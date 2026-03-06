---
name: check-tasks
description: Check Asana for assigned tasks and sync status with GitHub Issues.
disable-model-invocation: true
---

Check Asana for tasks assigned to this agent and report their status.

## Steps

1. Query Asana for tasks assigned to this agent
2. For each open task, check if a corresponding GitHub Issue exists
3. List any tasks that are missing GitHub Issues (need manual sync)
4. Report a summary: pending / in-progress / blocked tasks
