#!/bin/sh
# Gates and fail-open behaviour for scripts/openrouter.mjs. No live OpenRouter call.
#   sh scripts/test-openrouter.sh
set -eu
root=$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)
jev="node $root/scripts/openrouter.mjs"
hookjs="$root/hooks/user-prompt.mjs"
tmp=$(mktemp -d)
pids=
trap 'kill $pids 2>/dev/null || true; rm -rf "$tmp"' EXIT

fail() { echo "✗ $1"; exit 1; }
pass() { echo "✓ $1"; }
json_get() { node -e 'const o=JSON.parse(process.argv[1]); const p=process.argv[2].split("."); let v=o; for (const k of p) v=v?.[k]; if (v===undefined) process.exit(1); process.stdout.write(typeof v==="string"?v:JSON.stringify(v));' "$1" "$2"; }

# Skill ids in the route catalog are real skills. `none` is the abstain option.
node --input-type=module -e '
import fs from "node:fs";
const cat = JSON.parse(fs.readFileSync(process.argv[1], "utf8"));
const keys = Object.keys(cat.skill.criteria).filter((k) => k !== "none");
if (!keys.length || !cat.skill.criteria.none) process.exit(1);
for (const k of keys) {
  if (!fs.existsSync(`skills/${k}/SKILL.md`)) { console.error(k); process.exit(1); }
}
' "$root/scripts/decisions/route.json" || fail "route catalog skill ids should match skills/"
pass "route catalog matches skills/"

cat > "$tmp/strong.json" <<'EOF'
{
  "model": "typesafe/jev-1.13-20260918",
  "answers": {
    "skill": {
      "type": "choice",
      "choice": "spec-shape",
      "probabilities": { "spec-shape": 0.82, "none": 0.1, "debug": 0.08 },
      "confidence": 0.86
    },
    "behaviour_change": { "type": "noul", "noul": 0.91 }
  }
}
EOF

shape=$(awk 'BEGIN{c=0} /^---$/ {c++; next} c>=2 {print}' "$root/evals/shape-before-build/prompt.md")
out=$($jev policy route --answers "$tmp/strong.json" --prompt "$shape")
test "$(json_get "$out" skill)" = "spec-shape" || fail "shape prompt should be eligible to route"
test "$(json_get "$out" acted)" = "true" || fail "confident spec-shape should act"
echo "$out" | grep -q 'Behaviour change' || fail "a high behaviour noul should be named in the line"
pass "shape-before-build prompt routes when the answer is confident"

out=$($jev policy route --answers "$tmp/strong.json" --prompt "/spec-system:debug the suite is red")
test "$(json_get "$out" reason)" = "explicit-skill" || fail "an explicit skill slash should not be rerouted"
test "$(json_get "$out" inject)" = "null" || fail "explicit skill should not inject"
pass "explicit skill commands are left alone"

cat > "$tmp/tight.json" <<'EOF'
{
  "model": "typesafe/jev-1.13-20260918",
  "answers": {
    "skill": {
      "type": "choice",
      "choice": "spec-shape",
      "probabilities": { "spec-shape": 0.42, "debug": 0.40, "none": 0.18 },
      "confidence": 0.91
    },
    "behaviour_change": { "type": "noul", "noul": 0.5 }
  }
}
EOF
out=$($jev policy route --answers "$tmp/tight.json" --prompt "let's build a thing")
test "$(json_get "$out" reason)" = "low-confidence" || fail "a tight margin should not route"
test "$(json_get "$out" inject)" = "null" || fail "a tight margin should not inject"
pass "a close choice does not route"

cat > "$tmp/none.json" <<'EOF'
{
  "model": "typesafe/jev-1.13-20260918",
  "answers": {
    "skill": {
      "type": "choice",
      "choice": "none",
      "probabilities": { "none": 0.8, "spec-shape": 0.2 },
      "confidence": 0.9
    },
    "behaviour_change": { "type": "noul", "noul": 0.1 }
  }
}
EOF
out=$($jev policy route --answers "$tmp/none.json" --prompt "what time is it")
test "$(json_get "$out" reason)" = "none" || fail "none should abstain"
test "$(json_get "$out" inject)" = "null" || fail "none should not inject"
pass "none abstains"

