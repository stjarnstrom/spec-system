# spec-system

A Claude Code plugin for **spec-as-truth development**, and the whole
engineering loop around it. The spec is the source of truth and the code is
the artifact. Changes go spec-first: shape the change with the user,
amend the spec, derive a plan from the spec *delta*, and run the plan —
unattended if you like — with a fresh implementer and a reviewer per task.
The last act is moving the pin that records which spec content the code
satisfies.

Specs carry no version numbers. Git holds their history, and the pin is a
content hash of the spec file: equal to the file means in sync, different
means an amendment awaits implementation, `none` means the code does not
exist yet.

## Install

```
/plugin marketplace add stjarnstrom/spec-system
/plugin install spec-system@stjarnstrom
```

Then, in a repo: `/spec-system:spec-init`. [docs/ONBOARDING.md](docs/ONBOARDING.md)
is the first hour; [docs/WORKFLOW.md](docs/WORKFLOW.md) is the full loop,
including how to walk away from a run.

## The loop

```
idea ─► spec-shape ─► spec-amend ─► spec-run ─────────────────────► report
        interview,     statements    worktree · per task:            Blocked on me
        one question   + delta plan    implementer ─► reviewer        Changed
        at a time                       (tdd)          (spec + quality) Found
                                      final review · pin · finish      Rulings

bug ─► debug ─► fix under the pin, or amend if the statement was wrong
structure hurts ─► architecture ─► standalone plan ─► spec-run
```

Everything that needs you happens before the run: the interview, the plan,
and spec-run's readiness questions. The run then decides *how* — logging
each ruling in the plan — and parks any question about *what* the software
does instead of guessing it. You come back to a report that leads with
what needs you.

## Skills

**Truth layer** — the spec, the registry, and the pin

| skill | verb |
|---|---|
| `spec-init` | scaffold `specs/`, the pre-commit hook, and the agent-instructions section; propose capability boundaries from git co-change history; stop for the human |
| `spec-boundaries` | propose new capabilities, seams, and boundary corrections from co-change evidence; never draws the lines itself |
| `spec-adopt` | describe one existing capability as it is — statements, evidence from existing tests, anomalies recorded, nothing fixed — and pin it |
| `spec-amend` | edit a spec and derive the plan from the delta; hard-stops on open uncertainties |
| `spec-review` | review a diff against the pinned specs: CONSISTENT / CONTRADICTS / DRIFT / RESOLVES, by statement ID |

**Workflow** — from idea to merged

| skill | verb |
|---|---|
| `spec-shape` | interview before building, one question at a time; approved statements go to spec-amend |
| `spec-implement` | execute a plan: implementer subagent per task, reviewer after each, five-round fix loop, final review, pin last |
| `spec-run` | settle every question up front, then run plans unattended in a worktree to done and report |
| `finish` | verify, then merge locally, open a PR, or keep the branch; clean up safely |

**Disciplines** — used inside the loop and on their own

| skill | verb |
|---|---|
| `tdd` | one failing test per behaviour, watched red, least code to green; the test becomes the statement's `verified-by` |
| `debug` | a red feedback loop before any theory; minimise, rank hypotheses, instrument, fix with a regression test |
| `review` | two axes that are never merged — spec (statement IDs) and standards — and how to receive a review |
| `architecture` | survey hot spots for shallow modules, design the interface twice, land the deepening as a plan |
| `fan-out` | split independent units across parallel subagents, verify each one's evidence, consolidate |
| `merge-conflicts` | resolve by each side's intent, with the spec layer's rules for IDs and pins |

**Agents.** `implementer` (writes code test-first from a brief; cannot spawn
subagents) and `reviewer` (read-only; judges a diff against the statements
it names and for quality). Both inherit the session's model.

**Hook.** At session start and after every compaction: a short skill map,
the spec rules in repos that have `specs/`, and a resume pointer while a
run is in progress.

## The substrate

A repo that adopts the system carries a `specs/` directory:

- `specs/FORMAT.md` — the schema: statement kinds (requirements
  `PREFIX-NNN`, invariants `PREFIX-I-NNN`, uncertainties `PREFIX-U-NNN`),
  ID stability rules, `verified-by` and `checked-by`, the plan shape, and
  what a spec must never contain (history, rationale).
- `specs/registry.yaml` — machine truth: capabilities, owned paths (whole
  files, `path#symbol`, or `dir/**`), the content-hash pin, status,
  dependency edges, seams, and `adr:` pointers to decision records.
- `specs/REGISTRY.md` — the generated human rendering.
- `specs/registry.mjs` — the tool, vendored and zero-dependency:
  - `check` — validates everything and runs every invariant's `checked-by`
  - `sync` — regenerates the REGISTRY.md tables
  - `owns <files>` — maps a diff to owning capabilities, seams, or unowned
  - `pin <capability>` — records the spec file's content hash as what the
    code satisfies, moves the plan from `docs/changes/active/` to
    `completed/`, and drops `plan:`; the last act of implementing
  - `archive <plan>` — closes a standalone plan (one that changes no spec)
    once every task is ticked
  - `render` — writes `specs/registry.html`, a browsable view of the
    registry, every spec, and every plan with its progress bar

The layer is ambient: `spec-init` installs a pre-commit hook (blocks
commits that stage `specs/` while `check` fails; warns when staged code is
spec-owned with no spec delta) and a section in the repo's agent
instructions, including its verification commands.

The plugin's own `scripts/run.mjs` is the run tooling: task briefs with
statements resolved verbatim, review packages, test-gated completion, and
the plan's run log. [docs/KNOWLEDGE.md](docs/KNOWLEDGE.md) covers where
other knowledge (vocabulary, ADRs, product briefs) lives.

## Where the rules come from

The truth layer's rules were earned by mistakes during hand runs across
three repos: adoption never smuggles fixes; amendments split requirements
rather than widen them; seam defects get no requirement; anomaly →
statement conversion runs well under 1:1; amend stops on open
uncertainties; invariants are proven against the tree before they are
kept. [docs/DESIGN.md](docs/DESIGN.md) is the design with its evidence
trail; [docs/ORIGIN.md](docs/ORIGIN.md) is the handoff that started it.

The workflow layer adapts the subagent-driven loop and disciplines of
[obra/superpowers](https://github.com/obra/superpowers) and
[mattpocock/skills](https://github.com/mattpocock/skills), rebuilt around
statement IDs and pins. [docs/COMPOSITION.md](docs/COMPOSITION.md) says what
came from where and what was decided where they disagree;
[docs/CREDITS.md](docs/CREDITS.md) carries their licences.

## Development

```
sh substrate/test-plan-lifecycle.sh   # registry.mjs: plans, pin, archive
sh scripts/test-run.sh                # run.mjs: briefs, packages, the ledger
claude plugin validate .claude-plugin/plugin.json
```

Behaviour is tested with `claude plugin eval` against a no-plugin baseline.
The suite in [evals/](evals) holds a cheap routing case and four cases
that build a fixture repo (`evals/_fixtures/`) and grant Bash: debugging
from a red loop, a full unattended run that pins, a run that parks an open
question, and a run whose independent tasks go to parallel worktrees.

```
claude plugin eval . --tag cheap
claude plugin eval . --tag bash --scaffold --allow-tools Bash Edit Write --runs 1
```

## License

MIT — see [LICENSE](LICENSE). The adapted work from obra/superpowers and
mattpocock/skills keeps its own MIT notices in [docs/CREDITS.md](docs/CREDITS.md).
