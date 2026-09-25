#!/bin/sh
set -eu
git init -q -b main
git config user.email eval@example.com
git config user.name eval
mkdir -p src test
cat > package.json <<'JSON'
{ "name": "dur", "version": "0.0.0", "type": "module", "scripts": { "test": "node --test" } }
JSON
cat > src/duration.js <<'JS'
// Parses "1h30m", "45m", "2h" into minutes.
export function toMinutes(text) {
  const m = text.match(/^(?:(\d+)h)?(?:(\d+)m)?$/);
  if (!m) throw new Error(`bad duration: ${text}`);
  const hours = Number(m[1] ?? 0);
  const minutes = Number(m[2] ?? 0);
  return hours * 60 + minutes * 60;
}
JS
cat > test/duration.test.js <<'JS'
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { toMinutes } from '../src/duration.js';

test('hours only', () => assert.equal(toMinutes('2h'), 120));
test('hours and minutes', () => assert.equal(toMinutes('1h30m'), 90));
test('minutes only', () => assert.equal(toMinutes('45m'), 45));
JS
git add -A && git commit -qm "duration parser"
