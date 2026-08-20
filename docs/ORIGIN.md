# Handoff: spec-as-truth adoption, first pass

Paste this into Claude Code with the OrbitTwin-Frontend repo open.

---

## What we're building, eventually

A spec-driven development system for this and other repos, delivered later as a
Claude Code plugin. The premise: **the spec is the source of truth, the code is
the artifact.** Changes go spec-first. You amend the spec, derive a plan from the
spec *delta*, implement against the plan, then update the version the code claims
to satisfy. Every plan is a migration from `spec@vN` to `spec@vN+1`, including the
first one, which migrates from nothing.

**This session is not that.** This session does one thing by hand so we can find
out whether the format is honest. Do not write skills, plugins, or generators. If
you find yourself wanting to generalise, write the wish down and keep going.

## Layers, and what already exists here

The repo already uses Matt Pocock's `domain-modeling` conventions. Do not
duplicate or absorb them.

| layer | file | holds | tense |
|---|---|---|---|
| vocabulary | `CONTEXT.md` | glossary only, no implementation detail | present |
| rationale | `docs/adr/` | hard-to-reverse trade-offs, rejected alternatives | past |
| **truth** | `specs/` (new) | what the system does, at implementation detail | **present** |
| plan | scratch | how we get from vN to vN+1 | ephemeral |
| artifact | `src/` | code | — |

The spec layer is the missing middle. Critically: **specs contain no history and
no rationale.** No "we used to do X." No "we chose Y because." That belongs in git
and in ADRs. A spec that accretes archaeology stops being readable as truth.

## Task 1 — write the registry

Create `specs/REGISTRY.md` from this draft. Argue with it first; it came out of a
co-change analysis on 106 commits, which is thin. Adjust, then commit it.

| capability | owned paths | status |
|---|---|---|
| `sim-ingest` | `spine/utils/{simLoader,jsonParser,xmlParser,simulationBuilder}`, `vimotek/electron-main`, `preload.cjs` | unspecified |
| `scenario-authoring` | `SimulationCreator/*`, `SpacecraftSlotEditor/*`, `creator.css` | unspecified |
| `plotting` | `plotUtils`, `plotPresentation`, `PlotWindow`, `PlotChart`, `plot.css` | unspecified |
| `replay-catalog` | `Landing.tsx`, `scenarioCatalog.tsx` | unspecified |
| `simulation-view` | `SimulationScene.tsx`, `routes/Simulation.tsx` | contested — god object |
| `api-contract` | `generated.d.ts`, `openapi.json` | unspecified by design (generated) |
| `packaging` | `build-windows.yml` | unspecified by design |
| — | `spine/index.ts`, `spine/types.ts` | seam, belongs to no capability |

Statuses are `unspecified`, `partial`, `adopted`, `contested`,
`unspecified by design`. The last one is load-bearing: without it, the absence of
a spec means both "not yet" and "never," and nothing downstream can tell those
apart.

Boundary rules, for when you disagree with the draft:

- A capability must be stateable as observable behaviour at some contract. If it
  can't be, it's a layer, and layers are never specs.
- **Spec names must not be package names.** `sim-ingest` deliberately spans the
  Electron process seam; `plotting` deliberately spans spine and app-shell. Both
  showed up as split clusters purely because of layer boundaries.
- Needs a table of contents → it's two specs.
- Two different people with different concerns must sign off → two specs plus a
  dependency edge.

## Task 2 — adopt `sim-ingest`

**Adoption describes reality. It does not improve it.** The spec is born at v1 and
the registry pins the code to v1, and that pin asserts the code satisfies the spec
*right now*. If adoption smuggles in the fixes everyone obviously wants, the pin
is a lie from birth and the whole drift mechanism is worthless.

Read the code and write `specs/sim-ingest.md`:

```markdown
---
spec: sim-ingest
version: 1
status: adopted
covers: |
  Loading a simulation file from disk (both processes) and producing a parsed
  simulation model, including format detection and failure behaviour.
not-covered: |
  Rendering the loaded model. Scenario authoring. Anything downstream of the
  builder's return value.
paths:
  - packages/spine/utils/simLoader.ts
  - ...
---

## Overview

Two or three paragraphs of prose. What this capability is responsible for,
stated at its contract.

## Requirements

### SIMI-001 — XML simulation files are accepted
A single normative statement of behaviour, present tense.
verified-by: packages/spine/utils/__tests__/xmlParser.test.ts
```

Rules on requirement IDs: stable prefix per spec, sequential, **never renumbered
and never reused.** They are what plans, tests, commits and ADRs all point at, and
they're what makes "how much do we actually need to change" answerable later.

`verified-by` is either a real test path or the literal `UNVERIFIED`. Do not
write a test to make it look better. `UNVERIFIED` count is a signal we want.

Where you can't tell what the code does from reading it, say so in the spec as
`UNCERTAIN:` inline rather than asserting confidently. Reading the same code twice
does not resolve ambiguity, and a confident wrong spec is worse than a spec with
holes in it.

## Task 3 — the anomaly list

Separate file, `specs/sim-ingest.anomalies.md`. This is the other half of the
value and probably the more useful half.

Everything the code does that nobody in the room can justify: dead branches,
functions that disagree with each other, undocumented format tolerance (fields
optional in practice but not in intent, coercions added for one customer file),
retry or fallback logic with no evident cause. One line each, plus the path.

Do not fix any of it. This list becomes the first `spec-amend`, from v1 to v2,
which will be a readable record of what was wrong with the module.

Format tolerance in the two parsers is where I'd expect the most to turn up. If
nothing turns up at all, the spec is probably too shallow to be true.

## What to bring back

1. Where the registry draft was wrong, and why.
2. The spec, the anomaly list, and the `UNVERIFIED` count.
3. **Where the format fought you.** This matters more than the spec itself. Any
   place the frontmatter was awkward, any behaviour that didn't fit a numbered
   requirement, any point where you wanted to write rationale and had nowhere to
   put it.

## Not now, but soon

- **The regenerability check.** In a scratch worktree, regenerate `sim-ingest`
  from the spec alone and diff against reality. Everything in the diff that
  matters is a hole in the spec. That's the eval for spec quality, and it's the
  gate on the whole "code is a disposable artifact" claim.
- Pins currently live in `specs/REGISTRY.md`, one place, so day-one adoption
  doesn't touch source files. Whether they need to move into module headers is an
  open question — decide it after there are three specs, not now.
- Optional small fix: the co-change script in the scratchpad needs `--min-pair`
  (default 2) on both the file and directory passes, plus exclusion of `*.md` and
  `docs/` from cluster membership. Docs co-change with what they describe, so an
  ADR inside a cluster is circular evidence. Report doc affinity as a per-cluster
  footnote instead.
