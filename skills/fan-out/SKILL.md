---
name: fan-out
description: >
  Split work that has many independent units across parallel subagents,
  verify each one's evidence, and consolidate into one result. Use for
  audits across many services, files, or capabilities; migrations that
  touch many places the same way; several unrelated failures; or when the
  user asks to parallelise.
---

Fan out, verify, consolidate. Parallel agents are fast and fresh-eyed;
they also make confident mistakes. The value is in the verification step.

## Procedure

1. **Split into units that share nothing.** One per service, directory,
   capability (with a spec layer the registry already draws those lines),
   or failure domain. A unit fits one fresh context. Units that share
   state, a file, or a root cause are one unit — splitting them buys
   conflicts, not speed.

2. **Write one brief per unit**, the same shape for all:
   - scope: the paths, and "change nothing outside them";
   - the question or change, stated once, with the exact criteria;
   - the output contract: a table row per finding with file:line
     evidence, or for a change, the commits and the test command's output;
   - "do not spawn subagents".
   Briefs go to files when they are long; the dispatch names the path.

3. **Dispatch every unit in one message** so they run concurrently.
   - Read-only work (audits, investigations): general-purpose agents told
     to read and not edit.
   - Changes: `spec-system:implementer`, each with `isolation: "worktree"`,
     its own branch name, and the base commit. The same change in many
     places is still one task per place, reviewed as one diff when the
     change is mechanical.
   - Size the fan-out to the work, not the other way round.

4. **Verify before you consolidate.**
   - Discard findings without file:line evidence.
   - Spot-check a sample of each agent's claims yourself; agents repeat the
     same systematic error across units.
   - For changes: merge each branch (spec-system:merge-conflicts when
     needed), then run the full suite once on the merged result. Per-unit
     green does not prove the whole is green.

5. **Consolidate** into one table: unit, finding or change, evidence,
   confidence. Mark what you could not confirm and say where you looked.
   With a spec layer, audit findings about behaviour cite the statement
   they contradict and go to the anomaly list — an audit records, it does
   not fix.

## Rules

- Subagents do not spawn subagents. One level of fan-out.
- The consolidated result is yours: a finding you did not verify is
  labelled unverified, not dropped silently and not passed on as fact.
