---
name: spec-boundaries
description: >
  Propose capability boundaries from co-change evidence: new capabilities for
  unowned code, seams for hub files, boundary corrections for existing
  entries. Use when the user wants to map capabilities, wonders what to adopt
  next, asks whether the registry's boundaries still fit the code, or invokes
  /spec-boundaries. Proposes only; the user draws the lines.
---

Propose boundaries; never draw them. Naming and drawing boundaries is the
user's decision — this skill assembles the evidence and stops. It adopts
nothing and never runs in the same pass as an adoption.

## Procedure

1. **Gate.** This skill assumes an existing spec layer: `specs/registry.yaml`
   present and `node specs/registry.mjs check` green (no layer → spec-init,
   which contains its own first boundary pass).

2. **Collect the evidence.**
   - `python3 ${CLAUDE_PLUGIN_ROOT}/substrate/cochange.py . --threshold 0.35`
     — raise by 0.05 if one cluster swallows everything, lower if all
     singletons. Shorten `--since` (default 24 months) if the repo pivoted;
     old history clusters by old architecture.
   - Coverage sweep: run source files through `node specs/registry.mjs owns`
     (it accepts `git ls-files` output in batches) and collect the `unowned`
     ones. Generated files, assets, and build config are unowned by design —
     drop them from the sweep, don't propose owners for them.

3. **Read the output against the registry**, cluster by cluster:
   - Cluster ⊂ one capability's paths → confirms it; note any owned file the
     cluster says the capability is missing.
   - Cluster spans two capabilities → either a missing `depends-on` edge or a
     wrong boundary. The `top pairs` list says which files actually pull on
     each other; a pinned spec's boundary only moves via the user (and moving
     a path changes what that pin asserts — say so).
   - Cluster of unowned files → a new-capability hypothesis. The `doc:`
     affinity footnotes often carry its real name.
   - Hub files (flagged cross-cutting) → seam proposals, not owners.

4. **Judge each hypothesis with the capability rules** before proposing it:
   observable behaviour at a contract, or it is a layer and layers are never
   specs; spec names are not package names; needs a table of contents → two
   capabilities; two sign-off concerns → two capabilities and an edge.
   Co-change is evidence, not truth — files also co-change for workflow
   reasons (codegen pairs, lockfiles, fixture churn); drop clusters whose
   only story is tooling.

5. **Stop for the human.** Present a proposal table: each proposal, its kind
   (new capability / seam / path move / edge), the co-change evidence for it,
   and the open question it answers or raises. Recommend which to confirm,
   including which unadopted capability is the best next adoption (smallest
   confirmed one with real tests wins).

6. **Apply only what the user confirms:** new entries enter the registry as
   `status: unspecified` (they are hypotheses and the registry says so),
   seams with a one-line `what:`, edges with `source: code` until a spec
   declares them. `check` must pass, then `sync`. Adoption is a separate act.

7. **Record the reasoning the registry cannot hold.** A boundary the user
   argued over, a line drawn against the co-change evidence, a capability
   marked `contested` or `unspecified by design` — the registry states the
   outcome and explains none of it, and the next boundary pass will re-open
   the same argument from the same evidence.

   **Offer an ADR only when all three hold** (FORMAT.md, "Recording a
   decision as an ADR"): the decision is hard to reverse, surprising without
   context, and a real trade-off. Most are not, and a `docs/adr/` full of
   obvious decisions is worse than an empty one. When one qualifies, write it as
   `docs/adr/NNNN-<slug>.md` (next free number, one paragraph is enough:
   context, decision, why) and point at it from `registry.yaml` with `adr:`.
   Never put the rationale in the spec file.

## Rules

- Propose; never adopt, never pin, never move a pinned capability's paths
  without the user's explicit confirmation.
- Every proposal cites its evidence (cluster, pair counts, or the unowned
  sweep) — no boundary from vibes.
- Unowned is a finding only when the code has observable behaviour; leaving
  infrastructure unowned is the system working, not a gap.
