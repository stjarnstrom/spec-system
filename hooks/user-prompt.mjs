#!/usr/bin/env node
// UserPromptSubmit: when OPENROUTER_API_KEY is set, ask Jev which skill fits
// this message and, on a confident answer, add one line naming it. A slash
// command that already names a skill, a run in progress, a missing key, and
// any failure add nothing. SessionStart still injects the full skill map.

import fs from 'node:fs';
import { routePrompt } from '../scripts/openrouter.mjs';

let input = {};
try { input = JSON.parse(fs.readFileSync(0, 'utf8') || '{}'); } catch { /* no stdin */ }
const prompt = typeof input.prompt === 'string' ? input.prompt
  : (typeof input.user_prompt === 'string' ? input.user_prompt : '');
const cwd = input.cwd || process.env.CLAUDE_PROJECT_DIR || process.cwd();

let additionalContext = '';
try {
  const route = await routePrompt({ prompt, cwd });
  if (route.inject) additionalContext = route.inject;
} catch { /* fail open */ }

const hookSpecificOutput = { hookEventName: 'UserPromptSubmit' };
if (additionalContext) hookSpecificOutput.additionalContext = additionalContext;
process.stdout.write(JSON.stringify({ hookSpecificOutput }));