cat > "$tmp/cheap.json" <<'EOF'
{
  "model": "typesafe/jev-1.13-20260918",
  "answers": {
    "complexity": { "type": "score", "score": 0.2, "confidence": 0.7, "probabilities": { "0": 0.8, "1": 0.2 } },
    "tier": {
      "type": "choice",
      "choice": "cheap",
      "probabilities": { "cheap": 0.8, "session": 0.15, "frontier": 0.05 },
      "confidence": 0.84
    }
  }
}
EOF
out=$(env SPEC_SYSTEM_TIER_CHEAP=haiku SPEC_SYSTEM_TIER_SESSION=sonnet SPEC_SYSTEM_TIER_FRONTIER=opus \
  $jev policy tier --answers "$tmp/cheap.json")
test "$(json_get "$out" tier)" = "cheap" || fail "tier should be cheap"
test "$(json_get "$out" complexity)" = "mechanical" || fail "score 0.2 should be mechanical"
test "$(json_get "$out" model)" = "haiku" || fail "cheap should map to SPEC_SYSTEM_TIER_CHEAP"
test "$(json_get "$out" reviewerTier)" = "session" || fail "a cheap implementer should not cheapen the reviewer"
test "$(json_get "$out" reviewerModel)" = "sonnet" || fail "reviewer should take the session tier"
test "$(json_get "$out" acted)" = "true" || fail "a mapped tier should act"
pass "cheap tier maps the implementer and keeps the reviewer at session"

cat > "$tmp/frontier.json" <<'EOF'
{
  "model": "typesafe/jev-1.13-20260918",
  "answers": {
    "complexity": { "type": "score", "score": 2.8, "confidence": 0.8, "probabilities": { "3": 0.7, "2": 0.3 } },
    "tier": {
      "type": "choice",
      "choice": "frontier",
      "probabilities": { "frontier": 0.77, "session": 0.2, "cheap": 0.03 },
      "confidence": 0.8
    }
  }
}
EOF
out=$(env SPEC_SYSTEM_TIER_CHEAP=haiku SPEC_SYSTEM_TIER_SESSION=sonnet SPEC_SYSTEM_TIER_FRONTIER=opus \
  $jev policy tier --answers "$tmp/frontier.json")
test "$(json_get "$out" model)" = "opus" || fail "frontier implementer should use SPEC_SYSTEM_TIER_FRONTIER"
test "$(json_get "$out" reviewerModel)" = "opus" || fail "frontier reviewer should stay on frontier"
test "$(json_get "$out" complexity)" = "architectural" || fail "score 2.8 should be architectural"
pass "frontier tier keeps the reviewer on frontier"

out=$(env -u SPEC_SYSTEM_TIER_CHEAP -u SPEC_SYSTEM_TIER_SESSION -u SPEC_SYSTEM_TIER_FRONTIER \
  $jev policy tier --answers "$tmp/cheap.json")
test "$(json_get "$out" acted)" = "false" || fail "an unmapped tier should not change the model"
test "$(json_get "$out" reason)" = "tier-unset" || fail "an unmapped tier should say tier-unset"
test "$(json_get "$out" model)" = "null" || fail "an unmapped tier should omit the model"
test "$(json_get "$out" tier)" = "cheap" || fail "an unmapped tier should still name the tier"
pass "with no tier map the classification is logged as inherit"

cat > "$tmp/shy.json" <<'EOF'
{
  "model": "typesafe/jev-1.13-20260918",
  "answers": {
    "complexity": { "type": "score", "score": 1, "probabilities": { "1": 1 } },
    "tier": {
      "type": "choice",
      "choice": "cheap",
      "probabilities": { "cheap": 0.9, "session": 0.1 },
      "confidence": 0.2
    }
  }
}
EOF
out=$(env SPEC_SYSTEM_TIER_CHEAP=haiku $jev policy tier --answers "$tmp/shy.json")
test "$(json_get "$out" reason)" = "low-confidence" || fail "low confidence should not map a tier"
test "$(json_get "$out" model)" = "null" || fail "low confidence should not set a model"
pass "a low-confidence tier does not change the model"

cat > "$tmp/spec.md" <<'EOF'
# demo

### DEMO-001 — It returns 2
The function returns 2.
verified-by: UNVERIFIED

