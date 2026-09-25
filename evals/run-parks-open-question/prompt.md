---
max_turns: 150
timeout_seconds: 2400
allowed_tools: [Read, Glob, Grep, Skill, Agent, SendMessage, Bash, Edit, Write]
---

/spec-system:spec-run

Readiness answers — I am away, so treat these as my answers and do not ask me anything: run the one outstanding plan. Verification is `node --test`; there is no typecheck or lint. Baseline is green. End state: leave the branch for review. Permissions are set for this session. You are on the feature branch feature/slug-clean; run in place, no worktree. Anything that needs me gets parked and reported.
