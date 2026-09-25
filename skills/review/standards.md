# Standards axis

The repo's own documented standards come first: CONTRIBUTING,
CODING_STANDARDS, the conventions in AGENTS.md or CLAUDE.md, an ADR that
settles a pattern. What they allow is allowed, whatever the baseline below
says. Skip anything a linter or formatter the repo runs already enforces.

## Correctness — look here first

- Wrong results on a plausible input: boundaries, empty and huge inputs,
  unicode, time zones, concurrency, retries.
- Errors swallowed, turned into success, or reported with the wrong cause.
- Resources not released on the error path: handles, locks, connections,
  subscriptions.
- Security: untrusted input reaching a query, a shell, a path, a template,
  or a deserialiser; secrets in logs; missing authorisation checks.
- Data: a migration that loses rows, a format change without a reader for
  the old one, a cache that serves stale writes.
- State: shared mutable state without ownership, ordering that callers
  rely on but nothing guarantees.

## Tests

- A test that cannot fail, asserts nothing, or recomputes its expected
  value the way the code does.
- A test coupled to implementation: it breaks on a refactor while the
  behaviour holds.
- Mocks of the code's own modules, or assertions made on a mock.
- The riskiest path untested while trivial ones are covered.

## Smell baseline — judgement calls, never automatic

- **Mysterious name** — the name does not say what it is → rename.
- **Duplicated logic** — the same decision made in two places → one home.
- **Feature envy** — a function more interested in another module's data
  → move it there.
- **Data clumps** — the same few values always travel together → a type.
- **Primitive obsession** — strings and numbers standing in for domain
  concepts → a small type.
- **Repeated switches** — the same branching on the same tag in several
  places → one dispatch.
- **Shotgun surgery** — one change needs edits in many files → gather it.
- **Divergent change** — one file changes for unrelated reasons → split it.
- **Speculative generality** — abstraction for needs nobody has → delete it.
- **Message chains** — `a.b().c().d()` → ask the first object for what you
  need.
- **Middle man** — a module that only forwards → call through, or deepen it.
- **Shallow module** — an interface nearly as complex as what it hides; the
  deletion test (would complexity reappear across callers if it vanished?)
  says whether it earns its keep.

## Severity

- **Critical** — wrong results, data loss, a security hole, a crash on a
  plausible input.
- **Important** — the change cannot be trusted until fixed: a swallowed
  error, a test that proves nothing, duplicated logic, the riskiest path
  untested, code made hard to follow.
- **Minor** — naming, style, broader coverage.

A reason the author gave never lowers a finding's severity. A defect a
plan mandated is still reported, labelled as plan-mandated.
