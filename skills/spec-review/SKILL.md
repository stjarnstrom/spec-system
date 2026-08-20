---
name: spec-review
description: >
  Review a diff against the spec layer in specs/ — does the change contradict a
  pinned spec statement, or change owned behaviour with no amendment? Use when
  the user asks to spec-review a branch, PR, commit range, or working-tree
  changes, or invokes /spec-review. Reviews against specs only; for general
  code quality use /review or /code-review.
---

Review the given diff against the spec layer. The registry is the substrate:
never re-derive capability boundaries from the code.

## Inputs

The argument is a diff target: a base ref (`main`), a range (`a..b`), a commit,
or nothing (default: working tree + staged vs HEAD; if clean, `HEAD~1..HEAD`).

## Procedure

1. **Gate.** Run `node specs/registry.mjs check`. If it fails, report that
   first and stop — reviewing against a broken registry proves nothing. A
   VIOLATED invariant caused by this diff is already a finding.

2. **Ownership.** `git diff --name-only <target> | xargs node specs/registry.mjs owns`
   Partition the files:
   - **Owned by a pinned capability** → review (steps 3–5).
   - **`(tests <src>)`** → evidence for that capability; check step 5.
   - **Seam** → no spec delta by definition. Comment only if the diff makes a
     seam carry behaviour (then the finding is "this belongs in a capability").
   - **Unowned** → silence. Not this review's business.

3. **Read the touched statements, not the whole spec.** For each touched
   capability open `specs/<spec>.md` and select the requirements, invariants,
   and uncertainties whose subject matter the diff plausibly touches — match on
   the functions, channels, messages, and fields the diff changes. Read those
   blocks in full; skim section headings for ones you may have missed.

4. **Judge each selected statement** against the diff, one of:
   - **CONSISTENT** — the change preserves the stated behaviour.
   - **CONTRADICTS <ID>** — the diff makes the statement false and no amendment
     accompanies it. Quote the statement, cite the diff hunk. This is the
     finding that matters most.
   - **DRIFT** — the diff adds or changes observable behaviour of owned paths
     that no statement covers and no amendment introduces. Spec-first means
     this arrives as an amendment; say which section of the spec it belongs in.
   - **RESOLVES <U-ID>** — the diff answers an open uncertainty in code. Flag
     it: the answer belongs in the spec (and possibly an ADR), not only in the
     diff.

5. **Pins and plans.** From the `owns` output:
   - If a touched capability's spec file no longer matches its pin, an
     amendment is outstanding — check the diff against the plan's tasks and
     say which statements it satisfies. Remind that the pin move
     (`registry.mjs pin`) is the last act.
   - If the diff deletes or weakens a test named in a `verified-by:`, flag it —
     evidence is detaching from a statement.

6. **Report.** Per capability: pin state, then findings as
   `<VERDICT> <statement-id> — one sentence + file:line`. End with a one-line
   overall: `clean`, `needs amendment`, or `contradicts pinned spec`. No
   general code-quality commentary — /code-review exists.

## Rules

- Statement IDs are the language. Every finding cites one, or names the spec
  section where a missing statement belongs.
- An uncertainty (`-U-`) is not a licence: code that picks a side of an open
  uncertainty without recording the answer is a finding, not a resolution.
- Do not propose spec edits inline — findings say *what* contradicts; the
  amendment (spec-amend) decides how the spec moves.
- If every touched file is seam or unowned, say so in one line and stop.
