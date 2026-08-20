# spec-system

A Claude Code plugin for **spec-as-truth development**: the spec is the source
of truth, the code is the artifact. Changes go spec-first — amend the spec,
derive a plan from the spec *delta*, implement against the plan, then move the
pin that records which spec version the code satisfies.

## Install

```
/plugin marketplace add stjarnstrom/spec-system
/plugin install spec-system@stjarnstrom
```

## The shape of the system

A repo that adopts this carries a `specs/` directory:

- `specs/FORMAT.md` — the schema: statement kinds (requirements `PREFIX-NNN`,
  invariants `PREFIX-I-NNN`, uncertainties `PREFIX-U-NNN`), ID stability rules,
  `verified-by` (test evidence) and `checked-by` (falsifying shell commands),
  and what a spec must never contain (history, rationale).
- `specs/registry.yaml` — machine truth: capabilities, owned paths (whole
  files, `path#symbol`, or `dir/**`), spec `version` vs code `pinned`, status,
  dependency edges, seams.
- `specs/REGISTRY.md` — the generated human rendering.
- `specs/registry.mjs` — the tool (vendored, zero-dependency; js-yaml used if
  the host repo has it):
  - `check` — validates everything and runs every invariant's `checked-by`
  - `sync` — regenerates the REGISTRY.md tables
  - `owns <files>` — maps a diff to owning capabilities, seams, or unowned

The layer is ambient, not opt-in: `spec-init` also installs a git pre-commit
hook (blocks commits that stage `specs/` while `check` fails; warns when
staged code is spec-owned with no spec delta) and a section in the host
repo's agent instruction file so any agent session knows the rules.

## Skills

| skill | verb |
|---|---|
| `spec-init` | scaffold `specs/` + hook + agent instructions; propose boundaries from git co-change history; stop for the human. Greenfield repos skip co-change and write first specs as targets (`version: 1, pinned: 0` + plan) |
| `spec-boundaries` | propose new capabilities, seams, and boundary corrections from co-change evidence and an ownership sweep; never draws the lines itself |
| `spec-adopt` | describe one existing capability at v1: statements, evidence from existing tests, anomalies recorded, nothing fixed, pin at 1 |
| `spec-review` | review a diff against the pinned specs: CONSISTENT / CONTRADICTS / DRIFT / RESOLVES, by statement ID |
| `spec-amend` | move a spec vN → vN+1 and derive the migration plan from the delta; hard-stops on open uncertainties |
| `spec-implement` | build against the plan test-first (a delta statement is a genuine falsifier), done = evidence exists per statement, pin move as the last act |

New here? Start with [docs/ONBOARDING.md](docs/ONBOARDING.md).

## Where the rules come from

Every rule in these skills was earned by a mistake during hand runs across
three repos (a pnpm monorepo, a flat Vite prototype, a Rust+Python+TS
polyglot): adoption never smuggles fixes; amendments split requirements rather
than rewrite them (evidence detaches silently); seam defects get no
requirement; anomaly→statement conversion is well under 1:1; amend must stop
on open uncertainties; invariants are grep-verified before they are kept.
[docs/DESIGN.md](docs/DESIGN.md) is the full design with the evidence trail;
[docs/ORIGIN.md](docs/ORIGIN.md) is the handoff that started it.
