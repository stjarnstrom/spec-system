---
name: tdd
description: >
  Test-first development: one failing test per behaviour, watched red, then
  the least code that turns it green. Use when implementing a feature, a
  spec statement, or a bug fix; when the user mentions TDD, red-green, or
  test-first; and inside every implementer task.
---

Write the test, watch it fail, make it pass. A test you never saw fail may
be testing nothing.

## Where a test comes from

- **A spec statement** in an amendment or a target spec. The statement
  describes behaviour the code does not have yet, so its test fails today
  by construction — that is what makes it evidence. Once green, point the
  statement's `verified-by:` at it (`path#describe name`).
- **A bug.** The regression test that reproduces it
  (spec-system:debug finds it).
- **Unowned code.** The behaviour the user asked for.
- **Never during adoption.** A test derived from a spec that was derived
  from the code proves nothing (spec-adopt keeps `UNVERIFIED` instead).

## Where a test lives

At the test seam: the contract the behaviour is observable at. A plan names
it under Test seams; otherwise it is the highest public interface that
reaches the behaviour. Test through that interface and nothing past it.
When the only way to test a behaviour is to reach into internals, the
module is the wrong shape — report that (spec-system:architecture) rather
than testing the internals.

## The loop — one behaviour at a time

Work in vertical slices: one test, the code for it, then the next. Each test
is a tracer bullet aimed with what the last one taught. Writing every test
first and every line of code after tests behaviour you imagined, not
behaviour you found.

1. **Red.** One test for one behaviour. Run it. It fails, and for the
   reason the behaviour predicts: an assertion about the missing behaviour
   — not an import error, a typo, or a missing fixture. A failure for the
   wrong reason is fixed until the test fails for the right one.
2. **Green.** The least code that passes. Nothing for the next test,
   nothing speculative.
3. **Suite.** Run the project's suite, not just the file. Name every
   failure, including ones you did not cause.
4. Next behaviour.

Tidy on green, inside the task's own code, and run the suite after.
Restructuring beyond that is a finding for review, not part of the loop.

Code written before its test is set aside, not adapted: delete it (or
commit it and revert), write the test, watch it fail, then write the code
again. Fitting the early code under a new test skips the one moment that
proves the test can fail.

## When test-first does not fit

Configuration, glue, generated code, and changes with no observable
behaviour — dead-code removal, a rename — would only get tautological
tests. Verify those with the check that would catch a regression
(typecheck, lint, an invariant's `checked-by`) and say so in the report.

## Evidence

Report the RED command, its failing output, and why that failure was the
expected one; the GREEN command and its output; the suite command and its
result line. Before calling the work done, run the mutation check in
[good-tests.md](good-tests.md).

What makes a test worth keeping — naming the break, independent expected
values, mocks only at system boundaries — is in
[good-tests.md](good-tests.md).