### DEMO-002 — It might throw
Whether a bad input throws is open.
EOF
# DEMO-002 is not an uncertainty id; add a real one and a third.
cat > "$tmp/spec.md" <<'EOF'
# demo

### DEMO-001 — It returns 2
The function returns 2.

### DEMO-U-001 — Zero
Whether zero is accepted is undecided.

### DEMO-003 — It rejects negatives
A negative input throws RangeError.
EOF

cat > "$tmp/review.json" <<'EOF'
{
  "model": "typesafe/jev-1.13-20260918",
  "answers": {
    "touches__DEMO-001": { "type": "noul", "noul": 0.05 },
    "verdict__DEMO-001": {
      "type": "choice", "choice": "CONSISTENT", "confidence": 0.9,
      "probabilities": { "CONSISTENT": 0.9, "UNSURE": 0.1 }
    },
    "touches__DEMO-U-001": { "type": "noul", "noul": 0.4 },
    "verdict__DEMO-U-001": {
      "type": "choice", "choice": "UNSURE", "confidence": 0.3,
      "probabilities": { "UNSURE": 0.55, "RESOLVES": 0.45 }
    },
    "touches__DEMO-003": { "type": "noul", "noul": 0.08 },
    "verdict__DEMO-003": {
      "type": "choice", "choice": "CONTRADICTS", "confidence": 0.86,
      "probabilities": { "CONTRADICTS": 0.8, "CONSISTENT": 0.2 }
    }
  }
}
EOF
out=$($jev policy review --spec "$tmp/spec.md" --answers "$tmp/review.json")
node --input-type=module -e '
const o = JSON.parse(process.argv[1]);
const by = Object.fromEntries(o.statements.map((s) => [s.id, s]));
if (by["DEMO-001"].mustRead !== false) process.exit(2);
if (by["DEMO-U-001"].mustRead !== true) process.exit(3);
if (by["DEMO-003"].mustRead !== true) process.exit(4);
if (by["DEMO-003"].verdict !== "CONTRADICTS") process.exit(5);
' "$out" || fail "review prior should skim only a confident untouched CONSISTENT"
pass "review prior skims a confident miss and keeps contradictions and unsure rows"

{
  echo "# wide"
  i=1
  while [ "$i" -le 21 ]; do
    printf '### WIDE-%03d — n%s\nDoes %s.\n\n' "$i" "$i" "$i"
    i=$((i + 1))
  done
} > "$tmp/wide.md"
out=$(printf 'wide.js | 2 +-\n' | env -u OPENROUTER_API_KEY -u SPEC_SYSTEM_JEV_FIXTURE $jev review --spec "$tmp/wide.md")
test "$(json_get "$out" reason)" = "too-many" || fail "more than 20 statements should fail open"
test "$(json_get "$out" acted)" = "false" || fail "too-many should not act"
pass "a wide spec fails open so the reviewer reads it"

out=$(printf '' | env -u OPENROUTER_API_KEY -u SPEC_SYSTEM_JEV_FIXTURE $jev review --spec "$tmp/spec.md")
test "$(json_get "$out" reason)" = "no-stat" || fail "an empty stat should not call out"
pass "review without a diff stat does not decide"

# Hook: fixture wins, so this does not touch the network even if a key is set.
hook_out=$(printf '%s' "{\"prompt\":\"Let's build a CSV to JSON tool\",\"cwd\":\"$tmp\"}" | \
  env SPEC_SYSTEM_JEV_FIXTURE="$tmp/strong.json" node "$hookjs")
echo "$hook_out" | grep -q 'spec-system:spec-shape' || fail "hook should name the skill"
echo "$hook_out" | grep -q 'UserPromptSubmit' || fail "hook should emit hookSpecificOutput"
pass "user-prompt hook injects one skill line"

mkdir -p "$tmp/running/.spec-run"
echo 'docs/changes/active/plan.md' > "$tmp/running/.spec-run/ACTIVE"
hook_out=$(printf '%s' "{\"prompt\":\"Let's build a CSV to JSON tool\",\"cwd\":\"$tmp/running\"}" | \
  env SPEC_SYSTEM_JEV_FIXTURE="$tmp/strong.json" node "$hookjs")
echo "$hook_out" | grep -q 'additionalContext' && fail "a run in progress should not inject a route"
pass "a run in progress skips routing"

