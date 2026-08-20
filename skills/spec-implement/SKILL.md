---
name: spec-implement
description: >
  Implement an outstanding spec amendment: build against the plan derived from
  the vN→vN+1 delta, produce the evidence each statement names, and move the
  pin as the last act. Use when a capability's version is ahead of its pin, the
  user wants to implement a spec change or migration plan, or invokes
  /spec-implement.
---

Implement against a plan. The spec is the target, the plan is the work-list,
and done is defined per statement as *evidence exists* — never as "the code
compiles".

## Procedure

1. **Gate and target.** `node specs/registry.mjs check` must pass. Find the
   capability whose `version` is ahead of `pinned` and read its `plan:` file
   and the delta statements it names. If no capability has a gap, stop — there
   is nothing to implement; suggest spec-amend.

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

3. **Full verification.** The registry gate, the repo's test suite, and its
   typecheck/lint must all pass — the repo's own conventions say which
   commands. Fix what the diff broke, including fixture ripples in other
   capabilities' tests (their owners' evidence must keep proving what it
   proved before).

4. **Move the pin — the last act.** Only when every task has landed, set
   `pinned: N+1` in `specs/registry.yaml`. Partial delivery leaves the pin
   where it is: update the plan with what landed and what remains, and say so
   plainly. The version/pin gap is the record; never close it aspirationally.

5. **Close the loop.** Annotate the anomaly-list entries the amendment
   consumed (e.g. mark them `[vN+1]` with a header note). Run `sync`. Report
   per task with statement IDs and the new verified count.

## Rules

- No scope creep: new findings discovered while implementing go to the
  anomaly list or the next amendment, not into this diff.
- The pin move is one registry.yaml edit and belongs in the final commit,
  after the evidence, never before.
