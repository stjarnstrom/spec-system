#!/usr/bin/env node
// SessionStart (startup, /clear, compaction): inject the skill map; the spec
// rules when the repo has a spec layer; and, when a spec-run is in progress,
// the pointer that lets a compacted session resume it from the plan instead
// of from memory. Emits only hookSpecificOutput — Claude Code reads it once.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
let input = {};
try { input = JSON.parse(fs.readFileSync(0, 'utf8') || '{}'); } catch { /* no stdin */ }
const cwd = input.cwd || process.env.CLAUDE_PROJECT_DIR || process.cwd();

function above(rel) {
  for (let dir = path.resolve(cwd); ; dir = path.dirname(dir)) {
    if (fs.existsSync(path.join(dir, rel))) return dir;
    if (path.dirname(dir) === dir) return null;
  }
}

const read = (f) => fs.readFileSync(path.join(here, f), 'utf8').trim();
const parts = [read('context.md')];
if (above(path.join('specs', 'registry.yaml'))) parts.push(read('context-spec.md'));

const runRoot = above(path.join('.spec-run', 'ACTIVE'));
if (runRoot) {
  const plans = fs.readFileSync(path.join(runRoot, '.spec-run', 'ACTIVE'), 'utf8').trim().split('\n').filter(Boolean);
  const tool = path.join(here, '..', 'scripts', 'run.mjs');
  parts.push([
    `A spec-run is in progress in ${runRoot} for: ${plans.join(', ')}.`,
    `If this session is that run, resume it before anything else: \`node "${tool}" status <plan>\` for each plan says which tasks are done, which are in flight, and what is next — trust it and \`git log\` over your memory, then continue under spec-system:spec-run.`,
  ].join(' '));
}

process.stdout.write(JSON.stringify({
  hookSpecificOutput: { hookEventName: 'SessionStart', additionalContext: parts.join('\n\n') },
}));
