#!/bin/sh
# Mechanical checks for plan active/ → completed/. Run from the repo root:
#   sh substrate/test-plan-lifecycle.sh
set -eu
root=$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)
tool="$root/substrate/registry.mjs"
tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT

# Identical to git hash-object / registry.mjs blobHash.
hash() {
  python3 -c 'import hashlib,sys; d=open(sys.argv[1],"rb").read(); print(hashlib.sha1(b"blob %d\0"%len(d)+d).hexdigest())' "$1"
}

mkdir -p "$tmp/specs" "$tmp/src" "$tmp/docs/changes/active"
cat > "$tmp/src/demo.js" <<'EOF'
export const n = 1
EOF
cat > "$tmp/specs/demo.md" <<'EOF'
---
spec: demo
covers: |
  Demo capability.
not-covered: |
  Everything else.
---

## Overview

A demo.

## Requirements

### DEMO-001 — It returns 1
The function returns 1.
verified-by: UNVERIFIED
EOF

old=$(hash "$tmp/specs/demo.md")
# Amendment: change the spec so the pin no longer matches.
cat > "$tmp/specs/demo.md" <<'EOF'
---
spec: demo
covers: |
  Demo capability.
not-covered: |
  Everything else.
---

## Overview

A demo.

## Requirements

### DEMO-001 — It returns 2
The function returns 2.
verified-by: UNVERIFIED
EOF

cat > "$tmp/docs/changes/active/2026-09-demo-widen.md" <<'EOF'
# demo: return 2

- [ ] DEMO-001 — write the failing test
EOF

cat > "$tmp/specs/REGISTRY.md" <<'EOF'
# Spec registry

## Capabilities

<!-- generated:capabilities -->
<!-- /generated:capabilities -->

## Dependency edges

<!-- generated:edges -->
<!-- /generated:edges -->

## Seams

<!-- generated:seams -->
<!-- /generated:seams -->
EOF

write_reg() {
  cat > "$tmp/specs/registry.yaml" <<EOF
capabilities:
  demo:
    spec: demo.md
    prefix: DEMO
    status: adopted
    pinned: $1
    plan: $2
    paths:
      - src/demo.js
EOF
}

fail() { echo "✗ $1"; exit 1; }
pass() { echo "✓ $1"; }

cd "$tmp"

write_reg "$old" "docs/changes/active/2026-09-demo-widen.md"
node "$tool" check >/dev/null || fail "active outstanding plan should pass check"
pass "active outstanding plan passes check"

write_reg "$old" "docs/changes/completed/2026-09-demo-widen.md"
mkdir -p "$tmp/docs/changes/completed"
cp "$tmp/docs/changes/active/2026-09-demo-widen.md" "$tmp/docs/changes/completed/2026-09-demo-widen.md"
if node "$tool" check >/dev/null 2>"$tmp/err"; then
  fail "outstanding plan in completed/ should fail check"
fi
grep -q 'docs/changes/active' "$tmp/err" || fail "completed/ error should name active/"
pass "outstanding plan in completed/ fails check"
rm -f "$tmp/docs/changes/completed/2026-09-demo-widen.md"

write_reg "$old" "plans/elsewhere.md"
mkdir -p "$tmp/plans"
echo '# no' > "$tmp/plans/elsewhere.md"
if node "$tool" check >/dev/null 2>"$tmp/err"; then
  fail "plan outside docs/changes/ should fail check"
fi
grep -q 'docs/changes/active' "$tmp/err" || fail "other-path error should name active/"
pass "plan outside docs/changes/ fails check"

# Legacy flat path still accepted.
mkdir -p "$tmp/docs/changes"
cp "$tmp/docs/changes/active/2026-09-demo-widen.md" "$tmp/docs/changes/2026-09-demo-widen.md"
write_reg "$old" "docs/changes/2026-09-demo-widen.md"
node "$tool" check >/dev/null || fail "legacy flat plan should pass check"
pass "legacy flat outstanding plan passes check"
rm -f "$tmp/docs/changes/2026-09-demo-widen.md"

write_reg "$old" "docs/changes/active/2026-09-demo-widen.md"
node "$tool" pin demo >/dev/null
new=$(hash "$tmp/specs/demo.md")
grep -q "pinned: $new" "$tmp/specs/registry.yaml" || fail "pin should write the new hash"
if grep -q '^ *plan:' "$tmp/specs/registry.yaml"; then
  fail "pin should drop plan:"
fi
test -f "$tmp/docs/changes/completed/2026-09-demo-widen.md" || fail "pin should move the plan to completed/"
test ! -f "$tmp/docs/changes/active/2026-09-demo-widen.md" || fail "pin should remove the plan from active/"
node "$tool" check >/dev/null || fail "check should pass after pin"
pass "pin moves plan to completed/ and drops plan:"

node "$tool" render >/dev/null
grep -q '2026-09-demo-widen' "$tmp/specs/registry.html" || fail "render should include the completed plan"
grep -q 'implemented' "$tmp/specs/registry.html" || fail "render should badge completed plans"
pass "render finds plans under completed/"

# In-sync + leftover plan: in active/ is an error. Restore the file so the
# path exists, then point plan: at it.
cp "$tmp/docs/changes/completed/2026-09-demo-widen.md" "$tmp/docs/changes/active/2026-09-demo-widen.md"
write_reg "$new" "docs/changes/active/2026-09-demo-widen.md"
if node "$tool" check >/dev/null 2>"$tmp/err"; then
  fail "in-sync capability with active plan should fail check"
fi
grep -q 'in sync but plan is still in docs/changes/active' "$tmp/err" || fail "in-sync+active error text"
pass "in-sync + active plan fails check"

echo
echo "all plan-lifecycle checks passed"
