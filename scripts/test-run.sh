#!/bin/sh
# Mechanical checks for scripts/run.mjs. Run from the plugin root:
#   sh scripts/test-run.sh
set -eu
root=$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)
run="node $root/scripts/run.mjs"
tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT

fail() { echo "✗ $1"; exit 1; }
pass() { echo "✓ $1"; }

cd "$tmp"
git init -q -b main
git config user.email t@t && git config user.name t
mkdir -p specs src docs/changes/active

cat > specs/demo.md <<'EOF'
---
spec: demo
covers: |
  Demo capability.
not-covered: |
  Everything else.
paths:
  - src/demo.js
  - src/util.js#helper
---

## Requirements

### DEMO-001 — It returns 2
The function returns 2.
verified-by: UNVERIFIED

### DEMO-002 — It rejects negatives
A negative input throws RangeError.
verified-by: UNVERIFIED

## Uncertainties

### DEMO-U-001 — Zero
Whether zero is accepted is undecided.
EOF

plan=docs/changes/active/2026-09-demo-widen.md
cat > "$plan" <<'EOF'
# demo: widen

capability: demo · spec: specs/demo.md · from: none

## Test seams
- `demo(n)` — the exported function

## Review focus
- very large n

## Tasks
- [ ] **T1** — Return 2 · DEMO-001 · after: —
  Consumes: nothing. Produces: demo(n).
- [ ] **T2** — Reject negatives · DEMO-002 · after: T1
- [ ] **T3** — Decide zero · DEMO-U-001 · after: T1
- [ ] **T4** — [human] Sign off · after: T2
EOF
echo 'export const demo = () => 1' > src/demo.js
git add -A && git commit -qm init

$run status "$plan" > out.txt
grep -q '0/4 done' out.txt || fail "status should count 0/4"
grep -q 'next: T1' out.txt || fail "status should name T1 as next"
pass "status counts tasks and names the next ready task"

$run start "$plan" T1 > out.txt
grep -q '^\- \[~\] \*\*T1' "$plan" || fail "start should mark T1 in progress"
grep -q 'T1: started (base ' "$plan" || fail "start should log the base"
brief=$(sed -n 's/^brief: //p' out.txt)
test -f "$brief" || fail "start should write a brief"
grep -q '### DEMO-001 — It returns 2' "$brief" || fail "brief should carry the statement verbatim"
grep -q 'Consumes: nothing' "$brief" || fail "brief should carry the task detail lines"
grep -q 'src/util.js#helper' "$brief" || fail "brief should list owned paths"
grep -q '## Test seams' "$brief" || fail "brief should carry test seams"
grep -q 'very large n' "$brief" || fail "brief should carry review focus"
if grep -q 'DEMO-002' "$brief"; then fail "brief should not carry other tasks' statements"; fi
test -f .spec-run/.gitignore || fail "workspace should ignore itself"
test -z "$(git status --porcelain -- .spec-run)" || fail ".spec-run should not show in git status"
pass "start marks [~], logs base, writes a brief with statements, paths, seams"

$run brief "$plan" T3 > out.txt
grep -q 'warning: cites open uncertainty DEMO-U-001' out.txt || fail "brief should warn on -U- statements"
grep -q 'Open uncertainty cited' .spec-run/2026-09-demo-widen/T3-brief.md || fail "brief should tell the implementer to block on -U-"
pass "brief flags an open uncertainty"

base=$(git rev-parse HEAD)
if $run package - "$base" >/dev/null 2>&1; then fail "package should refuse an empty range"; fi
echo 'export const demo = () => 2' > src/demo.js
git commit -qam 'T1: return 2'
$run package "$plan" "$base" > out.txt
pkg=$(sed -n 's/^package: \([^ ]*\).*/\1/p' out.txt)
grep -q 'T1: return 2' "$pkg" || fail "package should list commits"
grep -q '+export const demo = () => 2' "$pkg" || fail "package should carry the diff"
pass "package writes commits + stat + diff and refuses empty ranges"

if $run done "$plan" T1 "$base" -- 'echo boom; exit 1' >/dev/null 2>&1; then fail "done should fail on red tests"; fi
grep -q '^\- \[~\] \*\*T1' "$plan" || fail "red tests must not tick the task"
if grep -q 'T1: complete' "$plan"; then fail "red tests must not log completion"; fi
pass "done records nothing when the tests are red"

$run done "$plan" T1 "$base" -- 'printf "# pass 3\\n# fail 0\\n# duration_ms 38\\n"' >/dev/null
grep -q '^\- \[x\] \*\*T1' "$plan" || fail "green tests should tick T1"
grep -q 'T1: complete (.*→ # pass 3 · # fail 0)' "$plan" || fail "done should log range and the pass/fail summary"
pass "done ticks and logs only on green"

$run park "$plan" T3 'Is zero accepted? (DEMO-U-001)' >/dev/null
grep -q '^\- \[!\] \*\*T3' "$plan" || fail "park should mark [!]"
$run log "$plan" 'T2: ruling — named the guard assertNonNegative — matches util naming — rename only' >/dev/null
$run status "$plan" > out.txt
grep -q 'next: T2' out.txt || fail "status should offer T2 once T1 is done"
grep -q 'T2: ruling' out.txt || fail "status should show the run log tail"
pass "park, log, and status resume from the plan"

if $run done "$plan" T2 not-a-commit -- 'true' >/dev/null 2>&1; then fail "done should refuse an unresolvable base"; fi
grep -q '^\- \[ \] \*\*T2' "$plan" || fail "a bad base must leave the task unticked"
pass "done refuses a bad base before touching the plan"

if $run unpark "$plan" T2 'x' >/dev/null 2>&1; then fail "unpark should refuse a task that is not parked"; fi
$run unpark "$plan" T3 'answered: zero is accepted (DEMO-003)' >/dev/null
grep -q '^\- \[ \] \*\*T3' "$plan" || fail "unpark should reset the checkbox"
grep -q 'T3: unparked — answered' "$plan" || fail "unpark should log the answer"
pass "unpark returns an answered task to the queue"

count=$(grep -c '^\- T[0-9]' "$plan")
test "$count" -eq 5 || fail "run log should hold 5 entries, has $count"
node -e '
const md=require("fs").readFileSync(process.argv[1],"utf8");
const n={open:0,done:0,doing:0,blocked:0};
for (const m of md.matchAll(/^\s*(?:[-*]|\d+\.) \[([ x~!])\]/gm)) n[{" ":"open",x:"done","~":"doing","!":"blocked"}[m[1]]]++;
if (n.open+n.done+n.doing+n.blocked!==4) { console.error(JSON.stringify(n)); process.exit(1); }
' "$plan" || fail "run log lines must not count as tasks in render's progress bar"
pass "run log stays out of the progress count"

mkdir -p docs/changes/completed && cp "$plan" docs/changes/completed/
mv "$plan" "$plan.moved"
$run status "$plan" > out.txt || fail "status should follow a plan that pin moved to completed/"
mv "$plan.moved" "$plan" && rm docs/changes/completed/2026-09-demo-widen.md
pass "a plan moved to completed/ still resolves by its active/ path"

$run active set "$plan" >/dev/null
grep -q 'docs/changes/active/2026-09-demo-widen.md' .spec-run/ACTIVE || fail "active set should write the marker"
$run active clear >/dev/null
test ! -f .spec-run/ACTIVE || fail "active clear should remove the marker"
pass "active marker set and cleared"

echo
echo "all run.mjs checks passed"
