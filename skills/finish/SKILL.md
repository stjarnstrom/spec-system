---
name: finish
description: >
  Integrate finished work: verify it, then merge locally, push and open a
  pull request, or keep the branch — and clean up the worktree safely. Use
  when implementation is done and the branch needs to go somewhere, when
  the user says "wrap it up", "merge it", "open a PR", or at the end of
  spec-run.
---

Verify, choose, integrate, clean up.

## Procedure

1. **Verify.** The full suite, typecheck, lint, and — with a spec layer —
   `node specs/registry.mjs check`, all with output from this turn. Red
   stops here: integration waits for green, and the failure is reported.

2. **Capture where you are** before changing directory: the branch, the
   base branch (confirm it if unsure), the worktree path
   (`git rev-parse --show-toplevel`), and the main checkout
   (`git rev-parse --git-common-dir`).

3. **Choose** — or use the choice spec-run's readiness step recorded:
   1. Merge into the base branch locally.
   2. Push and open a pull request.
   3. Keep the branch as it is.

   Pushing and opening a PR act outside the repository: they need the
   user's yes, given now or at spec-run's readiness step. Discarding work
   happens only when the user asks for it by name, and after they confirm
   the exact branch.

4. **Integrate.**
   - **Merge:** from the main checkout, update the base branch, then
     `git merge --no-ff --no-commit <branch>` and run the suite on the
     merged tree before committing. Green → commit the merge and clean up.
     Red → `git merge --abort`, keep the work branch, and report; nothing
     on the base branch changed.
   - **Pull request:** push the branch and open the PR (`gh pr create`).
     The body comes from the plan, not from reading the diff: what changed
     and why, the statement IDs now true and the tests proving them, the
     verification commands and their results, rulings made during the run,
     and anything parked. Keep the worktree until the PR merges.
   - **Keep:** report the branch and worktree path.

5. **Clean up** only what this workflow created: a worktree under
   `.worktrees/` or one the harness's worktree tool made. Remove it with
   `git worktree remove`. If git refuses because of untracked or modified
   files, show them and ask — never force it. Delete the merged branch with
   `git branch -d`, which refuses unmerged work.

## Rules

- No force-push, no `reset --hard` on a shared branch, no `branch -D`.
- A rejected push is information: fetch, integrate, re-verify, push again.
