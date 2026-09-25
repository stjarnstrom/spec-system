# The spec system's skills

Design for the skill set that operates the spec layer, written after the verbs
were walked by hand in the origin repo (OrbitTwin-Frontend — adopt ×2, amend
×1, plan ×1, implement ×1) against the tooling now in
[substrate/registry.mjs](../substrate/registry.mjs). Repo-specific paths and
commit hashes below refer to that origin repo; they are the evidence trail, not
live links. This repo IS the plugin: `.claude-plugin/plugin.json` at the root, skills in
[skills/](../skills), the substrate in [substrate/](../substrate). Install:
`/plugin marketplace add stjarnstrom/spec-system` then
`/plugin install spec-system@stjarnstrom`; invoke as `spec-system:<skill>`.

## Ground rules the hand runs established

1. **Every skill splits into a mechanical core and a judgement core.** The
   mechanical core is a script — deterministic, testable, no model in the loop.
   The judgement core is prompt guidance around it. A skill that mixes the two
   re-does with a model what a script does for free, and drifts.
2. **The registry is the shared substrate.** Every skill starts by reading
   `specs/registry.yaml` through `registry.mjs`, never by re-deriving boundaries
   from the code. `check` is the precondition and postcondition of every skill
   that writes anything under `specs/`.
3. **Human answers are gathered before work, never guessed during it.**
   Three skills stop for the human by design: spec-shape (the interview),
   spec-amend (open uncertainties), spec-boundaries (naming). spec-run
   asks everything else up front. Once a run starts, a question about
   behaviour parks one task; it never stops the run and is never guessed.

## The verbs

### spec-adopt — describe existing code at v1

- **Frequency**: once per capability, ever. Automate last, not first.
- **Mechanical**: `registry.mjs check` before and after; statement-ID grammar;
  `verified-by` file existence; frontmatter shape.
- **Judgement**: reading the code and stating behaviour at its contract; sorting
  statements into requirement / invariant / uncertainty; writing the anomaly
  list.
- **Guardrails, each one a mistake made or nearly made by hand**:
  - Adoption describes reality; a fix smuggled in makes the pin a lie from birth.
  - Never assert what reading twice cannot resolve — that is an `-U-` statement.
  - Do not write a test to shrink the UNVERIFIED count.
  - Check every invariant against the tree before keeping it: SIMI-I-003 was
    false as first written, and only a grep said so.
  - If nothing lands in the anomaly list, the spec is too shallow to be true.
- **Eval**: run against `sim-ingest` at commit `d5d454b^` and `plotting` at
  `7828838^`; score anomaly recall against the two hand-written anomaly lists
  (28 + 22 findings) and penalise inventions. This is the one verb with a real
  benchmark today.

### spec-amend — move a spec from vN to vN+1

- **Frequency**: every behavioural change. The core write verb.
- **Input**: the target spec plus a slice of its anomaly list, or a feature
  request stated as desired behaviour.
- **Mechanical**: version bump; ID allocation (next free number, never reuse);
  `withdrawn in vN` markers; `check` must pass after.
- **Judgement**: converting an anomaly into statement changes — and refusing to.
  The observed conversion rate was well under 1:1 (28 anomalies → 7 statement
  changes covering ~5 of them); a skill that converts everything is broken.
- **Hard rules**:
  - **Split, don't rewrite.** Widening a verified statement silently detaches
    its evidence (FORMAT.md). The hand run hit this twice in one amendment.
  - A seam defect or an unobservable defect gets no statement — it goes to the
    plan as ordinary work with a stated reason (T4 pattern).
  - An anomaly blocked on an open `-U-` statement **stops the skill**: it
    surfaces the question to the human instead of guessing. The format-tolerance
    group in sim-ingest is the standing example (SIMI-U-004).
- **Output**: the amended spec (version ahead of pin) plus the derived plan.

### spec-plan — derive the migration from the delta

Folded into spec-amend's tail rather than a separate skill: the plan is a
function of the delta and goes stale the moment the spec moves again.
`docs/changes/2026-08-sim-ingest-v2.md` is the shape (that origin-repo path is
the evidence trail; new plans land in `docs/changes/active/` and `pin` moves
them to `docs/changes/completed/`): a delta table naming every touched
statement and its source anomaly, tasks that name the statements they
satisfy, done defined as *evidence exists*, and an explicit out-of-scope section.

