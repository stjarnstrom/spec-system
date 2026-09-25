---
name: spec-implement
description: >
  Execute a plan task by task: a fresh implementer subagent per task, a
  reviewer after each, evidence per statement, and the pin moved last. Use
  when a capability's spec no longer matches its pin, the user wants a plan
  in docs/changes/active/ implemented, or invokes /spec-implement. For a
  walk-away run over one or more plans, spec-run wraps this.
---

Execute a plan. The spec is the target, the plan is the work list and the
ledger, and done is defined per statement as *evidence exists* — never as
"the code compiles".

`run.mjs` below means `node ${CLAUDE_PLUGIN_ROOT}/scripts/run.mjs`; `run.mjs help`
lists its commands. It keeps
your context small: briefs, reports, and diffs pass between subagents as
files, and the plan's checkboxes and `## Run log` are the state a run
resumes from. You coordinate; the implementer and reviewer subagents read
and write the code.

## Procedure

1. **Gate and target.** `node specs/registry.mjs check` must pass. The
   target is the capability whose spec no longer matches its pin (`check`
   says `amendment outstanding`, or `target`) and the plan its `plan:`
   names — or a standalone plan in `docs/changes/active/` (header
   `capability: none`). Nothing outstanding → stop and suggest spec-shape.
   Then `run.mjs status <plan>`. Ticked or in-progress tasks mean this is a
   resume: continue from what the plan and `git log` say, not from memory.

2. **Pre-flight, before the first task.** Read the plan once, with the
   delta statements it names. Settle now what would otherwise surface
   mid-run, and log each decision with
   `run.mjs log <plan> "pre-flight: ruling — <decided> — <why> — <cost if wrong>"`:
   - Tasks that touch the same file or interface without an `after:`
     between them → decide their order.
   - Tasks citing an open `-U-`, and `[human]` tasks → ask the user if they
     are here; otherwise `run.mjs park` them.
   - Statements that contradict each other — including a statement whose
     plain reading settles an open `-U-` — or a task whose approach would
     break a pinned statement → a spec problem. Attended: stop and send it
     back to spec-amend. Unattended: park the affected tasks. A pre-flight
     ruling settles how, never what; "do it as written until the question
     is answered" is a ruling on behaviour.
   - The verification commands — test, typecheck, lint — from the repo's
     agent instructions.

