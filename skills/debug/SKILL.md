---
name: debug
description: >
  Diagnose a bug or a regression from a red feedback loop before any
  theory: reproduce, minimise, rank hypotheses, instrument, fix with a
  regression test. Use when something is broken, throws, fails a test,
  flakes, or got slower; when the user says debug, diagnose, or "why does";
  or before proposing any fix.
---

Find the cause before touching the code. Everything else in this skill is
mechanical once there is a fast signal that goes red on this bug.

## Procedure

1. **Build the feedback loop.** One command, run at least once, that goes
   red on *this* bug: it asserts the user's exact symptom, gives the same
   answer every run, finishes in seconds, and needs no human. In rough
   order of preference:
   - a failing test at the seam that reaches the bug;
   - a script against the running thing (an HTTP call, a CLI run with a
     fixture, a headless browser step);
   - a replay of a captured input or trace;
   - a throwaway harness around the suspect unit;
   - `git bisect run <command>` when a known-good commit exists;
   - a differential run, old against new;
   - a script that walks a human through the steps, as a last resort.

   Make it tighter until it is sharp, fast, and deterministic. For a flaky
   bug, raise the reproduction rate (loop it, add load, pin the seed) until
   the loop fails often enough to learn from. No loop, no theory: if you
   cannot build one, say what you tried and ask for what would let you —
   access, a redacted artefact, permission to instrument. Unattended, that
   request parks the task.

2. **Reproduce and minimise.** Confirm the loop shows the user's failure,
   not a neighbouring one. Then cut inputs, callers, config, and steps one
   at a time until every remaining element is needed for the failure.

3. **Check it against the spec.** When the repo has `specs/`, run
   `node specs/registry.mjs owns` on the implicated files and read the
   statements covering this behaviour:
   - a statement says X and the code does Y → a code bug under the pin:
     fix it, and point the statement's `verified-by` at the regression
     test if it lacked evidence;
   - the statement itself is wrong → the fix is an amendment
     (spec-system:spec-amend), not a code change to match a wrong spec;
   - no statement covers it (unowned code, a seam) → an ordinary bug;
     behaviour you find that nothing justifies goes on the anomaly list.

4. **Hypothesise.** Three to five ranked hypotheses before testing any.
   Each falsifiable: "if X is the cause, changing Y makes it disappear".
   Show the ranking; do not wait for a reply to start on the first.

5. **Instrument, one variable at a time.** A debugger or a targeted log
   beats logging everything. Tag every temporary log with one unique
   prefix (`[DEBUG-7f3a]`) so cleanup is a single grep. In a system with
   several components, log what enters and leaves each boundary once, and
   find the boundary where good input becomes bad output; then trace back
   up the call chain to where the bad value was born
   ([techniques.md](techniques.md)).

6. **Fix at the cause.** The regression test comes first, at the correct
   seam (spec-system:tdd): watch it fail, apply one fix, watch it pass,
   re-run the original loop and the full suite. No correct seam for the
   test is itself a finding — report it (spec-system:architecture).
   Once the cause is fixed, consider guarding the path it travelled
   ([techniques.md](techniques.md), defence in depth).

7. **Three failed fixes means the design is the question.** Stop fixing
   symptoms. Say what the three attempts showed and what structural
   question they raise. Attended, discuss it; unattended, park the task
   with that question.

8. **Clean up.** The `[DEBUG-` prefix greps to nothing; harnesses and
   repro scaffolding are gone or committed as tests; the commit message
   states the cause that turned out to be true.

## Rules

- Reading code to build a theory before the loop exists is guessing.
- One change at a time. A second fix stacked on an unverified first one
  hides which one mattered.
- "It passes now" without the loop's output from this turn is not a fix.
