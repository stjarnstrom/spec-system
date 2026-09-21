---
name: spec-implement
description: >
  Implement an outstanding spec amendment: build against the plan derived from
  the spec delta, produce the evidence each statement names, and move the
  pin as the last act. Use when a capability's spec file no longer matches its
  pin, the user wants to implement a spec change or migration plan, or invokes
  /spec-implement.
---

Implement against a plan. The spec is the target, the plan is the work-list,
and done is defined per statement as *evidence exists* — never as "the code
compiles".

## Procedure

1. **Gate and target.** `node specs/registry.mjs check` must pass. Find the
   capability whose spec file no longer matches its pin (`check` reports it as
   `amendment outstanding`, or `target` for a spec whose code does not exist
   yet) and read its `plan:` file and the delta statements it names. If every
   capability is in sync, stop — there is nothing to implement; suggest
   spec-amend.

2. **Work the tasks in the plan's order — test-first by default.** A delta
   statement describes behaviour the code does not have yet, so a test
   written from it is a genuine falsifier: it fails today by construction.
   Write that failing test, implement to green, and it becomes the
   statement's `verified-by`. (This inverts adoption's rule — there the spec
   came *from* the code, so a test written from it would be circular and is
   banned. Amendment implementation is the one place spec-derived tests
   prove something.) If the host repo has a TDD skill, run each task through
   it, seeded with the task's statements. Tasks the plan marks as
   independent may be dispatched to parallel subagents, each confined to its
   task's files with `owns` and merged behind the same gates below.

   For each task:
   - Implement inside the capability's owned paths. Run
     `git diff --name-only | xargs node specs/registry.mjs owns` as you go —
     every file outside the capability must be either a seam (expected for
     shared-type ripples: completing test fixtures of other owners counts),
     an excursion the plan sanctions by name, or a reason to stop and ask.
   - Write the evidence the task's statements name, then update their
     `verified-by:` from `UNVERIFIED` to the real test paths. The test exists
     because the behaviour needs proving — never to make the count look
     better. A statement implemented but not tested keeps `UNVERIFIED`,
     honestly.
   - Never weaken or delete a test named in any `verified-by:` without
     flagging it — that detaches evidence from a statement.
   - Keep the plan's checkboxes true as you go: `- [~]` when a task starts,
     `- [x]` when its statements have evidence, `- [!]` with a one-line
     reason when blocked. The plan is the progress record.
   - Before `- [x]`, judge the task's diff against the statements it names.
     Apply spec-review's verdicts yourself. Do not start a second review
     skill, and do not keep a ruling ledger. A named statement is satisfied
     when the diff matches it and its evidence exists, shown by command
     output from this turn. CONSISTENT covers statements this task was not
     supposed to change. CONTRADICTS or DRIFT on anything else means the
     task is not done: fix it, or stop and send it back to spec-amend. A
     diff that picks a side of an open `-U-` is a stop, not a ruling.

3. **Full verification.** The registry gate, the repo's test suite, and its
   typecheck/lint must all pass — the repo's own conventions say which
   commands. Fix what the diff broke, including fixture ripples in other
   capabilities' tests (their owners' evidence must keep proving what it
   proved before). No claim that this passed without the command output
   from this turn. An earlier run does not count.

4. **Move the pin — the last act.** Only when every task has landed, and
   the report cites the fresh `node specs/registry.mjs check` output and
   the fresh test output from step 3, run
   `node specs/registry.mjs pin <capability>` — it records the spec file's
   content hash as what the code now satisfies, moves the plan from
   `docs/changes/active/` to `docs/changes/completed/`, and drops `plan:`.
   Partial delivery leaves the pin where it is: update the plan with what
   landed and what remains, and say so plainly. The file/pin mismatch is the
   record; never close it aspirationally. If the plan is still in `active/`
   after pin, the vendored `registry.mjs` is older than this convention:
   move the file and delete the `plan:` line yourself, then suggest upgrading
   the substrate (compare `TOOL_VERSION`).

5. **Close the loop.** Annotate the anomaly-list entries the amendment
   consumed (e.g. mark them `[consumed: <plan>]`). Run `sync`; if
   `specs/registry.html` is tracked, run `render` so its progress bars
   match. Report per task with statement IDs and the new verified count.

## Rules

- No scope creep: new findings discovered while implementing go to the
  anomaly list or the next amendment, not into this diff.
- The pin move is one registry.yaml edit and belongs in the final commit,
  after the evidence, never before.
