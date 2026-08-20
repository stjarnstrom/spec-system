---
name: spec-init
description: >
  Install the spec-as-truth substrate into a repo: specs/ with the registry
  tool, FORMAT.md, a registry skeleton, and co-change-derived boundary
  proposals. Use when the user wants to set up spec-driven development,
  initialize the spec layer, or invokes /spec-init in a repo without specs/.
---

Install the spec layer's substrate into the current repo. This scaffolds; it
adopts nothing — adoption is its own act, per FORMAT.md.

## Procedure

1. **Refuse double-init.** If `specs/registry.yaml` exists, stop and say so —
   point at `node specs/registry.mjs check` instead.

2. **Copy the substrate** from this plugin into `specs/`:
   - `${CLAUDE_PLUGIN_ROOT}/substrate/registry.mjs` → `specs/registry.mjs`
   - `${CLAUDE_PLUGIN_ROOT}/substrate/FORMAT.md` → `specs/FORMAT.md`
   - `${CLAUDE_PLUGIN_ROOT}/substrate/registry.template.yaml` → `specs/registry.yaml`
   - `${CLAUDE_PLUGIN_ROOT}/substrate/REGISTRY.template.md` → `specs/REGISTRY.md`
   - `${CLAUDE_PLUGIN_ROOT}/substrate/hooks/pre-commit` → `specs/hooks/pre-commit`
     (keep it executable)
   These are vendored copies on purpose: the repo must be able to run
   `node specs/registry.mjs check` locally with no plugin installed. js-yaml
   is used when the repo has it; a bundled fallback parser covers the rest.

3. **Wire the repo so the layer is ambient, not opt-in.**
   - Install the hook: `ln -sf ../../specs/hooks/pre-commit .git/hooks/pre-commit`.
     If `.git/hooks/pre-commit` already exists (husky, lefthook, git-lfs…),
     do NOT overwrite it — instead add a line to the existing hook (or the
     repo's hook manager config) that runs `specs/hooks/pre-commit`. The hook
     blocks commits staging `specs/` when `check` fails, and warns (never
     blocks) when staged code is spec-owned with no spec delta.
   - Append the spec section to the repo's agent instruction file: adapt
     `${CLAUDE_PLUGIN_ROOT}/substrate/AGENTS.section.md` into AGENTS.md (or
     CLAUDE.md — whichever the repo treats as canonical), filling in the
     adopted-capabilities list (right after init: "none yet").

4. **Greenfield fork.** A repo with no (or only scaffold) history has nothing
   for co-change to read and nothing for spec-adopt to describe — skip steps
   5 and 6 and invert the flow: capabilities come from the user's intent, and
   each first spec is written as a **target**, not a description. Its
   registry entry carries `pinned: none` with a `plan:` — the missing pin is
   the record that the code does not exist yet, `check` notes (rather than
   rejects) owned paths not yet on disk while it is open, and spec-implement
   builds test-first against the plan, running `registry.mjs pin` when the
   behaviour is real and evidenced. Keep the entry's status `unspecified`
   until that first pin move lands `adopted`.

5. **Propose boundaries from the history.** Run
   `python3 ${CLAUDE_PLUGIN_ROOT}/substrate/cochange.py . --threshold 0.35`
   (raise the threshold by 0.05 if one cluster swallows everything; lower it if
   all singletons). Read the repo's own conventions (CLAUDE.md / AGENTS.md /
   architecture docs) before naming anything.

6. **Fill `specs/registry.yaml`** with the proposed capabilities, every one
   `status: unspecified` — they are hypotheses, and the registry says so.
   Apply the boundary rules from FORMAT.md: a capability is observable
   behaviour at a contract; spec names are not package names; hub files are
   seams or cross-cutting, not capabilities. Claim shared files
   symbol-by-symbol (`path#symbol`), never whole.

7. **Verify and render.** `node specs/registry.mjs check` must pass;
   then `node specs/registry.mjs sync` to generate the REGISTRY.md tables.

8. **Stop for the human.** Present the proposed boundaries with the co-change
   evidence and ask which to confirm — naming and drawing boundaries is the
   user's decision. Do not adopt any capability in the same pass; suggest
   starting with the smallest confirmed one.

## Rules

- Scaffold only: no spec files, no pins, no behaviour changes. (The
  greenfield fork's target specs are the one exception — pinned `none`, they
  assert nothing about code.)
- Never overwrite an existing specs/ — this skill initialises, it does not
  upgrade. (Upgrading a vendored registry.mjs is a manual copy, compared by
  TOOL_VERSION.)
- The registry template's comments are the user's documentation — keep them.
