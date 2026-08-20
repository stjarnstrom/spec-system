---
name: spec-adopt
description: >
  Write the first spec for a capability by describing what the code does
  today: statements pinned as written, evidence mapped from existing tests,
  anomalies recorded, nothing fixed. Use when the user wants to adopt a
  capability, bring existing code under spec, or invokes /spec-adopt on a
  capability named in specs/registry.yaml.
---

Adopt a capability: describe reality, change nothing. The pin asserts the code
satisfies the spec *right now* — a pin that is a lie from birth makes every
later drift check worthless. Desired behaviour is the next amendment's
business, never adoption's.

## Procedure

1. **Gate.** `node specs/registry.mjs check` must pass. The capability must
   already be named in `specs/registry.yaml` with status `unspecified` or
   `partial` (no registry → spec-init first; not listed → propose the entry
   and stop for the user — naming boundaries is their call). `contested`
   means the boundary itself is not agreed: stop, adoption would pin code to
   a disputed line.

2. **Read reality in full.** Every owned path, every test that touches them,
   and the repo's own record — agent instructions, the glossary, the ADRs
   that mention this behaviour. You are about to state truth at
   implementation detail; skimming produces plausible fiction that `check`
   cannot catch.

   Scoping tripwire: if the draft needs a table of contents, it is two
   capabilities — stop and propose the split instead of adopting a layer.

3. **Settle the boundary before writing statements.** The registry's paths
   are hypotheses; adoption is when they get tested against the code.
   - Claim shared files symbol-by-symbol (`path#symbol`), never whole.
   - Behaviour found in the owned paths that belongs to another capability →
     an `excludes` entry naming the owner; contracts this one consumes →
     `depends-on` (upgrade any `source: code` edge to `source: spec`).
   - A file every capability crosses is a seam — propose it as one rather
     than owning it.
   - Edit the registry's paths to match what you learned; `check` enforces
     disjointness.

4. **Write the statements** in `specs/<slug>.md` per FORMAT.md, IDs under the
   registry's prefix:
   - **Requirements** — one observable behaviour each, present tense, no
     rationale, no history. State what the code does even when what it does
     is ugly; the wish goes on the anomaly list.
   - **verified-by** — map *existing* tests, many-to-many, `#describe name`
     for blocks. Where nothing covers a requirement, write `UNVERIFIED` and
     keep it: it is the signal that makes coverage arguable. Never write a
     test during adoption — a test derived from a spec that was derived from
     the code verifies nothing.
   - **Invariants** — only properties of the whole capability. Before keeping
     one, prove it against today's code: actively search for the
     counter-example (grep for the escaping token, the crossing import). An
     invariant that is currently false is not an invariant — it is an anomaly
     and often an uncertainty. Give each a one-line falsifying `checked-by`
     command (exit 0 = holds; confirm it goes red on a planted violation
     before trusting it) or `UNCHECKED`.
   - **Uncertainties** — only questions that reading the code twice cannot
     answer. An uncertainty is not a to-do.

   Keep each frontmatter list entry on a single line — the bundled YAML
   fallback in registry.mjs is line-oriented and rejects wrapped entries.

5. **Record anomalies** in `specs/<slug>.anomalies.md`: everything the owned
   code does that nothing justifies — one line plus path, grouped by kind,
   fixing nothing. The judgement is host-repo-relative: behaviour an ADR or a
   repo convention explains is not an anomaly here, however odd it looks.
   Cite the statement an anomaly contradicts where one exists. A long list is
   fine — its later conversion into spec changes runs well under 1:1, and a
   spec that absorbs its anomaly list is doing code review's job.

6. **Pin.** In the registry: `spec:`, `prefix:`, `pinned: none`, status
   `adopted` — or `partial` with the uncovered remainder stated in the spec's
   `not-covered`. Then `node specs/registry.mjs pin <capability>` records the
   spec file's content hash as what the code satisfies — the adoption's last
   act. Run `check`, then `sync` to regenerate the tables.
   Update the adopted-capabilities list in the host repo's agent instruction
   file (the section spec-init installed).

7. **Report.** The counts (requirements and verified/total, invariants and
   how many checked, uncertainties, anomalies), any boundary changes made in
   step 3, and the open uncertainties restated as questions for the user.

## Rules

- Adoption changes no code. Outside `specs/` and the instruction-file list,
  `git diff` stays empty; anything that itches becomes an anomaly line, not
  a fix.
- Statements state what is. If a statement cannot be truthfully pinned, the
  statement is wrong — not the code.
- From the moment the spec is committed, IDs are permanent: never renumbered,
  never reused.
- One capability per adoption. Discoveries about a neighbour's boundary go to
  the user in the report, not into this spec.
