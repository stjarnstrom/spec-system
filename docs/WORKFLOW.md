# The workflow

How work moves from an idea to merged code, and how to hand a plan to the
system and walk away. The skills carry the procedures; this is the map for
the person driving them.

## Who decides what

| moment | you | the agent |
|---|---|---|
| **spec-shape** | purpose, behaviour, edge cases, test seams, what is out of scope — one question at a time, recommendation first | reads the code, the specs, the glossary, the ADRs; never asks you a fact it can look up |
| **spec-amend** | nothing new: it writes what you approved | allocates IDs, edits the spec, derives the plan |
| **spec-run readiness** | answers to open questions, the verification commands, a red baseline, the end state, permissions | collects every question the run would otherwise stop for, asked before it starts |
| **the run** | nothing | how to build it, logged as rulings; parks any question about what it does |
| **the report** | answers under Blocked on me; a look at the rulings | leads with what needs you |

The line through the middle is observable behaviour. How the code is
built is the agent's call, recorded when another engineer could reasonably
have gone the other way. What the code does is yours, and a run never
guesses it.

## Before you walk away

1. **Shape.** `/spec-system:spec-shape` — or just describe the feature; the
   session hook routes "let's build…" there. You approve the design section
   by section.
2. **Amend.** spec-shape hands the approved statements to spec-amend, which
   writes the spec delta and a plan in `docs/changes/active/`. Read the
   plan's task list: each task names the statements it makes true.
3. **Run.** `/spec-system:spec-run`. Its readiness step asks, one at a
   time, everything the run would otherwise stop for:
   - open `-U-` questions a task depends on — answer now, or accept that the
     task parks;
   - `[human]` tasks — do them now, or they park;
   - the verification commands, and a baseline run of the suite;
   - the end state: leave the branch (default), merge locally, or push and
     open a PR — the last only on your explicit yes;
   - permissions: the session must be able to edit files and run the test
     commands without prompting, or the run waits at the first prompt.
     Auto mode, or allow rules for the verification commands, both work.
     Keep prompts for destructive commands.

   After its two-line summary, nothing needs you until the report.

Instructions that help any long run, in your user or project `CLAUDE.md`:

```
When a step doesn't need my input, keep going. Put status notes in the same
message as your next action. Stop and ask only when you can't continue
without me, or before anything destructive: deleting data, force-pushing,
or changing anything outside this repository.
```

## During the run

For each task, in plan order:

```
run.mjs start ─► implementer (tdd) ─► reviewer ─┬─► run.mjs done ─► next task
                     ▲                          │    (ticks only on green)
                     └──── fix rounds (≤5) ─────┘
```

- **The plan is the ledger.** Checkboxes are task state (`[ ]` `[~]` `[x]`
  `[!]`), and `## Run log` records every start, ruling, fix round, park,
  deferred minor, and completion. After a compaction, the session hook
  reminds the session a run is in progress, and `run.mjs status <plan>`
  says exactly where it stands. The run trusts the plan and `git log`, not
  its memory.
- **Files, not pastes.** Briefs (the task with its statements verbatim),
  implementer reports, and diff packages live in `.spec-run/<plan>/`, which
  ignores itself in git. Subagents get paths; the controlling session
  never reads a diff, which keeps its context small enough to last.
- **Reviews are gates.** A task is done when every statement it names is
  `SATISFIED` with a test that fails without the change, and no Critical or
  Important finding stands. Minor findings are logged, not looped on. After
  five fix rounds the controller adjudicates, logged — except a statement
  not yet satisfied, `CONTRADICTS`, `DRIFT`, and `RESOLVES`, which are
  never ruled away: those park.
- **Parks.** A behaviour question parks its task with the question in the
  log. Any commits the task made move to `spec-run/parked/<plan>/<T>` and
  are reverted on the run branch (`run.mjs park` does both), so the line
  carries only reviewed, green work. Tasks that do not depend on it carry on.
- **Stops.** Only an irreversible or destructive operation, a
  security-sensitive action, a side effect outside the repo you did not
  authorise, or every remaining task parked.
- **Parallel.** Tasks the plan marks `independent`, with disjoint owned
  paths, may run at once, each in its own worktree. Sequential is the
  default.

Want to change something mid-run? Send it. A change to *how* is folded in
as a ruling. A change to *what* is a spec change: the run parks the
affected tasks, spec-amend takes the change, and the tasks resume.

## Coming back

The report has four headings, in this order:

1. **Blocked on me** — parked tasks, each with a one-line question.
   Answer them; spec-amend folds each answer into the spec (and an ADR,
   when it passes the three gates), rewrites the parked task to cite the
   answer's statements, and unparks it. Run spec-run again and it picks
   those tasks up.
2. **Changed** — per plan: whether the pin moved, the statements now true
   with evidence, the verified count, and where the work is.
3. **Found** — anomalies, deferred minors, repo friction worth a fix.
4. **Rulings** — every implementation decision the run made, with what it
   costs if wrong. They also stay in the plan's run log after the plan
   moves to `completed/`.

A plan with anything parked is partial: its pin has not moved, and the
file/pin mismatch still records the outstanding work.

## Other ways in

- **A bug** → `debug`. It builds a red feedback loop first, then asks
  whether a pinned statement covers the behaviour: a code fix under the pin
  (with the regression test as `verified-by`), or an amendment when the
  statement itself was wrong.
- **Structure that fights you** → `architecture`. It ranks deepening
  candidates, designs the chosen interface twice, and writes the result as a
  standalone plan (`capability: none`), which spec-run executes like any
  other. `registry.mjs archive` closes it.
- **A branch or PR to review** → `review`: spec and standards axes in
  separate subagents, never merged. Comments you received → the same skill's
  second half.
- **Many independent units** → `fan-out`: an audit across services, a
  migration across packages, several unrelated failures.
- **Existing code with no spec** → `spec-init`, `spec-boundaries`,
  `spec-adopt`. Adoption describes, never fixes; the anomaly list it writes
  is the input to the first amendment.

## Cost

Subagents inherit the session's model. The run spends tokens on fresh
contexts per task and on reviews; it saves them by keeping the controller's
context free of diffs and history, which is also what lets a run last for
hours. A plan with a single small task runs inline instead.