### spec-implement — build against the plan and move the pin

- **Frequency**: follows every amendment.
- **Mechanical**: `registry.mjs owns` on the diff (stay inside the capability's
  paths or explain each excursion); `check`; the repo's test suite; the pin move
  in `registry.yaml` as the final edit, never earlier.
- **Judgement**: the implementation itself, plus honesty about partial delivery —
  a partially implemented plan leaves the pin where it is and says so; the
  version/pin gap is the record.
- **Untested**: this verb has never been run. Run it once by hand on the
  sim-ingest v2 plan before writing the skill — the same argument that applied
  to amend applies here, and it is the next hand run this repo owes.

### spec-verify — does the code still satisfy the pin?

- **Frequency**: continuous; CI-shaped.
- **Layer 1 (exists today, no model)**: `registry.mjs check` — pins, paths,
  symbols, edges, counts, evidence files.
- **Layer 2 (cheap, next)**: invariant checks. PLOT-I-002/I-003 and half of
  SIMI-I-003 were verified by grep in seconds; encode each as a command in the
  spec (`checked-by:` mirroring `verified-by:`) so layer 2 is script-only too.
- **Layer 3 (model, sampled)**: read a statement, read its code, judge drift.
  Expensive; run on the diff-touched capability only, not the world.
- **The regenerability check is layer 4** and stays deferred: regenerate the
  capability from the spec alone in a worktree, diff against reality, and read
  every material difference as a hole in the spec. It is the eval for spec
  quality, not a routine gate.

### spec-review — does this diff contradict the spec layer?

- **Frequency**: every PR; the verb that pays daily and the reason the registry
  became machine-readable.
- **Mechanical**: `git diff --name-only <base> | xargs node specs/registry.mjs owns`
  → the capabilities in play, their pins, outstanding amendments, and which
  changed files are seams (no spec delta) or unowned (no opinion).
- **Judgement**: for each touched capability, read only the statements whose
  subject matter the diff plausibly touches and flag contradictions; flag a
  behavioural change to owned paths that arrives with no amendment — that is
  spec drift by definition.
- **Scope discipline**: unowned files get no comment. The skill reviews against
  the spec layer, not general code quality — /code-review exists.
- **Retroactive eval (passed)**: run against `ef6ed73` (the terminology
  refactor, pre-spec, 162 files). `owns` scoped it to two pinned capabilities,
  and the judgement verdict is the right one: renamed observable model fields
  (Component → SimulationModule, composite → Stack, port → DockingInterface)
  are a contract change arriving with no amendment — DRIFT on SIMI-026/035.
  The review would have demanded the refactor land as a sim-ingest version
  bump, which is what a terminology refactor is.

### spec-boundaries — propose registry entries from co-change

- **Frequency**: rare; registry maintenance.
- **Mechanical**: the co-change script (scratchpad `cochange.py`), with the
  known fixes first: `--min-pair 2` on both passes, exclude `*.md` and `docs/`
  from cluster membership, report doc affinity as a per-cluster footnote.
- **Judgement**: the boundary rules in FORMAT.md — capability vs layer, names
  are not package names, hub files are cross-cutting tells. Output is proposed
  `registry.yaml` entries with `status: unspecified`, never specs.
- **Stops for a human**: naming and drawing boundaries is the one decision the
  handoff reserved; the skill proposes and asks.

## Build order

1. ~~**Layer-2 verify**~~ — done: `checked-by:` on invariants, run by
   `registry.mjs check`; 5 of 8 invariants carry commands, each negative-tested.
2. ~~**spec-review**~~ — done: `skills/spec-review`,
   smoke-tested against the v2 implementation commit.
3. ~~**spec-implement by hand once**~~ — done: sim-ingest v1 → v2 landed and
   pinned. The skill itself is not yet written.
4. ~~**spec-implement as a skill**~~ — done:
   `skills/spec-implement`.
5. ~~**spec-amend**~~ — done: `skills/spec-amend`, with
   the stop-on-uncertainty rule as a hard stop.
6. **spec-adopt** — last, despite being walked first: rarest verb, best eval
   (its retroactive-review precursor has now run and passed — see spec-review
   above).
