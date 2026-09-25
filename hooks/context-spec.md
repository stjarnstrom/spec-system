This repo has a spec layer: `specs/` is the source of truth for adopted capabilities, `specs/FORMAT.md` is its schema, and the Specs section of the repo's agent instructions has its rules.
- Before changing code, `node specs/registry.mjs owns <files>` says which capability owns it.
- Changing what an owned capability does goes spec-first: spec-shape → spec-amend → spec-implement or spec-run. The pin moves last.
- A behaviour question the spec leaves open (an `-U-` statement, or behaviour no statement covers) goes to the user; it is never guessed into code.
- `node specs/registry.mjs check` passes before anything under `specs/` is committed.
