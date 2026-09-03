# Onboarding

You're joining an experiment: **the spec is the source of truth, the code is
the artifact.** Specs live in `specs/` and are pinned to the code — the
registry records which spec content the code actually satisfies.
Every change goes spec-first. The point is not documentation; the point is
that agents (and humans) get a machine-checkable contract to build against,
and drift becomes visible instead of silent.

This is young and you are part of its test. Where it fights you, that's
signal — collect it, don't route around it.

## Install (once)

In Claude Code:

```
/plugin marketplace add stjarnstrom/spec-system
/plugin install spec-system@stjarnstrom
```

## The mental model, in five sentences

1. A **capability** is observable behaviour at a contract (not a package, not
   a layer); the registry (`specs/registry.yaml`) names each one and the
   paths it owns.
2. A **spec** states what one capability does, present tense, at
   implementation detail — no history, no rationale, no version numbers (git
   and ADRs hold those). Statements have permanent IDs: requirements
   (`SIMI-001`), invariants (`SIMI-I-001`, guarded by shell tripwires),
   uncertainties (`SIMI-U-001`, questions the code doesn't answer).
3. The registry pins each capability to content: `pinned` is the hash of the
   spec file the code satisfies. Hash matches the file = no outstanding
   work; file changed since the pin = an amendment awaits implementation;
   `none` = the code doesn't exist yet. **The mismatch is the backlog.**
4. Every change is a migration from the pinned content to the amended file:
   amend → plan in `docs/changes/active/` derived from the delta → implement
   test-first → move the pin last (`node specs/registry.mjs pin <capability>`),
   which archives the plan to `docs/changes/completed/`.
5. `node specs/registry.mjs check` validates all of it and runs every
   invariant's tripwire; a pre-commit hook runs it for you.

## Your first hour (in a repo that already has specs/)

1. Read `specs/REGISTRY.md` — the map. Then one spec file end to end,
   plus its `*.anomalies.md` sibling.
2. Run `node specs/registry.mjs check`. Then
   `git diff --name-only main | xargs node specs/registry.mjs owns` on any
   branch — see how a diff maps to owners.
3. Make a change to spec-owned code and try to commit it — watch the hook
   tell you which spec to check.
4. Then work normally. The AGENTS.md section in the repo tells agent
   sessions the same rules you just learned.

## Your first hour (bringing it to a new repo)

Run `/spec-init` and follow it. It scaffolds, proposes capability boundaries
from git history, and **stops for you** — naming and drawing boundaries is
the human's job. Then adopt the smallest confirmed capability that has real
tests (`/spec-adopt`). Greenfield repo: init skips the history pass and you
write your first spec as a *target* (`pinned: none`) that
`/spec-implement` builds test-first.

## The rules that will feel wrong at first (they're load-bearing)

- **Adoption never fixes anything.** However broken the code you're
  describing is, the spec states what *is* and the wish goes on the anomaly
  list. A pin that lies from birth makes every later drift check worthless.
- **`UNVERIFIED` is kept, not closed.** Never write a test during adoption —
  a test derived from a spec that was derived from the code proves nothing.
  (Implementation inverts this: an amendment's delta statement *is* your
  failing test, written first.)
- **Anomaly → requirement conversion is well under 1:1.** Most anomalies are
  ordinary bugs or plan-only tasks. A spec that absorbs its anomaly list is
  doing code review's job.
- **Split, don't rewrite.** Widening a verified statement silently detaches
  its evidence. New behaviour gets a new ID.
- **Open uncertainties (`-U-`) are hard stops for amendments.** Reading the
  code again won't answer them; a human must.
- **IDs are permanent.** Never renumbered, never reused, withdrawn ones keep
  their heading.

## Where your feedback is most valuable

The skills encode judgement earned by mistakes in three repos. The open
question is whether that judgement transfers without its authors in the
loop. Watch for — and report — these:

- An adoption that smuggled a fix, or converted anomalies ~1:1 into
  requirements.
- A boundary that felt imposed by the tool rather than proposed to you.
- A spec you couldn't trust as truth (too vague to falsify, or plainly
  wrong and pinned anyway).
- Anywhere the format fought you: frontmatter quirks, checked-by commands
  that are brittle, `owns` misattributing files (known gap: test
  attribution is TypeScript-only).
- Any moment you bypassed the system to get work done — that's the most
  important one.

File findings as issues on this repo, or just write them down raw. The
anomaly-list discipline applies to the system itself: observe first, fix
by amendment.

## Knowledge layout (host repos)

`specs/` is the only folder the plugin requires. Everything else is
recommended, not scaffolded — write the first file when you have something
to put there. The host `AGENTS.md` section is the map; `specs/FORMAT.md`
is the schema it points at. The why is in [KNOWLEDGE.md](KNOWLEDGE.md).

```
AGENTS.md                 map (spec section + knowledge layout)
CONTEXT.md                vocabulary, if the repo has one
docs/adr/                 rationale
docs/changes/active/      outstanding plans (named in plan:)
docs/changes/completed/   implemented plans
docs/product-specs/       feature intent, if you write those
docs/references/          vendor/tool dumps for agents
specs/                    capability truth + registry + FORMAT
```

## Reference

- [../README.md](../README.md) — install, tool commands, skills table
- `specs/FORMAT.md` (in any adopted repo) — the schema, canonical
- [KNOWLEDGE.md](KNOWLEDGE.md) — how the host knowledge layout is recommended
- [DESIGN.md](DESIGN.md) — full design with the evidence trail
- [ORIGIN.md](ORIGIN.md) — the handoff that started it