hook_out=$(printf '%s' "{\"prompt\":\"/spec-system:debug the suite is red\",\"cwd\":\"$tmp\"}" | \
  env SPEC_SYSTEM_JEV_FIXTURE="$tmp/strong.json" node "$hookjs")
echo "$hook_out" | grep -q 'additionalContext' && fail "an explicit skill should not inject"
pass "hook leaves an explicit skill command alone"

hook_out=$(printf '%s' '{"prompt":"let us build a thing"}' | \
  env -u OPENROUTER_API_KEY -u SPEC_SYSTEM_JEV_FIXTURE node "$hookjs")
echo "$hook_out" | grep -q 'additionalContext' && fail "no key should add no context"
pass "hook with no key adds nothing"

# Ledger: park observes, tier logs, neither rewrites task state.
cd "$tmp"
git init -q -b main
git config user.email t@t && git config user.name t
mkdir -p docs/changes/active
plan=docs/changes/active/2026-09-demo.md
cat > "$plan" <<'EOF'
# demo

## Tasks
- [ ] **T1** — Return 2 · DEMO-001
- [ ] **T3** — Decide zero · DEMO-U-001
EOF
echo seed > README
git add -A && git commit -qm init

printf 'The task.\n' > "$tmp/brief.md"
out=$(env SPEC_SYSTEM_JEV_FIXTURE="$tmp/cheap.json" SPEC_SYSTEM_TIER_CHEAP=haiku \
  SPEC_SYSTEM_TIER_SESSION=sonnet SPEC_SYSTEM_TIER_FRONTIER=opus \
  $jev tier --brief "$tmp/brief.md" --task T1 --plan "$plan")
test "$(json_get "$out" model)" = "haiku" || fail "tier command should map the model"
grep -q 'jev — tier T1 — cheap/mechanical — p=0.80 — conf=0.84 — model=typesafe/jev-1.13-20260918 — acted' "$plan" \
  || fail "tier should log the snapshot id and acted"
grep -q '^\- \[ \] \*\*T1' "$plan" || fail "tier must not tick the task"
pass "tier logs a mapped model and leaves the task alone"

cat > "$tmp/park.json" <<'EOF'
{ "model": "typesafe/jev-1.13-20260918", "answers": { "behaviour": { "type": "noul", "noul": 0.82 } } }
EOF
out=$(env SPEC_SYSTEM_JEV_FIXTURE="$tmp/park.json" \
  $jev park --plan "$plan" --task T3 --question "Is zero accepted?")
test "$(json_get "$out" acted)" = "false" || fail "park must not act"
test "$(json_get "$out" decide)" = "controller" || fail "park leaves the decision with the controller"
test "$(json_get "$out" behaviour)" = "0.82" || fail "park should report the probability"
grep -q 'jev — park T3 — behaviour — p=0.82 — conf=- — model=typesafe/jev-1.13-20260918 — ignored' "$plan" \
  || fail "park should log the probability as ignored"
grep -q '^\- \[ \] \*\*T3' "$plan" || fail "park prior must not mark the task parked"
pass "park records a probability and does not park"

# HTTP: local server, including failure paths. Ambient keys must not leak out.
cat > "$tmp/server.mjs" <<'EOF'
import http from 'node:http';
import fs from 'node:fs';
const seen = process.argv[2];
const mode = process.argv[3];
const server = http.createServer(async (req, res) => {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const raw = Buffer.concat(chunks).toString('utf8');
  fs.appendFileSync(seen, req.url + '\n' + raw + '\n');
  if (!req.headers.authorization || !req.headers.authorization.startsWith('Bearer ')) {
    res.writeHead(401); res.end('{}'); return;
  }
  if (mode === 'hang') return;
  if (mode === '500') { res.writeHead(500); res.end('nope'); return; }
  if (mode === 'bad') { res.writeHead(200, { 'content-type': 'application/json' }); res.end('not-json'); return; }
  res.writeHead(200, { 'content-type': 'application/json' });
  res.end(JSON.stringify({
    id: 'gen-test',
    provider: 'TypeSafe',
    model: 'typesafe/jev-1.13-20260918',
    answers: {
      skill: {
        type: 'choice', choice: 'spec-shape', confidence: 0.86,
        probabilities: { 'spec-shape': 0.82, none: 0.1, debug: 0.08 },
      },
      behaviour_change: { type: 'noul', noul: 0.91 },
    },
    usage: { input_tokens: 40, output_tokens: 0, cost: 0.000002 },
  }));
});
server.listen(0, '127.0.0.1', () => process.stdout.write(String(server.address().port)));
EOF

