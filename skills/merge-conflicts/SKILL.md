---
name: merge-conflicts
description: >
  Resolve an in-progress git merge, rebase, or cherry-pick conflict by
  recovering each side's intent — including conflicts inside specs/, where
  statement IDs and pins have rules of their own. Use when git reports
  conflicts, or when merging parallel task branches.
---

Resolve by intent, not by hunk. Each side of a conflict was made for a
reason; find the reason before choosing.

## Procedure

1. **See the state.** `git status` — which operation (merge, rebase,
   cherry-pick), which files, and what the operation is for.

2. **Recover each side's intent** from its primary sources: the commit
   messages on both sides (`git log --merge`), the plan in
   `docs/changes/`, the PR or issue they cite.

3. **Resolve code.** Keep both intents where they are compatible. Where
   they are not, keep the one the merge exists to deliver and note the
   trade-off in the merge commit. Invent no new behaviour in a conflict
   resolution.

4. **Resolve the spec layer by its rules.**
   - **A statement both sides changed** is not a hunk to pick: it is an
     amendment decision. Attended, ask the user which behaviour is true.
     Unattended, keep the base branch's statement and park the task that
     changed it, with both versions quoted.
   - **The same new ID used for two different statements.** An ID already
     on the base branch keeps its number. The incoming statement takes the
     next free number, and every reference to it follows — `verified-by`
     test names, the plan, commit messages still to be written.
   - **`pinned:` in registry.yaml** records which spec content the code
     satisfies. Keep the base branch's pin, then let `check` say whether
     the merged spec still matches it. A pin that neither side's code was
     verified against is never kept to make `check` pass.
   - **REGISTRY.md tables and registry.html** are generated: take either
     side, then `node specs/registry.mjs sync` (and `render` if tracked).
   - **Plans:** a checkbox takes the most advanced state from either side;
     run-log lines from both sides are kept, in time order.

5. **Verify and finish.** `node specs/registry.mjs check` when the repo has
   `specs/`; the test suite; then `git add` the resolved files and
   continue the operation (`git merge --continue`, `git rebase --continue`).
   Do not abort an operation the user started unless they ask.
