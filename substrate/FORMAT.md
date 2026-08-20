# Spec format

The schema every file in `specs/` follows. [REGISTRY.md](REGISTRY.md) is the
index and pin table; this file defines the shape of what it points at.

## What a spec is

A spec states what one capability does, at implementation detail, in the present
tense. It is truth: the code is checked against it, not the reverse.

A spec contains **no history and no rationale**. No "we used to do X", no "we
chose Y because". History lives in git, rationale in `docs/adr/`, vocabulary in
`CONTEXT.md` and `docs/TERMINOLOGY.md`. A spec that accretes archaeology stops
being readable as truth.

## What a capability is

- It must be stateable as observable behaviour at some contract. If it can't be,
  it's a layer, and layers are never specs.
- **Spec names are not package names.** A capability crosses package and process
  boundaries wherever the behaviour does.
- Needs a table of contents → it's two specs.
- Two people with different concerns must sign off → two specs and a
  `depends-on` edge.

## Frontmatter

```yaml
---
spec: sim-ingest          # slug, matches the filename
version: 2                # integer, incremented by an amendment
covers: |                 # what this capability is responsible for
not-covered: |            # behaviour deliberately outside it, no owner implied
depends-on:               # capabilities whose contract this one consumes
  - asset-catalog
excludes:                 # behaviour that belongs to a named other capability
  - simulation-view: schema-version compatibility and the mismatch warning
paths:                    # owned paths, `path#symbol` where a file is shared
  - packages/spine/src/utils/simLoader.ts
  - apps/vimotek/electron-main.js#sim:listSteps
---
```

`not-covered` and `excludes` are different claims. `not-covered` draws the
capability's edge. `excludes` names the capability on the other side of it, so
the registry can check that every exclusion has an owner and that the reverse
edge exists.

## Status and pins

`status` and both versions live in the registry, never in the spec's frontmatter —
one home, so they cannot drift. `status` describes the spec, never the evidence
behind it.

| status | meaning |
|---|---|
| `unspecified` | no spec yet, and one is wanted |
| `partial` | a spec exists and covers some of the owned paths |
| `adopted` | a spec exists, and the pinned version describes the code as it is |
| `contested` | the boundary itself is not agreed; do not pin code to it |
| `unspecified by design` | no spec will be written; behaviour is generated, delegated, or deliberately unconstrained |

The registry carries two versions. `version` is the spec's own — what the file
says. `pinned` is what the code satisfies. **They are equal when there is no
outstanding work, and `version` runs ahead of `pinned` for exactly as long as an
amendment is unimplemented.** That gap is the backlog, and it is the only place
the system records that the spec is currently a target rather than a description.
Moving the pin is the last act of implementing, never part of amending.

Verification is a third axis, carried in the registry's `verified` column as
`<verified>/<total>` requirements. An `adopted` spec with no tests behind it is a
normal, visible state — not a contradiction. The count is derived from the spec and
recomputed whenever it changes.

A spec's own version history lives in git and in the plan that produced it. It is
never written into the spec file: that is the same archaeology ban as everything
else.

## Statements

Three kinds, three ID spaces, one prefix per spec.

| kind | id | holds |
|---|---|---|
| requirement | `SIMI-001` | one normative behaviour, observable at a contract |
| invariant | `SIMI-I-001` | a property of the whole capability, true across every path through it |
| uncertainty | `SIMI-U-001` | something the code does not decide, recorded rather than guessed |

**IDs are never renumbered and never reused.** They are what plans, tests,
commits, ADRs, and anomalies point at. A requirement that splits keeps its id for
the surviving half and the new half takes the next free number. A requirement
that dies keeps its id and its heading, marked `withdrawn in vN`, so nothing
dangling ever resolves to the wrong statement.

**Prefer splitting a requirement to rewriting one.** Evidence is attached to a
statement, so widening a statement silently invalidates its `verified-by` — the
test still passes and now proves less than the spec claims. Leave the verified
statement alone under its own id and put the added behaviour in a new one. A
rewrite is right only when the original statement is no longer true at all.

An invariant is what a requirement cannot express: a memory envelope, a purity
rule, "this vocabulary does not escape this boundary". If a statement can be
tested at one call site it is a requirement; if it can only be violated by the
capability as a whole, it is an invariant.

An uncertainty is not a to-do. It records that reading the code twice will not
resolve the question, so a plan can cite it and a human can answer it. Where the
uncertainty sits inside a requirement, mark it inline as `UNCERTAIN:` and give
the numbered entry the detail.

### Requirement shape

```markdown
### SIMI-014 — An unparseable step file is skipped, not fatal
A step document whose root element is not `simState` is dropped from the run.
verified-by: packages/spine/src/utils/xmlParser.test.tsx#parseStepXml — malformed step files
```

Present tense, one behaviour, no rationale.

## verified-by

Evidence is many-to-many. On a requirement, `verified-by` takes one or more
entries, comma- or newline-separated:

- `path/to/file.test.ts` — the file covers it
- `path/to/file.test.ts#describe name` — that block covers it
- `UNVERIFIED` — nothing covers it

`UNVERIFIED` is a signal to keep, not a gap to paper over. **Do not write a test
to make a spec look better**; a test written to satisfy a spec it was derived
from verifies nothing. The `UNVERIFIED` count is what makes coverage arguable.

## checked-by

Invariants are largely falsifiable by static inspection, so they carry
`checked-by` instead of `verified-by`:

- `checked-by: <shell command>` — run from the repo root with `sh -c`; exit 0
  means the invariant holds. `registry.mjs check` runs every one, so a violated
  invariant fails the same gate as a broken pin.
- `checked-by: UNCHECKED` — the invariant is a runtime or design property no
  static command can falsify.

A check is usually a tripwire, not a proof — a grep that the bound is still 32,
that no import crosses the boundary, that no wire token appears in an
expression. Write the command to fail on the *violation*, keep it on one line,
and prefer a check that would survive a rename of the thing it guards. An
invariant whose command keeps needing edits on innocent changes is guarding the
implementation, not the property — weaken the command or mark it UNCHECKED.

## Anomalies

Each spec may have a sibling `<spec>.anomalies.md`: everything the code does that
nothing justifies — dead branches, functions that disagree, undocumented format
tolerance, fallbacks with no evident cause. One line each plus the path, grouped
by kind, fixing nothing.

An anomaly may cite the statement it contradicts. The list is the input to the
next amendment, and it is the reason adoption is worth doing on code nobody
intends to rewrite.

Not every anomaly is spec-level. A defect in a seam has no spec delta — seams are
unspecified by design, so their bugs are ordinary bugs. Neither does a defect with
no observable behaviour: dead code, a duplicated object key, a stale name. Fix
those as ordinary work and say in the plan why they carry no requirement. If every
anomaly converts into a requirement, the spec layer is absorbing code review.

## Amendment

Every change is a migration from `spec@vN` to `spec@vN+1`, including the first
one, which migrates from nothing. Amend the spec, derive the plan from the spec
*delta*, implement against the plan, then move the pin.

Adoption is the special case that describes reality and changes nothing.
**Adoption never smuggles in a fix**: the pin asserts the code satisfies the spec
right now, and a pin that is a lie from birth makes every later drift check
worthless.
