# Good tests

A test is worth its maintenance when it fails on a real break and survives
everything else.

## Name the break

Before writing the body, answer: what change to production code should make
this test fail — and is that change a bug or a decision? If the only change
that fails it is a refactor, the test is coupled to the implementation. If
no plausible change fails it, it tests nothing.

- **Expected values come from an independent source**: a literal, a worked
  example, the statement's own numbers. An assertion that recomputes the
  expectation the way the code does (same helper, same formula, same
  builder on both sides) passes whenever the code runs.
- **Behaviour, not implementation.** Assert what a caller can observe
  through the interface. Private methods, call order between your own
  modules, and a database read that bypasses the interface are all
  implementation.
- **No change detectors.** Asserting that a constant equals itself
  breaks on every deliberate change and catches no bug. Test the behaviour
  that depends on the constant.
- **Run it, don't read it.** Scripts, config, and generated files are
  tested by executing them, never by grepping for their text.
- **Your code, not the framework.** Do not re-test what the library
  already guarantees.
- One behaviour per test, and the name says what, not how:
  `rejects a negative quantity`, not `calls validateInput`.

## Doubles

- Mock at system boundaries only: external services, time, randomness —
  sometimes the filesystem or database, when a real or in-memory stand-in
  is impractical. Your own modules and collaborators are not boundaries.
- A mock earns no assertions of its own. "The payment client was called
  once" is only the behaviour when the call itself is the contract; usually
  the behaviour is what the caller gets back.
- A double mirrors the real shape completely — every field the real
  response carries — or the test passes against data production never
  sends.
- Code is easier to test when it accepts its dependencies instead of
  creating them, returns results instead of producing side effects, and
  exposes specific operations (`getUser`, `createOrder`) instead of one
  generic `fetch(endpoint)`.
- Test-only hooks live in test utilities, never on production types.

## Waiting

Never sleep for a guessed duration. Wait on the condition itself — poll
until it holds, with a timeout whose message says what was awaited. A fixed
delay is right only when the delay is the behaviour under test, and then it
says so in a comment.

## The mutation check

Before calling the work done, take each plausible mistake in turn and ask
whether some test goes red:

- a wrong constant or boundary (`<` for `<=`)
- the other branch of a condition taken
- a side effect dropped
- an empty or default return
- a validation removed

A mistake no test catches is either a missing test or behaviour nobody
needs. Try the likeliest ones for real when the answer is not obvious.

## Proving a regression test

For a bug fix: the test passes with the fix; revert the fix and it fails;
restore the fix and it passes. Only then does it guard the bug.
