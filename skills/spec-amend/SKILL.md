---
name: spec-amend
description: >
  Amend a spec: turn approved statements, anomalies, or a desired behaviour
  change into statement changes plus a plan derived from the delta. Use
  after spec-shape, when the user wants to change what a pinned capability
  does or turn anomaly-list findings into spec changes, or invokes
  /spec-amend. Changes no code; the pin stays where it is.
---

Amend a spec. Spec-first means the change lands here before any code moves:
the amendment edits the spec file and derives a plan from the delta, then
stops. Implementation is spec-implement's job.

## Procedure

1. **Gate.** `node specs/registry.mjs check` must pass. Identify the target
   capability in `specs/registry.yaml`; read its spec and its anomaly list in
   full. If its spec file already differs from its pin (`check` reports
   `amendment outstanding`), extend the existing plan rather than stacking a
   second unimplemented amendment.

2. **Scope the delta.** The input is the statements, seams, and constraints
   spec-shape settled with the user; a slice of the anomaly list; or a
   desired behaviour stated by the user. A behaviour change that arrives
   with open design questions goes through spec-system:spec-shape first —
   its interview is where those get answered. For each item, decide what it
   becomes — and expect the conversion rate to be well under 1:1:
   - A **statement change** only if it changes observable behaviour of owned
     paths. Several anomalies often collapse into one change.
   - A **plan-only task** if it is a seam defect or has no observable
     behaviour (dead code, duplicate keys, stale names) — FORMAT.md
     "Anomalies". The plan states why it carries no requirement.
   - **Nothing yet** if it depends on an open `-U-` uncertainty: **stop and
     ask the user** the uncertainty's question. Reading the code again will
     not answer it, and guessing poisons the spec. This is a hard stop, not a
     judgement call. The answer comes from the user, or from a throwaway
     prototype, a cited research note, or a questionnaire for the person who
     can answer — spec-shape's `closing-questions.md` has the recipes, and
     each runs outside this skill. This skill does not guess, and it does
     not write code.

   When the user answers an uncertainty — including an answer brought back
   from a prototype, a research note, or a questionnaire — the answer splits
   in two: the behaviour becomes a statement, and the reasoning behind it
   has no home in the spec. When the answer closes a question a run
   parked, rewrite that task to cite the statements that now carry the
   answer, then run
   `node ${CLAUDE_PLUGIN_ROOT}/scripts/run.mjs unpark <plan> <T> "<answer>"`
   so the next run picks it up. Offer an ADR for the reasoning — but only
   when the decision is hard to reverse, surprising without context, and a real trade-off
   (FORMAT.md, "Recording a decision as an ADR"). Most answers are none of
   those and need nothing. When one qualifies, write `docs/adr/NNNN-<slug>.md` (next
   free number, one paragraph: context, decision, why) and point at it from
   the capability's `adr:` in `registry.yaml`. The spec file never cites it,
   and the plan records which uncertainty the answer closed.

3. **Edit statements under the ID rules.**
   - **Split, don't rewrite.** Widening a verified statement silently detaches
     its evidence — the test still passes and now proves less than the spec
     claims. Leave the verified statement under its own id; put added
     behaviour in a new statement with the next free number.
   - Rewrite only when the original statement is no longer true at all.
   - A withdrawn statement keeps its id and heading, marked `withdrawn` with
     the plan that removed it.
   - IDs are never renumbered and never reused. New invariants need
     `checked-by` (a falsifying command, or `UNCHECKED`); new open questions
     get `-U-` ids.
   - Read every new or changed statement against every open `-U-` in the
     spec, both ways. A statement whose plain reading already settles an
     open question — "strip everything outside a–z" settles whether `é` is
     transliterated — is the uncertainty answered by accident. Ask it now
     (step 2's stop), then either narrow the statement or close the `-U-`.
     Left in, it parks every task that touches it at run time.

4. **Leave the pin alone.** Editing the spec file is the whole amendment:
   the file's hash now differs from `pinned`, and that mismatch is the record
   that work is outstanding — `check` will demand a `plan:` for it. Nothing
   else to bump.

5. **Derive the plan from the delta** — `docs/changes/active/<date>-<spec>-<topic>.md`,
   named in the registry's `plan:` field, in the shape FORMAT.md "Plans"
   gives:
   - A header line (capability, spec, the pin it migrates from) and a
     delta table: every touched statement, its change, its source anomaly
     or decision.
   - **Test seams** — the contract the delta statements are tested
     through, as settled in shaping; the highest one that reaches the
     behaviour.
   - **Review focus** — at most five inputs or failure modes the spec
     implies but no statement names, each pinned by a test in the task
     that owns it.
   - **Constraints** — the non-behavioural limits settled in shaping
     (dependencies, performance, compatibility), when there are any.
   - **Tasks**, one checkbox line each:
     `- [ ] **T<n>** — <title> · <statement ids> · after: <T ids or —>`.
     Slice them as tracer bullets: each task a thin, complete path that is
     verifiable on its own, sized to one fresh context and worth a
     reviewer's gate of its own. Put preparatory refactoring first ("make
     the change easy, then make the easy change"). A change wide enough to
     break many callers goes expand → migrate in batches → contract, each
     step green. Write `independent` instead of `after:` only for a task
     that shares no file or interface with any other; spec-implement may
     run those in parallel. Mark `[human]` a task only a person can do.
   - Tasks record decisions, not code: statement IDs, signatures and
     pinned values where they matter, never function bodies. The
     implementer reads the statements verbatim from the spec.
   - Plan-only tasks (step 2) with their stated no-requirement reason, in
     place of statement IDs: `plan-only: <reason>`.
   - An explicit out-of-scope section for the anomalies not consumed.

   A delta statement describes behaviour the code does not have yet, so
   each one's test must fail at the commit the plan starts from. A
   statement that would pass today is either already true — then it is an
   editorial change, not a task — or not falsifiable as written.

6. **Verify and render.** `check` must pass; `sync` regenerates the tables.
   Report the delta table and where you stopped for the user. When the
   plan has no open questions left, offer spec-system:spec-run — it can
   run unattended.

## Rules

- An amendment changes no code and never moves a pin.
- Do not smuggle in spec-side fixes beyond the scoped delta; unrelated
  discoveries go to the anomaly list.
- If nothing in the input converts to a statement change, say so — a plan of
  ordinary bug fixes needs no spec edit at all. When that work is still
  worth running as tasks, write it as a standalone plan (`capability: none`,
  no registry `plan:`); `archive` closes it instead of `pin`.