7. **spec-boundaries** — when the registry next needs new entries.

## The two-repo test — passed

Run 2026-08-19 against `vimotek-orbittwin-prototype-01` (flat single-package
Vite prototype, zustand god-store, frozen history, zero test infrastructure —
structurally unlike this repo on every axis). Branch `spec-system-test` there
carries the substrate, a proposed registry, and a hand adoption of `sim-clock`
(8 requirements, 2 invariants, 2 uncertainties, 6 anomalies).

What transferred unchanged: the format, statement kinds, symbol-granular
ownership (the god-store is claimed four ways by symbol), seams, checked-by,
and the honest `0/8 verified` on a repo with no tests.

What the test forced or taught:

1. `registry.mjs` assumed a hoisted js-yaml — fixed at the source with a
   bundled subset parser, validated byte-identical on the full corpus.
2. FORMAT.md and registry.mjs are now **copied** into the second repo — drift
   is real from this moment. Bundling the substrate into the plugin is
   unblocked and is now the packaging priority.
3. Anomaly judgement is host-relative: a raw `<button>` violates this repo's
   UI rules and is fine there. The spec-adopt skill must read the host repo's
   own conventions, never import the origin repo's.

## The third-repo probe — polyglot and scale

Run against `openchamber-01` (Rust bridge + protocol crate, Python sim-worker,
Electron/TS desktop, pnpm/turbo, 1337 commits) as a scratch test — substrate
installed, exercised, and fully removed after.

- **Co-change discovered a tri-language capability on its own**: its top
  cluster was `crates/orbittwin-protocol/src/lib.rs` +
  `packages/protocol/src/messages.ts` + `apps/sim-worker/src/protocol.py` — the
  wire protocol, exactly the "capabilities cross package and process
  boundaries" premise, straight from the history. Scale is a non-issue: 869
  commits analysed in 0.23s.
- The registry, `check`, and `owns` handle Rust and Python paths unchanged —
  paths are just paths.
- **Tooling gap found and fixed**: the ownership-disjointness check was blind
  to nested globs (`fixtures/**` vs `fixtures/compose-parity/**` passed
  `check` while `owns` double-attributed). The validator now treats glob
  coverage as a conflict; the fix was proven on the repo that surfaced it.
- **Known limitation, recorded**: `owns`' test-file attribution understands
  only the TS `X.test.*` convention. Rust's inline `#[cfg(test)]` modules need
  nothing (same file), but Python's `test_x.py` / `tests/` layout is not
  attributed. Extend when a Python-bearing repo adopts for real.

## The plugin carries the substrate

`substrate/` is canonical for `registry.mjs`, `FORMAT.md`,
`cochange.py` (now with `--min-pair` and doc-affinity footnotes), and the
registry templates. The **spec-init** skill scaffolds `specs/` into a fresh
repo from it: substrate copied (vendored on purpose — host CI runs
`node specs/registry.mjs check` with no plugin installed), boundaries proposed
from co-change, everything `unspecified`, and the skill stops for the human
before anything is adopted. The tool is location-independent (finds `specs/`
from the working directory; resolves js-yaml from the host repo, bundled
fallback otherwise). In this repo `specs/registry.mjs` is a shim into the
substrate and `check` guards FORMAT.md against drifting from its substrate
copy. End-to-end proven in a bare scratch repo with no node_modules.

Still not built: CI wiring for verify layers 1–2, and a substrate-upgrade path
beyond manual copy + TOOL_VERSION comparison.

## The workflow layer (1.0)

0.11 left grilling, test-first work, diagnosis, review, and subagent
execution to neighbouring plugins, and every handoff lost the statement
IDs. 1.0 owns the loop — spec-shape, spec-run, and the disciplines (tdd,
debug, review, architecture, fan-out, merge-conflicts, finish) — adapted
from obra/superpowers and mattpocock/skills and rebuilt on the spec
layer's objects. [COMPOSITION.md](COMPOSITION.md) maps each piece to its
source and records how their disagreements were settled.

The same ground rules apply:

- **Mechanical core, judgement around it.** `scripts/run.mjs` does what a
  model should not re-derive: extracting a task and its statements
  verbatim into a brief, packaging a diff for review, ticking a task only
  when its test command exits 0, appending to the run log, reporting where
  a plan stands after a compaction. It lives in the plugin, not the
  substrate: host CI never needs it, and only a run uses it.