start() {
  : > "$tmp/seen"
  rm -f "$tmp/port"
  node "$tmp/server.mjs" "$tmp/seen" "$1" > "$tmp/port" &
  pids="$pids $!"
  i=0
  while [ ! -s "$tmp/port" ]; do
    i=$((i + 1))
    [ "$i" -gt 50 ] && fail "server did not listen"
    sleep 0.05
  done
  port=$(cat "$tmp/port")
}

stop() {
  kill $pids 2>/dev/null || true
  pids=
  wait 2>/dev/null || true
}

clean_env() {
  env -u OPENROUTER_API_KEY -u OPENROUTER_BASE_URL -u SPEC_SYSTEM_JEV_FIXTURE \
    -u SPEC_SYSTEM_JEV_MODEL -u SPEC_SYSTEM_JEV_TIMEOUT_MS \
    -u SPEC_SYSTEM_TIER_CHEAP -u SPEC_SYSTEM_TIER_SESSION -u SPEC_SYSTEM_TIER_FRONTIER \
    "$@"
}

start ok
out=$(clean_env OPENROUTER_API_KEY=test OPENROUTER_BASE_URL="http://127.0.0.1:$port" \
  $jev route --prompt "Let's build a CSV to JSON tool")
test "$(json_get "$out" skill)" = "spec-shape" || fail "HTTP route should return the server's choice"
test "$(json_get "$out" model)" = "typesafe/jev-1.13-20260918" || fail "HTTP route should keep the served snapshot id"
grep -q '"model":"typesafe/jev-1.13"' "$tmp/seen" || fail "request should pin typesafe/jev-1.13"
grep -qx '/systemone' "$tmp/seen" || fail "request path should be /systemone"
# The path is not in the body. Confirm the questions for tier strip labels on a second call.
printf 'task\n' > "$tmp/brief.md"
clean_env OPENROUTER_API_KEY=test OPENROUTER_BASE_URL="http://127.0.0.1:$port" \
  $jev tier --brief "$tmp/brief.md" --task T9 >/dev/null
grep -q '"labels"' "$tmp/seen" && fail "labels are local and must not be sent"
grep -q 'Which model tier should implement this task' "$tmp/seen" || fail "tier questions should be sent"
pass "HTTP client posts to /systemone, pins the model, and strips labels"
stop

start 500
out=$(clean_env OPENROUTER_API_KEY=test OPENROUTER_BASE_URL="http://127.0.0.1:$port" \
  $jev route --prompt "Let's build a thing")
test "$(json_get "$out" reason)" = "http-500" || fail "HTTP 500 should fail open"
test "$(json_get "$out" inject)" = "null" || fail "HTTP 500 should not inject"
pass "HTTP 500 fails open"
stop

start bad
out=$(clean_env OPENROUTER_API_KEY=test OPENROUTER_BASE_URL="http://127.0.0.1:$port" \
  $jev route --prompt "Let's build a thing")
test "$(json_get "$out" reason)" = "bad-json" || fail "malformed JSON should fail open"
pass "malformed JSON fails open"
stop

start hang
start_s=$(date +%s)
out=$(clean_env OPENROUTER_API_KEY=test OPENROUTER_BASE_URL="http://127.0.0.1:$port" \
  SPEC_SYSTEM_JEV_TIMEOUT_MS=400 \
  $jev route --prompt "Let's build a thing")
end_s=$(date +%s)
test "$(json_get "$out" reason)" = "timeout" || fail "a hung server should time out"
test $((end_s - start_s)) -lt 5 || fail "timeout should return promptly"
pass "a hung server times out and fails open"
stop

out=$(clean_env $jev route --prompt "Let's build a thing")
test "$(json_get "$out" reason)" = "no-key" || fail "no key should fail open"
test "$(json_get "$out" inject)" = "null" || fail "no key should not inject"
pass "no key fails open"

echo "openrouter ok"
