#!/bin/sh
# Fixture for the spec-run cases: a tiny JS repo with slugify adopted and
# pinned, then amended with an outstanding plan, on a feature branch.
#
#   sh slug-repo.sh complete   two statement tasks + one plan-only task; all runnable
#   sh slug-repo.sh parked     as complete, but T3 cites an open -U- instead
#
# Runs in the (empty) directory it is called from. The substrate comes from
# this plugin, so the fixture never drifts from what spec-init installs.
set -eu
variant=${1:-complete}
plugin=$(CDPATH= cd -- "$(dirname "$0")/../.." && pwd)

git init -q -b main
git config user.email eval@example.com
git config user.name eval
mkdir -p src test specs/hooks docs/changes/active

cat > package.json <<'EOF'
{ "name": "slug", "version": "0.0.0", "type": "module", "scripts": { "test": "node --test" } }
EOF
cat > src/slugify.js <<'EOF'
export function slugify(input) {
  return input.toLowerCase().replace(/\s+/g, '-');
}
EOF
cat > test/slugify.test.js <<'EOF'
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { slugify } from '../src/slugify.js';

test('lowercases', () => {
  assert.equal(slugify('Hello'), 'hello');
});

test('whitespace runs become one hyphen', () => {
  assert.equal(slugify('a  b\tc'), 'a-b-c');
});
EOF

cp "$plugin/substrate/registry.mjs" "$plugin/substrate/FORMAT.md" specs/
cp "$plugin/substrate/REGISTRY.template.md" specs/REGISTRY.md
cp "$plugin/substrate/hooks/pre-commit" specs/hooks/pre-commit

cat > specs/slugify.md <<'EOF'
---
spec: slugify
covers: |
  Turning free text into a URL slug.
not-covered: |
  Uniqueness of slugs across a collection.
paths:
  - src/slugify.js
---

## Overview

`slugify(input)` returns a URL-safe slug for a string.

## Requirements

### SLUG-001 — Output is lowercase
Every letter in the result is lowercase.
verified-by: test/slugify.test.js#lowercases

### SLUG-002 — Whitespace runs become one hyphen
Each run of whitespace in the input becomes a single hyphen.
verified-by: test/slugify.test.js#whitespace runs become one hyphen
EOF
cat > specs/registry.yaml <<'EOF'
capabilities:
  slugify:
    spec: slugify.md
    prefix: SLUG
    status: adopted
    pinned: none
    paths:
      - src/slugify.js
EOF
node specs/registry.mjs pin slugify >/dev/null
node specs/registry.mjs sync >/dev/null
sed -e 's/<adopted capabilities>/slugify/' \
    -e 's/<test> · <typecheck> · <lint>/`node --test` (no typecheck or lint)/' \
    "$plugin/substrate/AGENTS.section.md" | sed '1,/-->/d' > CLAUDE.md
git add -A && git commit -qm "slugify adopted"
pin=$(sed -n 's/^ *pinned: //p' specs/registry.yaml | cut -c1-12)

# The amendment.
cat >> specs/slugify.md <<'EOF'

### SLUG-003 — Only a-z, 0-9 and hyphen survive
After lowercasing and hyphenation, every character other than `a`–`z`, `0`–`9`, and `-` is removed. Accented letters are removed, not transliterated.
verified-by: UNVERIFIED

### SLUG-004 — No leading, trailing, or doubled hyphens
The result never starts or ends with a hyphen and never contains two hyphens in a row.
verified-by: UNVERIFIED
EOF
t3='- [ ] **T3** — Add a README line describing slugify · plan-only: documentation, no behaviour · independent'
if [ "$variant" = parked ]; then
  cat >> specs/slugify.md <<'EOF'

## Uncertainties

### SLUG-U-001 — Long input
Whether a slug longer than 64 characters is truncated, and where, is undecided.
EOF
  t3='- [ ] **T3** — Limit slug length · SLUG-U-001 · after: T2'
fi

cat > docs/changes/active/2026-09-25-slugify-clean.md <<EOF
# slugify: clean output

capability: slugify · spec: specs/slugify.md · from: $pin

## Delta
| statement | change | source |
|---|---|---|
| SLUG-003 | new | decision |
| SLUG-004 | new | decision |

## Test seams
- \`slugify(input)\` — the exported function; every delta statement is tested through it

## Review focus
- an input that is only punctuation (\`"!!!"\`)
- an empty string

## Tasks
- [ ] **T1** — Strip characters outside a-z, 0-9, hyphen · SLUG-003 · after: —
- [ ] **T2** — Collapse and trim hyphens · SLUG-004 · after: T1
$t3

## Out of scope
- slug uniqueness
EOF
sed -i.bak 's#^\(    pinned: .*\)$#\1\
    plan: docs/changes/active/2026-09-25-slugify-clean.md#' specs/registry.yaml && rm -f specs/registry.yaml.bak
node specs/registry.mjs check >/dev/null
node specs/registry.mjs sync >/dev/null
git add -A && git commit -qm "amend slugify: clean output (plan)"
git checkout -qb feature/slug-clean
