<!-- spec-init template: append to the host repo's AGENTS.md (or CLAUDE.md if
     that is the repo's canonical agent instruction file). Replace
     <adopted capabilities> with the actual list, or "none yet — the registry
     holds unadopted hypotheses" right after init. -->

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
  the plan (`spec-system:spec-implement` — moving the pin is the last act).
  Never let code drift silently from its spec.
- Reviewing a diff against the specs is `spec-system:spec-review` — verdicts
  are per statement ID (CONSISTENT / CONTRADICTS / DRIFT / RESOLVES).
- Run `node specs/registry.mjs check` before committing anything under
  `specs/`. The pre-commit hook enforces this and warns on owned-code changes
  without a spec delta — install it once per clone:
  `ln -sf ../../specs/hooks/pre-commit .git/hooks/pre-commit`
