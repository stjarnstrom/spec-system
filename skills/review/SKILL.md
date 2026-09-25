---
name: review
description: >
  Review a branch, PR, or diff on two axes that are never merged — spec
  (statement IDs) and standards (correctness and code quality) — or work
  through review comments someone left. Use when the user asks to review
  changes, a PR, or "since <ref>"; before merging; or when review feedback
  arrives, from a person or a tool.
---

Two jobs: giving a review, and receiving one.

## Giving a review

1. **Pin the fixed point.** The base ref: what the user named, else the
   merge-base with the default branch. The range must hold commits —
   `node ${CLAUDE_PLUGIN_ROOT}/scripts/run.mjs package - <base>` writes the
   package (commits, stat, diff) and refuses an empty range. Uncommitted
   work gets committed first, or reviewed with the spec-review skill, which
   reads the working tree.

2. **Two axes, in parallel, in separate subagents** — `spec-system:reviewer`
   in single-axis mode, both dispatched in one message, each given the
   package path, its axis, and its procedure file:
   `${CLAUDE_PLUGIN_ROOT}/skills/spec-review/SKILL.md` for the spec axis,
   `${CLAUDE_PLUGIN_ROOT}/skills/review/standards.md` for standards.
   - **Spec axis.** With a spec layer, the procedure is spec-system:spec-review:
     `owns` scopes the diff, and every finding cites a statement ID —
     `CONTRADICTS`, `DRIFT`, `RESOLVES`. Without one, the spec is the
     originating plan, issue, or brief: work it asked for that is missing,
     work it did not ask for, and work that looks done but is wrong — each
     quoting the line it rests on.
   - **Standards axis.** Correctness first, then quality, per
     [standards.md](standards.md). The repo's own documented standards
     outrank the baseline there. Only what you would block the merge for
     is Critical or Important; each finding gives file:line, why it is
     wrong, and how to show it fails.

3. **Report side by side**, under `## Spec` and `## Standards`. The axes
   are never merged or ranked against each other: a spec contradiction and
   a race condition are different kinds of wrong, and the user weighs
   them. End each axis with its count and its worst finding.

A reviewer shares nothing with the author's context — that is the point
of a subagent here. Reviewing your own work in the same context is
confirmation, not review.

## Receiving a review

Review comments are claims to check, not orders.

1. **Read all of them first.** Restate any you do not understand, and ask
   about every unclear one before changing anything — they are often
   related.
2. **Check each against the code.** Does the problem exist? Would the
   suggestion break something else? Before building out a feature a
   reviewer asks for, check whether anything uses it; if nothing does,
   propose removing it instead.
3. **Spec-axis findings are decisions, not tweaks.** `CONTRADICTS` or
   `DRIFT` means amend the spec (spec-system:spec-amend) or revert the
   behaviour. Pick one explicitly; never paper over it.
4. **Answer with substance.** Where the reviewer is right, fix it — one
   item at a time, each behaviour change with its test (spec-system:tdd),
   the suite green after. Where they are wrong, say why with evidence
   (file:line, a command's output). State what changed; skip the thanks
   and the praise.
5. **Posting replies is outward-facing.** Draft the replies; post them to
   the PR (`gh api repos/<owner>/<repo>/pulls/<n>/comments/<id>/replies`)
   only when the user says to.
