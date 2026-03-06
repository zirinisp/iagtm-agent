---
name: proof-of-work
description: Generate a structured proof-of-work summary for the current task.
disable-model-invocation: true
---

Generate a proof-of-work summary for the current task. Use this format:

```
## Proof of Work - Issue #<number>
**Completed**: <timestamp>
**Actions taken**:
- <action 1>
- <action 2>
**Artifacts**:
- [ ] Screenshot: proof-of-work/<number>/final-state.png
- [ ] Action log: proof-of-work/<number>/actions.log
- [ ] Video (if browser task): proof-of-work/<number>/recording.mp4
**Result**: <one sentence summary>
```

Save the summary to `./proof-of-work/<number>/summary.md` and post it as a comment on the GitHub Issue.
