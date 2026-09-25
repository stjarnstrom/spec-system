<!-- spec-init template: append to the host repo's AGENTS.md (or CLAUDE.md if
     that is the repo's canonical agent instruction file). Replace
     <adopted capabilities> with the actual list, or "none yet — the registry
     holds unadopted hypotheses" right after init, and the <test> ·
     <typecheck> · <lint> placeholders with the repo's real commands (drop
     any the repo does not have). -->

## Specs — the source of truth for adopted capabilities

`specs/` is the spec layer ([specs/FORMAT.md](specs/FORMAT.md) is the schema,
[specs/REGISTRY.md](specs/REGISTRY.md) the map). For **adopted** capabilities
(currently: <adopted capabilities>) the spec is the source of truth and the
code is the artifact — changes go spec-first.

- Before changing code, find out who owns it:
  `node specs/registry.mjs owns <files...>` (takes `git diff --name-only`
  output). Unowned files and seams carry no spec obligations.
- If a change alters behaviour described by a spec, **amend the spec first**
  (`spec-system:spec-amend` — it produces the plan), then implement against
  the plan (`spec-system:spec-implement` — pin is the last act: it archives
  the plan to `docs/changes/completed/`).
  Never let code drift silently from its spec.
- Reviewing a diff against the specs is `spec-system:spec-review` — verdicts
  are per statement ID (CONSISTENT / CONTRADICTS / DRIFT / RESOLVES).
- Run `node specs/registry.mjs check` before committing anything under
  `specs/`. The pre-commit hook enforces this and warns on owned-code changes
  without a spec delta — install it once per clone:
  `ln -sf ../../specs/hooks/pre-commit .git/hooks/pre-commit`

## Knowledge layout

`specs/` is capability truth ([specs/FORMAT.md](specs/FORMAT.md) — "Where other
knowledge lives"). Do not put rationale, feature intent, or history in a spec.

- Vocabulary: `CONTEXT.md` (or `GLOSSARY.md`) / `docs/TERMINOLOGY.md` if present
- Rationale: `docs/adr/`, pointed at from `registry.yaml` with `adr:` on the
  capability, edge, or seam it explains — the spec file itself never cites one
- Feature intent: `docs/product-specs/` (not a spec — a desired-tense brief)
- Plans: `docs/changes/active/` while outstanding, `docs/changes/completed/`
  after `node specs/registry.mjs pin` (or `archive`, for a plan that
  changes no spec)
- Vendor/tool dumps: `docs/references/`

Create the first file in a directory when you have something to put there.
Do not scaffold empty trees.

## Workflow

- Verification commands: <test> · <typecheck> · <lint> — a claim that
  something passes cites their output from this turn.
- New or changed behaviour starts with `spec-system:spec-shape` (the
  interview), then spec-amend writes the spec delta and the plan. A plan
  runs attended with `spec-system:spec-implement`, or unattended to done
  with `spec-system:spec-run`.
- Test-first (`spec-system:tdd`): a delta statement is the failing test.
  Bugs start from a red feedback loop (`spec-system:debug`). A failure
  against a pinned statement is a code fix and a `verified-by` update,
  unless the statement itself is wrong — then it is an amendment.
- A question about observable behaviour the spec leaves open (an `-U-`
  statement, or behaviour no statement covers) is the user's to answer.
  During a run it parks the task; it is never guessed into code.
  Implementation choices are the agent's, recorded as rulings in the plan's
  run log.
