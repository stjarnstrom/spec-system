---
name: spec-run
description: >
  Run outstanding plans unattended to done — every question settled up front,
  work isolated in a worktree, each plan executed and reviewed, pins moved,
  the branch integrated, and a report of what needs the user. Use when the
  user wants to walk away while plans are implemented ("run it", "run it
  overnight", "take it from here"), or invokes /spec-run.
---

Run plans to done while the user is away. Everything that needs the user
happens before the run starts. After that, the run decides how, parks
questions about what, and stops only for the few things under Stops.

`run.mjs` below means `node ${CLAUDE_PLUGIN_ROOT}/scripts/run.mjs`; `run.mjs help`
lists its commands.
If `run.mjs active` shows a run in progress, this is a resume — after a
compaction or in a new session. Skip to step 4 and continue each plan from
`run.mjs status <plan>`.

## Procedure

1. **Scope.** The plans the user named, or every outstanding one:
   capabilities whose spec differs from its pin (`node specs/registry.mjs check`
   lists them with their plans) and standalone plans in
   `docs/changes/active/`. Order them so a plan whose capability
   `depends-on` another outstanding capability runs after it. A feature with
   no plan yet goes to spec-shape first — this skill runs plans; it does not
   write them.

2. **Readiness — settle it now, while the user is here.** Collect everything
   the run would otherwise stop for, then ask it one question at a time,
   recommended answer first:
   - **Open questions in the plans.** Tasks that cite an open `-U-`,
     `[human]` tasks, and whatever spec-implement's pre-flight would park.
     Each is answered now — spec-amend folds the answer into the spec
     before the run — or accepted as a park.
   - **Verification commands.** Test, typecheck, lint: from the repo's
     agent instructions, or its manifest (package.json scripts, Makefile,
     Cargo.toml, pyproject.toml). Confirm any you inferred.
   - **Baseline.** Run the suite on the starting commit. Red at baseline is
     the user's call: fix it first, or run anyway with those failures
     recorded as pre-existing.
   - **End state.** Leave the branch for review (the default), merge into
     the base branch locally, or push and open a pull request. Pushing and
     opening a PR act outside the repository, so they happen only on an
     explicit yes here.
   - **Permissions.** A permission prompt mid-run waits for the user. If
     the session cannot edit files and run the verification commands
     unprompted, say so, so the user can change modes (auto mode, or allow
     rules for those commands). You do not change permission settings.

   Then state the run in two lines: the plans, the task count, the end
   state, and what would stop it. That is the last message that needs an
   answer.

3. **Isolate.** On the default branch, work in a worktree: the harness's own
   tool when it has one (EnterWorktree in Claude Code); otherwise confirm
   `.worktrees/` is ignored (`git check-ignore -q .worktrees` — add it to
   `.gitignore` and commit if not) and
   `git worktree add .worktrees/<run-name> -b spec-run/<run-name>`. Already
   on a feature branch or in a linked worktree → run there. Install
   dependencies from the lockfile present: `pnpm-lock.yaml` → pnpm install,
   `bun.lock` → bun install, `uv.lock` → uv sync, `poetry.lock` → poetry
   install, `Cargo.lock` → cargo fetch, `go.sum` → go mod download,
   `package-lock.json` → npm ci. Then mark the run —
   `run.mjs active set <plan>…`, which the session hook reads after a
   compaction — and log its base on each plan:
   `run.mjs log <plan> "run: started (base <sha7>) — end state: <choice>"`.

4. **Run each plan** through spec-system:spec-implement, in order. Between
   plans, `check` passes and the plan's pin or archive commit has landed. A
   plan that ends partial keeps its pin; later plans that do not depend on
   it go ahead. One line of narration per task at most — the run logs are
   the record. While subagents work, wait in bounded stretches and keep the
   bookkeeping moving; never sit in one open-ended wait.

5. **Integrate** by the end state chosen in step 2, through
   spec-system:finish. A red suite on the integrated result stops the
   integration and goes under Blocked on me.

6. **Report**, then `run.mjs active clear` and remove `.spec-run/` — git
   and the plans are the record now. Lead with what needs the user:
   - **Blocked on me** — parked tasks and their questions, pre-existing
     failures, anything not integrated.
   - **Changed** — per plan: pin moved or not, statements now true with
     evidence, verified counts, and where the work is (branch, PR, merge).
   - **Found** — anomalies, deferred minors, and friction worth fixing in
     the repo: a rule the reviewer enforced by hand more than once is a
     candidate invariant with a `checked-by`.
   - **Rulings** — every ruling from every plan's run log, with its cost if
     wrong.

   When a notification tool is available, send one line as the run ends.

## Stops

A run stops early only for an irreversible or destructive operation, a
security-sensitive action, a side effect outside the repository not
authorised in step 2, or every remaining task parked. A behaviour question
parks one task, not the run. A red test is work, not a stop.

## Rules

- A run executes plans. It never writes or amends a spec. A parked
  question the user answers later goes through spec-amend, which unparks
  the task; the next run picks it up.
- No check-ins between tasks.
- `push --force`, `reset --hard` on a shared branch, `branch -D`, and
  `clean -f` are never part of a run.
