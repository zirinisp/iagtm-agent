# /execute-task

Execute a task from a GitHub Issue.

## Usage
/execute-task <issue-number>

## Steps
1. Read the GitHub Issue: `gh issue view <number>`
2. Check ./skills/ for a relevant skill
3. Post a plan comment on the issue
4. Execute the task
5. Save proof artifacts to ./proof-of-work/<number>/
6. Post completion comment with artifact summary
7. Close the issue
8. Update Asana task to complete
