---
name: spec-shape
description: >
  Interview before building: turns a feature idea or behaviour change into
  spec statements the user approved, one question at a time, then hands
  them to spec-amend. Use before any code when the user wants to build,
  add, or change what software does ("let's build", "add a", "make it",
  "I want it to", "should we"), or invokes /spec-shape.
---

Shape the change before anything is built. Facts come from the code;
decisions come from the user. The output is a set of statements the user
approved, which spec-amend turns into the spec delta and its plan — so the
run that follows needs nobody.

## Procedure

1. **Read the ground.** Facts are yours to find, never the user's to
   supply. With a spec layer: `node specs/registry.mjs owns` on the code the
   change touches, the owning spec and its anomaly list, the capabilities
   it depends on. In any repo: the code itself, `CONTEXT.md` or
   `GLOSSARY.md`, ADRs near the change, any product brief. Send
   general-purpose subagents, told to read and not edit, after questions
   that need a wide read, and keep going while they work.

2. **Confirm the purpose.** Write back what you understood, keeping what
   the user said apart from what you assume. If the purpose is missing,
   that is the first question.

3. **Classify, out loud** — the user may overrule:
   - **A question, not a change** ("would this work?", "which is faster?")
     → answer it with a prototype or a research note
     ([closing-questions.md](closing-questions.md)). Stop there; the verdict
     can become a statement later.
   - **Small and unowned** — no owned path is touched (or the repo has no
     spec layer), and the flow being changed already exists to read → a
     short design in chat, one explicit yes, then build it with
     spec-system:tdd. No spec, no plan.
   - **Behavioural** — changes what an owned capability does, adds a
     capability, or is big enough to want a plan → the interview below,
     then spec-amend.
   - **Bigger than one capability** → one amendment per capability, in
     dependency order; shape each in turn.

   When in doubt, take the heavier path. Complexity found midway moves the
   path up, never down.

4. **Interview — one question per message.** Multiple choice when the
   answers can be listed, the recommended option first with its reason
   (the AskUserQuestion tool when the harness has one). Work from the
   contract outward:
   - **Behaviour at the contract.** Inputs, outputs, failure modes. Invent
     concrete scenarios — "a file with no steps: skipped, error, or empty
     run?" — and ask what happens.
   - **Open `-U-` uncertainties** the change touches. Each gets an answer
     or is put explicitly out of scope.
   - **Test seams.** Where the behaviour is observable: the highest
     contract that reaches it, ideally one for the whole change. Existing
     seams before new ones.
   - **Constraints** the implementation must keep: dependencies, a
     performance envelope, compatibility.

   Hold the vocabulary. When the user's word differs from the glossary, or
   the code does something other than what they just described, say so and
   settle it. A settled term goes into `CONTEXT.md` (or `GLOSSARY.md`)
   there and then: the term in bold, what it is in a sentence or two, and
   the words to avoid. Create the file when the repo has none and the term
   matters.

   Where the design has real alternatives, lay out two or three with the
   recommendation first, and cut what is not needed yet.

   Each answer lands in one place: a statement (observable behaviour), a
   constraint for the plan, a glossary term, an ADR candidate (hard to
   reverse, surprising without context, and a real trade-off — all three),
   or nowhere.

5. **Present the design in sections**, each short enough to read at once,
   and get approval per section before the next:
   - the statements as they will read in the spec — present tense, one
     behaviour each, falsifiable at a named seam — grouped as new, changed,
     and withdrawn. A verified statement is split, not widened: widening
     detaches its evidence.
   - test seams and constraints;
   - what is out of scope.

   An approval covers the section shown and nothing beyond it. Shaping is
   done when every section is approved, every statement is falsifiable at a
   named seam, and no open `-U-` the change touches is left unanswered or
   unscoped.

6. **Hand off.** Invoke spec-system:spec-amend with the approved statements,
   seams, constraints, and out-of-scope list. It allocates IDs, edits the
   spec, and derives the plan. A new capability needs its registry entry
   first — the user names it, by spec-boundaries' rules — and then a target
   spec (`pinned: none`). Write an ADR for any answer that passed the three
   gates. Then offer spec-system:spec-run: the plan can run unattended.

## Rules

- One question per message. Never ask the user for a fact the code can
  answer.
- Nothing is built while shaping: no product code, scaffolding, or
  installs. Reading, throwaway prototypes off the main branch, and research
  notes are fine.
- The spec gets behaviour only. Reasoning goes to an ADR, or nowhere.
- A desired-tense brief for stakeholders, if the user wants one, goes to
  `docs/product-specs/`. It is not a spec and nothing is pinned to it.
