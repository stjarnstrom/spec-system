#!/bin/sh
# Fixture for the parallel case: a tiny JS repo with a `text` capability
# adopted and pinned, then amended with three independent tasks that touch
# disjoint files (slugify, truncate, titleCase), on a feature branch.
#
# Runs in the (empty) directory it is called from. The substrate comes from
# this plugin, so the fixture never drifts from what spec-init installs.
set -eu
plugin=$(CDPATH= cd -- "$(dirname "$0")/../.." && pwd)

git init -q -b main
git config user.email eval@example.com
git config user.name eval
mkdir -p src test specs/hooks docs/changes/active

cat > package.json <<'EOF'
{ "name": "text", "version": "0.0.0", "type": "module", "scripts": { "test": "node --test" } }
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
EOF

cp "$plugin/substrate/registry.mjs" "$plugin/substrate/FORMAT.md" specs/
cp "$plugin/substrate/REGISTRY.template.md" specs/REGISTRY.md
cp "$plugin/substrate/hooks/pre-commit" specs/hooks/pre-commit

cat > specs/text.md <<'EOF'
---
spec: text
covers: |
  Small string helpers: slugs, truncation, title case.
not-covered: |
  Locale-aware casing.
paths:
  - src/slugify.js
---

## Overview

Pure string helpers, one module each, no shared state.

## Requirements

### TEXT-001 — Slugs are lowercase
`slugify(input)` returns a string whose letters are all lowercase.
verified-by: test/slugify.test.js#lowercases
EOF
cat > specs/registry.yaml <<'EOF'
capabilities:
  text:
    spec: text.md
    prefix: TEXT
    status: adopted
    pinned: none
    paths:
      - src/slugify.js
EOF
node specs/registry.mjs pin text >/dev/null
node specs/registry.mjs sync >/dev/null
sed -e 's/<adopted capabilities>/text/' \
    -e 's/<test> · <typecheck> · <lint>/`node --test` (no typecheck or lint)/' \
    "$plugin/substrate/AGENTS.section.md" | sed '1,/-->/d' > CLAUDE.md
git add -A && git commit -qm "text adopted"
pin=$(sed -n 's/^ *pinned: //p' specs/registry.yaml | cut -c1-12)

# The amendment: three statements, one module each.
sed -i.bak 's#^  - src/slugify.js$#  - src/slugify.js\
  - src/truncate.js\
  - src/titlecase.js#' specs/text.md && rm -f specs/text.md.bak
cat >> specs/text.md <<'EOF'

### TEXT-002 — Slugs keep only a-z, 0-9 and hyphen
`slugify(input)` removes every character other than `a`–`z`, `0`–`9`, and `-` after lowercasing and turning whitespace runs into single hyphens.
verified-by: UNVERIFIED

### TEXT-003 — Truncation marks the cut
`truncate(text, max)` counts Unicode code points. When `text` has at most `max` code points it is returned unchanged; otherwise the result is its first `max - 1` code points followed by `…`, exactly `max` code points long. A `max` below 1 throws a `RangeError`.
verified-by: UNVERIFIED

### TEXT-004 — Title case capitalises each word
`titleCase(text)` splits `text` on single spaces; in each word the first code point, whatever it is, goes through `toUpperCase()` and the remaining code points through `toLowerCase()`; the words are rejoined with single spaces.
verified-by: UNVERIFIED
EOF
sed -i.bak 's#^      - src/slugify.js$#      - src/slugify.js\
      - src/truncate.js\
      - src/titlecase.js#' specs/registry.yaml && rm -f specs/registry.yaml.bak

cat > docs/changes/active/2026-09-25-text-helpers.md <<EOF
# text: three helpers

capability: text · spec: specs/text.md · from: $pin

## Delta
| statement | change | source |
|---|---|---|
| TEXT-002 | new | decision |
| TEXT-003 | new | decision |
| TEXT-004 | new | decision |

## Test seams
- each module's exported function, tested from its own file under \`test/\`

## Review focus
- empty strings
- \`truncate\` with \`max\` of 1

## Tasks
- [ ] **T1** — Strip slug characters outside a-z, 0-9, hyphen · TEXT-002 · independent
  Files: src/slugify.js, test/slugify.test.js
- [ ] **T2** — Add truncate · TEXT-003 · independent
  Files: src/truncate.js, test/truncate.test.js
- [ ] **T3** — Add titleCase · TEXT-004 · independent
  Files: src/titlecase.js, test/titlecase.test.js

## Out of scope
- locale-aware casing
EOF
sed -i.bak 's#^\(    pinned: .*\)$#\1\
    plan: docs/changes/active/2026-09-25-text-helpers.md#' specs/registry.yaml && rm -f specs/registry.yaml.bak
node specs/registry.mjs check >/dev/null
node specs/registry.mjs sync >/dev/null
git add -A && git commit -qm "amend text: three helpers (plan)"
git checkout -qb feature/text-helpers
