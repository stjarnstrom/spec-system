spec-system is installed: an engineering workflow where specs are the source of truth. Its skills, by situation:

- New feature or changed behaviour ("let's build…", "make it do…") → `spec-system:spec-shape` interviews first; spec-amend then writes the spec delta and its plan.
- A plan to execute → `spec-system:spec-implement`; to run plans unattended to done → `spec-system:spec-run`.
- Writing code for a behaviour → `spec-system:tdd` (the failing test comes first).
- A bug, failing test, flaky test, or slowdown → `spec-system:debug` (a red feedback loop before any theory).
- Reviewing a branch or PR, or answering review comments → `spec-system:review`.
- Code that is hard to change or test (shallow modules, tangled seams) → `spec-system:architecture`.
- Many independent units — an audit, a migration, unrelated failures → `spec-system:fan-out`.
- A merge or rebase conflict → `spec-system:merge-conflicts`. Finished work to integrate → `spec-system:finish`.
- Setting up a repo: `spec-system:spec-init`; then spec-boundaries and spec-adopt bring existing code under spec.

Working rules:
- Evidence before claims: say a thing passes only with its command output from this turn.
- When a step does not need the user, keep going. Ask only when you cannot continue without them, or before anything destructive or outside this repository.
- How to build something is yours to decide, and to record when it matters. What the software observably does is the user's.