3. **Per task, in plan order.** A task is ready when every task in its
   `after:` is `[x]`.

   a. **Start.** `run.mjs start <plan> <T>` marks it `[~]`, logs the base
      commit, and writes the brief: the task, its statements verbatim, the
      owned paths, test seams, and review focus. It prints the brief and
      report paths.

   b. **Dispatch the implementer** — Agent tool,
      `subagent_type: spec-system:implementer`. The prompt carries five
      things: one line on where the task fits; the brief path ("read this
      first — it is your requirements"); interfaces and decisions from
      earlier tasks the brief cannot know; your rulings on any ambiguity you
      noticed; the base commit and report path. Nothing pasted from the plan
      or from earlier tasks. Keep the agent id: fix rounds resume it.

   c. **Handle its status.**
      - `DONE` → review.
      - `DONE_WITH_CONCERNS` → settle a correctness or scope concern before
        review; note an observation and review.
      - `NEEDS_CONTEXT` → answer from the spec, the plan, and the code, and
        resume the same agent (SendMessage to its id).
      - `BLOCKED` on how — the approach fails, the task is too big → more
        context, a split, or a ruling, then re-dispatch. Never resend an
        unchanged prompt.
      - `BLOCKED` on what — behaviour no statement settles, or an open
        `-U-` → park it (below). Ask the user if they are here; otherwise
        carry on with tasks that do not depend on it.

      **Parking a task mid-flight.** `run.mjs park <plan> <T> "<question>"`.
      If the task has commits since its base, keep them off the run branch
      so every later `done` sees only reviewed, green work:
      `git branch spec-run/parked-<T>` then `git revert --no-edit <base>..HEAD`,
      and log where the work went. When the question is answered — through
      spec-amend, which rewrites the task to cite the answer's statements —
      `run.mjs unpark <plan> <T> "<answer>"` puts it back in the queue, and
      the parked branch is there to cherry-pick from.

   d. **Review.** Log each ruling the implementer's reply lists:
      `run.mjs log <plan> "<T>: ruling — <decided> — <why> — <cost if wrong>"`.
      The report file is scratch and goes when the run ends; the plan
      keeps the ruling. Then `run.mjs package <plan> <base>` writes the
      diff package.
      Dispatch `spec-system:reviewer` in task mode with the brief, report,
      and package paths. Your prompt names files and a mode; it never tells
      the reviewer what to let pass. Words like "do not flag", "at most
      Minor", or "the plan chose" in your prompt mean you are pre-judging —
      take them out. Settle each `CANNOT VERIFY` yourself by reading the
      code or running the one test; a confirmed gap fails the review.

   e. **Fix loop**, when a statement is not `SATISFIED` or a Critical or
      Important finding stands — at most five rounds:
      - Rounds 1–3 resume the same implementer with the findings verbatim.
        Rounds 4–5 go to a fresh implementer, told how many attempts came
        before and to read the report file first.
      - Each round ends with a scoped re-review: package from the head the
        last review saw, reviewer in re-review mode, findings verbatim.
        Log it: `<T>: fix round <r>/5 — <x> addressed, <y> open`, and log
        any new rulings the fix reply lists.
      - Minor findings never enter the loop:
        `run.mjs log <plan> "<T>: minor (deferred) — <finding>"`.
      - At the cap, and only there, adjudicate what is still open. Reviewer
        wrong → log a ruling saying why the code stands. Real but nothing
        downstream builds on it → log a ruling deferring it. Real and
        load-bearing → park the task.
      - A statement still `MISSING` or `PARTIAL`, and any `CONTRADICTS`,
        `DRIFT`, or `RESOLVES`, is never ruled away: the code is fixed to
        the statement, or the task parks. A task is ticked only when every
        statement it names is `SATISFIED`.
      - You do not edit code in this loop yourself. It skips review and
        fills your context with diffs.

   f. **Done.** `run.mjs done <plan> <T> <base> -- <test command>` runs the
      tests and, only on exit 0, ticks `[x]` and logs the commit range and
      result line. Red records nothing — that is another fix round. Commit
      the plan file so the ledger is in git as well as on disk.

   Tasks marked `independent` whose owned paths are disjoint may run in
   parallel: each implementer dispatched with `isolation: "worktree"`, its
   own branch name, and the base commit; each reviewed from its own branch
   (`run.mjs package <plan> <base> <task-branch>`); each branch merged into
   the run branch (spec-system:merge-conflicts when needed) before its
   `done` runs on the merged result. One at a time is the
   default — parallel pays only when tasks are many and truly disjoint.

4. **Final review.** `run.mjs package <plan> <run base>` over everything
   the plan changed — the run base is the first base in the run log;
   `spec-system:reviewer` in final mode with the package and the plan. Its
   findings go to one implementer as a single list, then one scoped
   re-review. What remains after that gets a logged ruling or a park —
   there is no second wave, and the never-ruled-away list in step 3e holds
   here too. Each line under Declined to judge gets a one-line ruling in the
   log.

5. **Full verification**, after every fix has landed. `check`, the whole
   suite, typecheck, and lint — the repo's own commands, output from this
   turn. An earlier run does not count. Breakage goes back through an
   implementer, not your own edits. Fixture ripples in other capabilities'
   tests are part of the job: their evidence must keep proving what it
   proved.

6. **Move the pin — the last act.** Only when every task is `[x]` and
   step 5's output is fresh: `node specs/registry.mjs pin <capability>`
   records the spec file's content hash, moves the plan to
   `docs/changes/completed/`, and drops `plan:`. A standalone plan:
   `node specs/registry.mjs archive <plan>`. Anything parked means partial
   delivery: the pin stays, the plan stays in `active/`, and the report
   says what remains — the file/pin mismatch is the record, never closed
   aspirationally. (A vendored `registry.mjs` older than 0.8.0 lacks
   `archive`: move a finished standalone plan to `completed/` yourself and
   suggest upgrading the substrate.)

7. **Close the loop and report.** Mark the anomaly-list entries the
   amendment consumed (`[consumed: <plan>]`). Run `sync`; if
   `specs/registry.html` is tracked, `render`. Then report under four
   headings, in this order:
   - **Blocked on me** — every parked task with its question, each
     answerable in a line.
   - **Changed** — per task: statement IDs, commits, and the verified count
     before and after.
   - **Found** — deferred minors, anomalies, anything outside the plan.
   - **Rulings** — every `ruling` line in the run log, with its cost if
     wrong. Exhaustive: a ruling left out of the report was made in secret.

## Rulings and questions

How the code is built is yours: decide, log the decision when another
engineer could reasonably have gone the other way, and continue. What the
code observably does belongs to the spec: attended, ask; unattended, park
the task and keep going with the rest. A ruling never adds, removes, or
alters behaviour a caller can observe.

Stop early only for an irreversible or destructive operation, a
security-sensitive action, a side effect outside this repository the user
has not authorised, or every remaining task parked. Nothing else earns a
check-in; a progress summary between tasks costs the user attention and
buys nothing.

## Rules

- Subagents are the default for any plan with two or more tasks to run.
  A plan with a single small task, or a session without a subagent tool,
  runs the same loop inline: `start`, spec-system:tdd, `done`, then one
  reviewer at the end (or a self-review, logged as such).
- No scope creep. Findings outside the plan go to the anomaly list or the
  report's Found.
- The pin move is the final commit's edit, after the evidence.
