---
name: spec-amend
description: >
  Move a spec from vN to vN+1: convert anomalies or a desired behaviour change
  into statement changes plus a plan derived from the delta. Use when the user
  wants to change what a pinned capability does, turn anomaly-list findings
  into spec changes, or invokes /spec-amend. Changes no code; the pin stays
  where it is.
---

Amend a spec. Spec-first means the change lands here before any code moves:
the amendment produces the new spec version and the plan derived from the
delta, and stops. Implementation is spec-implement's job.

## Procedure

1. **Gate.** `node specs/registry.mjs check` must pass. Identify the target
   capability in `specs/registry.yaml`; read its spec and its anomaly list in
   full. If its `version` is already ahead of `pinned`, extend the existing
   plan rather than stacking a second unimplemented version.

2. **Scope the delta.** The input is a slice of the anomaly list, or a desired
   behaviour stated by the user. For each item, decide what it becomes —
   and expect the conversion rate to be well under 1:1:
   - A **statement change** only if it changes observable behaviour of owned
     paths. Several anomalies often collapse into one change.
   - A **plan-only task** if it is a seam defect or has no observable
     behaviour (dead code, duplicate keys, stale names) — FORMAT.md
     "Anomalies". The plan states why it carries no requirement.
   - **Nothing yet** if it depends on an open `-U-` uncertainty: **stop and
     ask the user** the uncertainty's question. Reading the code again will
     not answer it, and guessing poisons the spec. This is a hard stop, not a
     judgement call.

3. **Edit statements under the ID rules.**
   - **Split, don't rewrite.** Widening a verified statement silently detaches
     its evidence — the test still passes and now proves less than the spec
     claims. Leave the verified statement under its own id; put added
     behaviour in a new statement with the next free number.
   - Rewrite only when the original statement is no longer true at all.
   - A withdrawn statement keeps its id and heading, marked `withdrawn in vN`.
   - IDs are never renumbered and never reused. New invariants need
     `checked-by` (a falsifying command, or `UNCHECKED`); new open questions
     get `-U-` ids.

4. **Bump versions.** The spec frontmatter's `version` and the registry's
   `version` both move to N+1; `pinned` does not move. The gap is the record
   that work is outstanding, and `check` will demand a `plan:` for it.

5. **Derive the plan from the delta** — `docs/changes/<date>-<spec>-v<N+1>.md`,
   named in the registry's `plan:` field:
   - A delta table: every touched statement, its change, its source anomaly.
   - Tasks that name the statements they satisfy. A task is done when its
     statements have real evidence, not when the code compiles.
   - Plan-only tasks (step 2) with their stated no-requirement reason.
   - An explicit out-of-scope section for the anomalies not consumed.

6. **Verify and render.** `check` must pass; `sync` regenerates the tables.
   Report the delta table and where you stopped for the user.

## Rules

- An amendment changes no code and never moves a pin.
- Do not smuggle in spec-side fixes beyond the scoped delta; unrelated
  discoveries go to the anomaly list.
- If nothing in the input converts to a statement change, say so — a plan of
  ordinary bug fixes needs no new spec version.
