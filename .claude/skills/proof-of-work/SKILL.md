---
name: proof-of-work
description: Generate a structured proof-of-work summary for the current task.
disable-model-invocation: true
---

Generate a proof-of-work summary for the current task. Use this format:

```
## Proof of Work - Issue #<number>
**Completed**: <timestamp>
**Task folder**: tasks/<YYYY-MM-DD-HHMM-description>/
**Google Drive**: <run `node services/google-drive/gdrive-client.js "<folder-name>"` to get link>
**Actions taken**:
- <action 1>
- <action 2>
**Artifacts**:
- [ ] Screenshot: tasks/<folder-name>/screenshots/final-state.png
- [ ] Action log: tasks/<folder-name>/README.md
- [ ] Video (if browser task): tasks/<folder-name>/screenshots/recording.mp4
**Result**: <one sentence summary>
```

Save the summary to `./tasks/<YYYY-MM-DD-HHMM-description>/README.md` and post it as a comment on the GitHub Issue.

After saving, get the Google Drive link:
```bash
export PATH=/Users/michaelai/.nvm/versions/node/v20.19.4/bin:$PATH
node services/google-drive/gdrive-client.js "<folder-name>"
```

Include the Drive link in the GitHub Issue comment and Asana task update.
