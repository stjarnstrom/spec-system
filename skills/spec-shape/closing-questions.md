# Closing a question the code cannot answer

Reading the code again does not settle an open question. One of these does.
Each one ends in a verdict that comes back to spec-shape or spec-amend as a
statement — or as an ADR, when the answer passes the three gates.

## Prototype — "how should it behave, or feel?"

A prototype is throwaway code that answers one question. The question
decides its shape.

- Write the question at the top of the prototype, so it reads the same
  whether the user watches now or comes back to it later.
- **Logic or state questions:** a single self-contained file (an HTML page,
  a script) around a pure module. Surface the state; add buttons or a
  walkthrough so a non-developer can drive it. The module may be lifted
  into real code later; the page around it is thrown away.
- **UI questions:** two to four structurally different variants on the
  existing route behind a switch (`?variant=`), not polished, no
  persistence.
- It lives on a throwaway branch, never on the main line. Commit it there
  and note the branch in the plan or ADR that cites the verdict, so the
  evidence stays reachable.
- The verdict is one line: what was learned, and the statement it becomes.

## Research — "what is true outside this repo?"

Library behaviour, an API's limits, a standard, a vendor's semantics.

- Send a background subagent so the interview can continue on questions
  that do not wait on it.
- Primary sources only: the docs, the source, the spec, the changelog.
  Follow each claim to the source that owns it, and cite it.
- Mark what could not be confirmed, and say where you looked.
- Write the note to `docs/references/<topic>.md`. A statement that rests on
  it may be pointed at from the registry via an ADR; the spec never cites
  it.

## Someone else must answer — a questionnaire

The person in the session cannot close the question: legal, a customer,
another team.

- Ask who it goes to and what you need back — not the subject again.
- Write `docs/references/questionnaire-<slug>.md`: purpose, context the
  reader needs, then questions most important first, one idea each, with
  an empty answer line under each.
- The `-U-` statement stays open until the answer returns. spec-amend
  folds the answer in; tasks that depend on it stay parked until then.