- **The plan is the ledger.** Superpowers keeps a separate ledger in a
  workspace it deletes at the end, so its rulings survive only in a chat
  message. Here the ledger is the plan's `## Run log`, the plan is
  committed as the run goes, and `pin` or `archive` moves it to
  `completed/` with every ruling intact.
- **Rules enforced by structure where possible.** The reviewer agent has
  no edit tools; neither agent has the Agent tool, so neither can fan out;
  `done` refuses to tick on red; `archive` refuses unticked plans; the
  brief tells an implementer when its task cites an open uncertainty.
  Prompt text carries only what structure cannot.
- **The ruling/park line is observable behaviour.** It is the same line
  the truth layer already draws between a statement and an implementation
  detail, so the run needs no new judgement to apply it: anything that
  would change what a statement says, add behaviour no statement covers,
  or take a side on an open `-U-` is the spec's, and parks.
- **Front-load the human.** Superpowers gates up to five approvals before
  a run and then stops for nothing. spec-shape's interview and spec-run's
  readiness step collect every question the run could raise, so the run
  itself can go for hours. The report is ordered by what the returning
  human needs first: Blocked on me, Changed, Found, Rulings.

### Evidence: the first unattended runs

Two headless `spec-run` sessions (`claude -p`, no human) on a small
fixture repo — slugify adopted and pinned, then amended with two
statements — the same repo `evals/_fixtures/slug-repo.sh` builds.

- **Run 1 found a spec bug instead of guessing past it.** Its fixture
  paired `SLUG-003` ("strip everything outside a–z, 0–9, hyphen") with an
  open `SLUG-U-001` ("is `é` transliterated or removed?"). The task citing
  the uncertainty parked in pre-flight as designed. The reviewer then flagged
  that T1 resolved SLUG-U-001, because `slugify('café')` returned `'caf'`: the
  statement settled the open question by accident. The controller parked
  T1 rather than ruling it away. The report led with a one-line question
  and named the contradiction. Cost $1.25, 3 minutes. Two lessons were
  folded back in. spec-amend now reads each new statement against every open
  `-U-`, both ways. spec-implement's pre-flight now says a ruling that
  amounts to "do it as written until answered" is a ruling on behaviour.
- **Run 2 completed.** With a consistent spec: three tasks, three
  implementer and three reviewer dispatches, one fix round (the reviewer
  caught that T1's test depended on T2's hyphen trimming), a final
  review, the pin moved, and the plan archived to `completed/` with its run
  log. The run went from 2/4 to 4/4 verified with the suite green. Cost
  $2.19, 4 minutes.
  The report's rulings included skipping a per-task review for a docs-only
  task, logged with its cost.
- **Run 3 parked and delivered the rest**, on the eval fixture's `parked`
  variant, after a fresh-context review of the whole change had been
  applied. T3, which cites an open `-U-`, parked in pre-flight. T1 and T2
  landed green with evidence. The pin stayed, and the report ended with the
  one question — where to truncate long slugs. It also found that SLUG-002's
  wording reads false once trimming lands. Cost $0.88, 2 minutes. It chose
  the inline path, which the skill then allowed for two small tasks.
  Subagents are now the default from two tasks up.
- The first runs hit a substrate limit: `check` split `verified-by` on
  every comma, so a test name could not contain one. Fixed: entries now
  split on newlines, and on a comma only when a path or `UNVERIFIED`
  follows. One implementer also ran `git checkout <file>` to get
  unstuck, so the implementer contract now rules out discarding work.

`evals/` encodes these scenarios for `claude plugin eval`. The routing case
(`shape-before-build`) scores 3/3 with the plugin and 0/3 without it. The
Bash-granting cases need a machine whose eval sandbox allows Bash.

### What was left out on purpose

Issue-tracker pipelines (the backlog is the file/pin mismatch), skill
authoring and evals (meta-work — use `claude plugin eval`), the visual
brainstorming server, and persuasion-style enforcement — ALL-CAPS
directives, "delete means delete". Current models follow calm, specific
instructions; where a rule matters, structure enforces it.

