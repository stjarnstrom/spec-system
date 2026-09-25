# How the host knowledge layout is recommended

The spec layer is one kind of knowledge: present-tense capability truth,
machine-checked, pinned by content hash. A host repo usually has other kinds —
vocabulary, ADRs, feature briefs, plans, vendor dumps. Those must not live in
`specs/`. A spec that accretes archaeology stops being readable as truth
([FORMAT.md](../substrate/FORMAT.md)).

This is the same cut OpenAI's harness-engineering tree makes, just named
differently. Their `product-specs/` and `design-docs/` are not our specs.
Their `exec-plans/{active,completed}/` is the one structural steal: plans are
first-class, and outstanding vs done is a directory, not a guess.

## Recommend, do not scaffold

`spec-init` copies the substrate into `specs/` and appends a section to the
host `AGENTS.md`. It does **not** create `docs/adr/`, `docs/product-specs/`,
`docs/references/`, or empty `docs/changes/` trees.

Empty folders are ceremony. They rot, they imply a process that is not
happening, and they teach agents to look for files that do not exist. The
first ADR, the first product brief, the first plan — that is when the
directory appears. `pin` creates `docs/changes/completed/` the first time a
plan actually finishes.

## Where the recommendation lives

Progressive disclosure, the same rule as the rest of the system:

1. **The map** — `substrate/AGENTS.section.md`, appended into the host
   `AGENTS.md`. Every agent session sees a short table of contents: what
   `specs/` is, where plans live, where rationale and feature intent go if
   they exist. Roughly a dozen lines, pointers not an encyclopedia.
2. **The schema** — `specs/FORMAT.md` (vendored). "Plans" and "Where other
   knowledge lives" are the durable convention. `check` enforces the plan
   paths; the rest of the table is guidance.
3. **This file** — why, for humans reading the plugin. Host repos do not get
   a copy. They do not need the essay; they need the map and the schema.

A fourth copy in `docs/KNOWLEDGE.md` inside every adopted repo would drift
from FORMAT.md the same way a second registry would. One vendored schema,
one injected map.

## The layout

```
AGENTS.md                 map (spec section + knowledge layout)
CONTEXT.md                vocabulary, if the repo has one
docs/adr/                 rationale
docs/changes/active/      outstanding plans (named in plan:)
docs/changes/completed/   implemented plans
docs/product-specs/       feature intent, if you write those
docs/references/          vendor/tool dumps for agents
specs/                    capability truth + registry + FORMAT
.spec-run/                a run's scratch; ignores itself, removed when the run ends
```

`.spec-run/` is not knowledge. It holds a run's briefs, implementer
reports, and diff packages so subagents can pass them as paths. What a run
decided is written into the plan's run log, which survives in
`docs/changes/completed/`; the scratch goes.

`docs/product-specs/` is desired-tense ("onboarding should…"). A capability
spec is present-tense implementation detail ("an unparseable step file is
skipped"). Same word, different object. Mixing them was the reason not to
split `specs/` into more folders.

## What is mechanical

The plan half is enforced. `check` requires an outstanding `plan:` to exist
and to live under `docs/changes/active/` (legacy flat `docs/changes/*.md`
still passes). An in-sync capability must not still name a plan in `active/`.
`pin` moves the file and drops `plan:`. A standalone plan — one no
capability names, because it changes no spec — moves with `archive`, which
refuses while any task is unticked.

ADRs are gated only once the registry points at one. `adr:` on a capability,
edge, or seam must resolve to a file that exists, the same treatment `plan:`
and `verified-by` get — writing an ADR is never required, but a dangling
pointer to one is an error. Rationale stays out of the spec file either way.

Vocabulary, product briefs, and reference dumps have no gate. They appear
when someone has something to write. The map is enough for an agent to put
the next file in the right place.
