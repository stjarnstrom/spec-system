# Where the workflow layer came from

Up to 0.11 this plugin was only a truth layer: specs, pins, and the verbs
that move them. Grilling, test-first work, diagnosis, review, and
subagent-driven execution were left to whatever a host already ran —
usually [obra/superpowers](https://github.com/obra/superpowers) or
[mattpocock/skills](https://github.com/mattpocock/skills). That left the
host with two specs, two plans, and two ideas of a seam, and every
handoff between the plugins lost the statement IDs.

1.0 owns the whole loop. Every discipline now lands on the spec layer's
objects: a test is the evidence for a statement, a review finding cites a
statement ID, a ruling lives in the plan that the pin archives, and a
plan task names the statements it makes true. Both source repos are MIT;
[CREDITS.md](CREDITS.md) carries their notices.

This file is the why, for people reading the plugin. Host repos get the
short rules through the injected
[AGENTS.section.md](../substrate/AGENTS.section.md) and the session hook.

## What each skill took, and what changed on the way in

| skill | from superpowers | from mattpocock/skills | what the spec layer changed |
|---|---|---|---|
| `spec-shape` | brainstorming: purpose first, path classification (in doubt, go heavier; the ratchet only goes up), one question per message, 2–3 approaches, approval per section | grilling: facts from the code, decisions from the user; glossary challenged and updated inline; three-gate ADRs | The output is approved *statements*, not a dated design doc. They go to spec-amend, which allocates IDs and derives the plan. |
| `spec-amend` (plan) | writing-plans: review focus, decisions-not-transcript, a task sized to one reviewer's gate | to-tickets: tracer bullets, prefactoring first, expand–contract, criteria red at the base commit | Tasks name statement IDs; the plan is derived from the spec delta, and its run log is the ledger. |
| `spec-implement` | subagent-driven-development: fresh implementer per task, four statuses, five-part dispatch, one reviewer with a spec and a quality verdict, 5-round fix loop with scoped re-review, adjudicate only at the cap, the pre-judging tripwire, one final fix wave, rulings | implement-spec: context pointers, not pasted content; parallel worktrees for disjoint tasks | Rulings decide *how* only; a behaviour question parks the task. A statement not yet satisfied, and `CONTRADICTS`, `DRIFT`, `RESOLVES`, are never ruled away. The pin moves last. |
| `spec-run` | the autonomy window, the closed list of stops, bounded waits, SessionStart re-injection after compaction | AFK vs HITL typing (`[human]` tasks), human-only work kept out of the agent's path | Every question is asked before the run starts. The report leads with Blocked on me, and rulings survive in completed plans instead of dying with the workspace. |
| `tdd` | iron-law ordering, verify red for the right reason, the whole suite not just the file, `writing-good-tests` (name the break, no mirror assertions, the mutation check) | vertical slices, tests only at agreed seams, mocks only at system boundaries | The test comes from a statement and becomes its `verified-by`. Adoption still never writes tests. |
| `debug` | systematic-debugging's phases, boundary instrumentation, three failed fixes means the architecture is the question, the technique files | diagnosing-bugs: no theory before a red feedback loop, minimise, 3–5 ranked falsifiable hypotheses, tagged debug logs | Step 3 asks whether a pinned statement covers the behaviour: a code fix under the pin, or an amendment when the statement is wrong. |
| `review` | receiving-code-review: verify before implementing, push back with evidence, no performative agreement | code-review: two axes in isolated subagents, never merged or re-ranked; repo standards over a smell baseline | The spec axis is spec-review: every finding cites a statement ID. `CONTRADICTS`/`DRIFT` are amend-or-revert decisions. |
| `architecture` | — | improve-codebase-architecture and codebase-design: deep modules, the deletion test, dependency categories, design-it-twice, one candidate per session | A deepening lands as a standalone plan; a structural rule lands as an invariant with a `checked-by` proven to bite; a wrong capability boundary goes to spec-boundaries. |
| `fan-out` | dispatching-parallel-agents; the diagnosing analysts' rule that a finding without `path:line` is discarded | — | Units follow capability lines; audit findings go to the anomaly list, not into fixes. |
| `merge-conflicts` | — | resolving-merge-conflicts: primary sources, both intents, invent nothing | Statement IDs are never renumbered on the base side, a statement both sides changed is an amendment decision, and a pin is never kept just to make `check` pass. |
| `finish` | finishing-a-development-branch: verify first, three options, capture paths before `cd`, provenance-based clean-up, never force | the PR body comes from the primary source, not the diff | Test the merge before committing it (`--no-commit`), so a red merge leaves the base branch untouched. The PR body lists the statements made true. |
| agents | the implementer and task-reviewer prompts | the review agent enforces standards; the implementer does not | Real plugin agents with tool lists: the reviewer has no edit tools (Bash stays, for git and a focused test), and neither agent can spawn subagents. Superpowers enforces these with prompt text only. |
| `scripts/run.mjs` | `task-brief`, `review-package`, `task-done`, the ledger grammar | — | The brief resolves statement IDs to their verbatim text and owned paths. The ledger is the plan file itself. |

## Where the sources disagreed, and what was decided

The user settled four conflicts directly:

1. **Ambiguity during an unattended run.** Superpowers rules on
   everything and keeps going; spec-amend's rule was a hard stop on any
   open `-U-`. Decision: rule on implementation, park behaviour. How the
   code is built is the run's call, logged with its cost if wrong. What
   the code observably does is the user's: the task parks, the run
   continues with tasks that do not depend on it, and the question heads
   the report.
2. **Session-start injection.** Superpowers injects a forceful bootstrap
   into every session; Matt's plugin injects nothing. Decision: a calm
   skill map (about 350 tokens), the spec rules only in repos with
   `specs/`, and a resume pointer when a run is in progress. It is
   re-injected after compaction.
3. **Subagent models.** Superpowers tiers models by role. Decision: every
   subagent inherits the session model.
4. **Interview style.** Superpowers asks one question per message; Matt
   asks the whole frontier in rounds. Decision: one question per message,
   multiple choice, recommendation first, design approved section by
   section.

These were resolved in the design, because the sources address different
moments rather than truly conflicting:

- **One reviewer or two axes.** Superpowers merged spec and quality into
  one per-task reviewer on cost evidence; Matt keeps two isolated axes.
  Both hold: one reviewer per task (cheap, and task-scoped), two axes
  for a branch or PR review.
- **Sequential or parallel implementers.** Superpowers never runs two;
  Matt's implement-spec runs a frontier in parallel worktrees.
  Sequential is the default here. Parallel is allowed only for tasks the
  plan marks `independent` whose owned paths are disjoint, each in its own
  worktree and merged before its `done`. Note that an isolated worktree
  branches from the default branch, so the implementer checks out the
  base commit first.
- **The refactor step.** Superpowers keeps red-green-refactor; Matt
  dropped refactor from the loop because agents skipped it. Here, tidying
  on green inside the task is allowed; restructuring is a review finding.
- **Rulings dying with the workspace.** Superpowers deletes its ledger at
  the end. Here the ledger is the plan's run log, and the plan moves to
  `completed/`, so every ruling stays reviewable in git.
- **Code in plans.** Superpowers' own v6.4.2 moved plans from transcripts
  of the code to decisions. The spec layer already worked that way: a task
  names statements, and the implementer reads them verbatim.

## Left out, and why

- **Issue-tracker pipelines** — to-spec, to-tickets, triage, wayfinder.
  The backlog here is the file/pin mismatch, and plans live in the repo. A
  tracker ticket can point at a plan; it does not replace one.
- **writing-skills and skill evals.** They are meta-work on agent
  instructions, not engineering on a host repo. Use `claude plugin eval`
  and Anthropic's skill-creator.
- **The visual brainstorming companion.** A local server for mock-ups;
  spec-shape's prototypes cover the questions that need a picture.
- **teach, wizard, handoff, wait-what, ask-matt.** The plan is the
  handoff; the session hook is the router.
- **Persuasion-style enforcement** — ALL-CAPS directives, "delete means
  delete", bans on gratitude. Current models follow calm, specific
  instructions better, and superpowers' own newer skills moved the same
  way. Where a rule matters, it is enforced mechanically instead: the
  reviewer has no edit tools, `done` ticks a task only on green, and
  `archive` refuses unticked plans.

## If superpowers or mattpocock/skills is still installed

Both work beside this plugin, but they collide on four words. Inside
`specs/`, use the local meaning.

- **Spec.** Here: present-tense implementation truth with stable IDs.
  Superpowers' dated design docs and Matt's `to-spec` issues are
  desired-tense briefs; if you keep those, they belong in
  `docs/product-specs/`.
- **Plan.** Here: a delta-derived task list whose tasks name statements.
  `writing-plans` and `to-tickets` produce a different object; do not
  feed them to spec-implement.
- **Seam.** A registry seam is an unowned path in `specs/registry.yaml`; a
  module seam is Feathers' place where behaviour changes without an edit.
  Say which.
- **Backlog.** Here, the file/pin mismatch. A tracker's `ready-for-agent`
  label does not say whether code satisfies a spec.

Running two bootstraps doubles the always-on context and the two will
compete to trigger. Pick one plugin per repo for the workflow.
