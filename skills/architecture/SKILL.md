---
name: architecture
description: >
  Find where code is hard to change or test and deepen it: survey hot spots,
  rank deepening candidates, design the chosen interface twice, and land it
  as a plan. Use when the user wants to improve architecture, reduce
  coupling, make code more testable or easier for agents to navigate,
  design a module's interface, or when a bug had no correct seam to test at.
---

Make modules deeper: more behaviour behind a smaller interface. The terms
used here — module, interface, depth, seam, adapter, leverage, locality —
are defined in [vocabulary.md](vocabulary.md); use them exactly.

A module seam is where behaviour can change without editing that place. A
registry seam is a path in `specs/registry.yaml` that no capability owns.
They are different objects; say which one you mean.

## Procedure

1. **Scope before scanning.** The user's direction, if they gave one.
   Otherwise the hot spots: files that change most often
   (`git log --since=6.months --name-only --format= | sort | uniq -c | sort -rn | head -30`)
   and the clusters `python3 ${CLAUDE_PLUGIN_ROOT}/substrate/cochange.py .`
   reports. Read the glossary, the ADRs, and — with a spec layer — the
   registry, so capability boundaries are known before module ones.

2. **Survey for friction.** Send general-purpose subagents, told to read
   and not edit, to walk the scoped area and report, with file:line, where
   understanding one behaviour means
   bouncing between many small modules; modules that fail the deletion
   test; logic extracted for testability whose real bugs hide in how it is
   called; details leaking across a seam; behaviour that can only be tested
   past its interface; code with no correct seam for a regression test.

3. **Rank candidates.** For each: the files, the friction, the proposed
   deepening, what it buys in locality and leverage, the dependency
   category and so the test strategy ([vocabulary.md](vocabulary.md)), and a
   strength — Strong, Worth exploring, or Speculative. Flag any that
   contradict an ADR, and say only when the friction justifies reopening
   it. End with one top recommendation. Say so plainly when nothing is
   worth changing. Ask which candidate to take — one per session.

4. **Design it twice.** For the chosen candidate, send three or four
   subagents in parallel, each designing the interface under a different
   constraint from [vocabulary.md](vocabulary.md) — the smallest
   interface, the common caller made trivial, flexibility, ports and
   adapters. Each returns the
   interface with its invariants and error modes, a usage example, what it
   hides, and its test strategy. Compare them on depth, locality, and seam
   placement, and recommend one — a strong read, not a menu. Hybrids are
   fine.

5. **Land it through the spec layer.**
   - A deepening that preserves behaviour changes no statement: write it
     as a standalone plan in `docs/changes/active/` (`capability: none`),
     tasks sliced as spec-amend slices them, each naming the tests that
     must stay green. New tests at the deepened interface replace the old
     shallow ones rather than layering on them — but a test named in a
     `verified-by:` is re-pointed to its replacement in the same task,
     never simply deleted.
   - A capability boundary in the wrong place is registry work:
     spec-system:spec-boundaries proposes the correction.
   - A structural rule worth keeping — no imports across this boundary,
     this vocabulary stays inside — becomes an invariant with a
     `checked-by` command, confirmed to go red on a planted violation and
     green again after.
   - A candidate the user rejects for a reason that will hold becomes an
     ADR (FORMAT.md's three gates), so the next survey does not propose it
     again.

   The plan can then run unattended through spec-system:spec-run.

## Rules

- Scope first; a whole-repo scan finds everything and prioritises nothing.
- Interfaces are proposed in step 4, not before; step 3 names problems.
- New module names that stick go into the glossary.
