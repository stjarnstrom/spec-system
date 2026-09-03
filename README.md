# spec-system

A Claude Code plugin for **spec-as-truth development**: the spec is the source
of truth, the code is the artifact. Changes go spec-first — amend the spec,
derive a plan from the spec *delta*, implement against the plan, then move the
pin that records which spec content the code satisfies. Specs carry no version
numbers: git holds their history, and the pin is a content hash of the spec
file — equal to the file means in sync, different means an amendment awaits
implementation, `none` means the code doesn't exist yet.

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
  files, `path#symbol`, or `dir/**`), the content-hash pin, status,
  dependency edges, seams.
- `specs/REGISTRY.md` — the generated human rendering.
- `specs/registry.mjs` — the tool (vendored, zero-dependency; js-yaml used if
  the host repo has it):
  - `check` — validates everything and runs every invariant's `checked-by`
  - `sync` — regenerates the REGISTRY.md tables
  - `owns <files>` — maps a diff to owning capabilities, seams, or unowned
  - `pin <capability>` — records the spec file's content hash as what the
    code satisfies; the last act of implementing. Also moves the named plan
    from `docs/changes/active/` to `docs/changes/completed/` and drops `plan:`
  - `render` — writes `specs/registry.html`, a self-contained browsable
    rendering of the registry, every spec, and every plan in
    `docs/changes/active/` and `docs/changes/completed/`.
    Statement IDs are anchors, so plans link to the statements they cite;
    pin states show as badges. Checkbox tasks in a plan (`- [ ]` / `- [x]` /
    `- [~]` in progress / `- [!]` blocked) become a progress bar that
    advances as spec-implement ticks them. A view for humans — the markdown stays the
    truth, and agents never read the HTML. Commit it or gitignore it as you
    prefer; output is deterministic, so regeneration is diff-quiet

The layer is ambient, not opt-in: `spec-init` also installs a git pre-commit
hook (blocks commits that stage `specs/` while `check` fails; warns when
staged code is spec-owned with no spec delta) and a section in the host
repo's agent instruction file so any agent session knows the rules. That
section includes a knowledge-layout map (vocabulary, ADRs, product briefs,
plans). `spec-init` does not create those folders — see
[docs/KNOWLEDGE.md](docs/KNOWLEDGE.md).

## Skills

| skill | verb |
|---|---|
| `spec-init` | scaffold `specs/` + hook + agent instructions; propose boundaries from git co-change history; stop for the human. Greenfield repos skip co-change and write first specs as targets (`pinned: none` + plan) |
| `spec-boundaries` | propose new capabilities, seams, and boundary corrections from co-change evidence and an ownership sweep; never draws the lines itself |
| `spec-adopt` | describe one existing capability as it is: statements, evidence from existing tests, anomalies recorded, nothing fixed, pinned as written |
| `spec-review` | review a diff against the pinned specs: CONSISTENT / CONTRADICTS / DRIFT / RESOLVES, by statement ID |
| `spec-amend` | edit a pinned spec and derive the migration plan from the delta; hard-stops on open uncertainties |
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
