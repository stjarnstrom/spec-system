#!/usr/bin/env node
// Decisions for the spec loop, via OpenRouter's System One endpoint.
// Jev (typesafe/jev-1.13) returns a typed answer. This script does not
// write statements, plans, code, or reviews. A missing key, a timeout, or
// a bad response fails open: callers keep today's behaviour.
//
//   POST {OPENROUTER_BASE_URL}/systemone     default base https://openrouter.ai/api/v1
//   Authorization: Bearer $OPENROUTER_API_KEY
//   model: $SPEC_SYSTEM_JEV_MODEL            default typesafe/jev-1.13
//
// Chat completions for a later factory pass belong on this same key and
// base. They are not implemented. Jev stays on /systemone. typesafe/jev-router
// is a different model and is not used here.
//
//   route   --prompt <text> [--cwd <dir>]
//   tier    --brief <file> --task <T> [--plan <plan>]
//   review  --spec <file> [--plan <plan>]          diff stat on stdin
//   park    --plan <plan> --task <T> --question <text>
//   policy  <route|tier|review> --answers <file>   offline gate, no network
//
// Tiers change an agent's model only when SPEC_SYSTEM_TIER_CHEAP,
// SPEC_SYSTEM_TIER_SESSION, or SPEC_SYSTEM_TIER_FRONTIER is set. The
// reviewer is never placed on the cheap tier. Park records a probability
// and does not decide. SPEC_SYSTEM_JEV_FIXTURE is a test seam: a file
// of response JSON used instead of HTTP.

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_BASE = 'https://openrouter.ai/api/v1';
const DEFAULT_MODEL = 'typesafe/jev-1.13';
const TIERS = new Set(['cheap', 'session', 'frontier']);
const STATEMENT_HEAD = /^###\s+([A-Z][A-Z0-9]*-(?:[IU]-)?\d{3,})\b/;
const MAX_REVIEW_STATEMENTS = 20;

const die = (msg, code = 2) => { console.error(msg); process.exit(code); };
const clip = (s, n) => (s.length <= n ? s : s.slice(0, n));

function numEnv(name, fallback) {
  const n = Number(process.env[name]);
  return Number.isFinite(n) ? n : fallback;
}
// Starting gates, not a measured calibration. A labelled set of run-log
// lines is what should move them.
const minConfidence = () => numEnv('SPEC_SYSTEM_JEV_MIN_CONFIDENCE', 0.6);
const minMargin = () => numEnv('SPEC_SYSTEM_JEV_MIN_MARGIN', 0.15);
const timeoutMs = () => numEnv('SPEC_SYSTEM_JEV_TIMEOUT_MS', 2500);

function fmt(n) {
  return typeof n === 'number' && Number.isFinite(n) ? n.toFixed(2) : '-';
}

export function logLine({ name, answer, p, conf, model, disposition }) {
  return `jev — ${name} — ${answer} — p=${fmt(p)} — conf=${fmt(conf)} — model=${model || '-'} — ${disposition}`;
}

function flags(argv) {
  const out = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (next == null || next.startsWith('--')) out[key] = true;
      else { out[key] = next; i++; }
    } else out._.push(a);
  }
  return out;
}

export function loadCatalog(name) {
  const file = path.join(here, 'decisions', `${name}.json`);
  const data = JSON.parse(fs.readFileSync(file, 'utf8'));
  for (const [key, q] of Object.entries(data)) {
    if (!q || (q.type !== 'choice' && q.type !== 'noul' && q.type !== 'score')) throw new Error(`bad question ${name}.${key}`);
    if (typeof q.instructions !== 'string' || !q.instructions.trim()) throw new Error(`bad instructions ${name}.${key}`);
    if ((q.type === 'choice' || q.type === 'score') && q.criteria == null) throw new Error(`missing criteria ${name}.${key}`);
  }
  return data;
}

export function questionsForSend(catalog) {
  const out = {};
  for (const [name, q] of Object.entries(catalog)) {
    const sent = { ...q };
    delete sent.labels;
    out[name] = sent;
  }
  return out;
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

export async function decide(state, questions) {
  const fixture = process.env.SPEC_SYSTEM_JEV_FIXTURE;
  if (fixture) {
    try {
      return normalise(JSON.parse(fs.readFileSync(fixture, 'utf8')));
    } catch {
      return { ok: false, reason: 'bad-fixture' };
    }
  }
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) return { ok: false, reason: 'no-key' };
  const base = (process.env.OPENROUTER_BASE_URL || DEFAULT_BASE).replace(/\/$/, '');
  const model = process.env.SPEC_SYSTEM_JEV_MODEL || DEFAULT_MODEL;
  try {
    const res = await fetch(`${base}/systemone`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://github.com/stjarnstrom/spec-system',
        'X-Title': 'spec-system',
      },
      body: JSON.stringify({ model, state, questions }),
      signal: AbortSignal.timeout(timeoutMs()),
    });
    if (!res.ok) return { ok: false, reason: `http-${res.status}` };
    let body;
    try { body = await res.json(); } catch { return { ok: false, reason: 'bad-json' }; }
    return normalise(body, model);
  } catch (err) {
    const name = err?.name;
    const reason = name === 'TimeoutError' || name === 'AbortError' ? 'timeout' : 'error';
    return { ok: false, reason };
  }
}

function normalise(body, fallbackModel) {
  if (body && body.ok === false) return { ok: false, reason: body.reason || 'error' };
  if (!body || typeof body.answers !== 'object' || body.answers == null) return { ok: false, reason: 'bad-body' };
  return { ok: true, model: body.model || fallbackModel || DEFAULT_MODEL, answers: body.answers, usage: body.usage ?? null };
}

export function choiceStats(answer) {
  if (!answer || typeof answer.choice !== 'string') return null;
  const probs = answer.probabilities && typeof answer.probabilities === 'object' ? answer.probabilities : null;
  const ranked = probs
    ? Object.values(probs).map(Number).filter((n) => Number.isFinite(n)).sort((a, b) => b - a)
    : [];
  const top = ranked[0] ?? null;
  const second = ranked.length > 1 ? ranked[1] : (top == null ? null : 0);
  const margin = top == null || second == null ? null : top - second;
  const rawP = probs ? probs[answer.choice] : null;
  const probability = typeof rawP === 'number' && Number.isFinite(rawP) ? rawP
    : (typeof rawP === 'string' && Number.isFinite(Number(rawP)) ? Number(rawP) : top);
  return {
    choice: answer.choice,
    confidence: typeof answer.confidence === 'number' ? answer.confidence : null,
    margin,
    probability: typeof probability === 'number' && Number.isFinite(probability) ? probability : null,
  };
}

function choiceAccepted(stats) {
  if (!stats?.choice) return false;
  if (stats.confidence == null || stats.confidence < minConfidence()) return false;
  if (stats.margin == null || stats.margin < minMargin()) return false;
  return true;
}

function noulOf(answer) {
  return answer && typeof answer.noul === 'number' ? answer.noul : null;
}

export function runActive(cwd) {
  let dir = path.resolve(cwd || process.cwd());
  for (;;) {
    if (fs.existsSync(path.join(dir, '.spec-run', 'ACTIVE'))) return true;
    const parent = path.dirname(dir);
    if (parent === dir) return false;
    dir = parent;
  }
}

export function explicitSkill(prompt, skillIds) {
  const m = String(prompt || '').trim().match(/^\/(?:spec-system:)?([a-z0-9-]+)\b/i);
  return Boolean(m && skillIds.has(m[1].toLowerCase()));
}

function emptyRoute(reason) {
  return { inject: null, acted: false, reason, skill: null, behaviour: null, confidence: null, margin: null, model: null };
}

export function routePolicy({ answers, model, skillIds }) {
  const stats = choiceStats(answers?.skill);
  const behaviour = noulOf(answers?.behaviour_change);
  if (!choiceAccepted(stats) || !skillIds.has(stats.choice)) {
    return { ...emptyRoute('low-confidence'), skill: stats?.choice ?? null, behaviour, confidence: stats?.confidence ?? null, margin: stats?.margin ?? null, model: model ?? null };
  }
  if (stats.choice === 'none') {
    return { ...emptyRoute('none'), skill: 'none', behaviour, confidence: stats.confidence, margin: stats.margin, model: model ?? null };
  }
  let note = '';
  if (behaviour != null && behaviour >= 0.75) note = ' Behaviour change.';
  else if (behaviour != null && behaviour <= 0.25) note = ' Not a behaviour change.';
  const inject = `spec-system route: open spec-system:${stats.choice}.${note} conf=${fmt(stats.confidence)} model=${model || '-'}`;
  return {
    inject, acted: true, reason: 'routed', skill: stats.choice, behaviour,
    confidence: stats.confidence, margin: stats.margin, model: model ?? null,
  };
}

export async function routePrompt({ prompt, cwd }) {
  try {
    const catalog = loadCatalog('route');
    const skillIds = new Set(Object.keys(catalog.skill.criteria));
    const text = String(prompt || '');
    if (!text.trim()) return emptyRoute('empty');
    if (explicitSkill(text, skillIds)) return emptyRoute('explicit-skill');
    if (runActive(cwd)) return emptyRoute('run-active');
    const decision = await decide({ prompt: clip(text.trim(), 8000) }, questionsForSend(catalog));
    if (!decision.ok) return { ...emptyRoute(decision.reason), model: null };
    return routePolicy({ answers: decision.answers, model: decision.model, skillIds });
  } catch {
    return emptyRoute('error');
  }
}

function scoreBand(answer, labels) {
  const scale = labels?.length ? labels : (Array.isArray(answer?.legend) ? answer.legend : null);
  if (!scale?.length || typeof answer?.score !== 'number') return 'unknown';
  const idx = Math.max(0, Math.min(scale.length - 1, Math.round(answer.score)));
  return scale[idx];
}

function tierEnv(tier) {
  const v = process.env[`SPEC_SYSTEM_TIER_${tier.toUpperCase()}`];
  return v && v.trim() ? v.trim() : null;
}

function emptyTier(reason, extra = {}) {
  return {
    acted: false, reason, tier: null, reviewerTier: null, complexity: null,
    model: null, reviewerModel: null, confidence: null, probability: null, responseModel: null,
    ...extra,
  };
}

export function tierPolicy(decision, labels) {
  if (!decision?.ok) return emptyTier(decision?.reason || 'no-decision');
  const stats = choiceStats(decision.answers?.tier);
  const complexity = scoreBand(decision.answers?.complexity, labels);
  const base = {
    complexity, confidence: stats?.confidence ?? null, probability: stats?.probability ?? null,
    responseModel: decision.model ?? null,
  };
  if (!choiceAccepted(stats) || !TIERS.has(stats.choice)) {
    return emptyTier('low-confidence', { ...base, tier: stats?.choice ?? null });
  }
  const tier = stats.choice;
  const reviewerTier = tier === 'frontier' ? 'frontier' : 'session';
  const model = tierEnv(tier);
  const reviewerModel = tierEnv(reviewerTier);
  return {
    acted: Boolean(model),
    reason: model ? 'mapped' : 'tier-unset',
    tier,
    reviewerTier,
    complexity,
    model,
    reviewerModel,
    confidence: stats.confidence,
    probability: stats.probability,
    responseModel: decision.model ?? null,
  };
}

export function parseStatements(markdown) {
  const lines = String(markdown).split('\n');
  const out = [];
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(STATEMENT_HEAD);
    if (!m) continue;
    let end = i + 1;
    while (end < lines.length && !/^#{2,3}\s/.test(lines[end])) end++;
    out.push({ id: m[1], text: lines.slice(i, end).join('\n').trim() });
    i = end - 1;
  }
  return out;
}

export function reviewRows(statements, answers) {
  return statements.map((s) => {
    const touches = noulOf(answers?.[`touches__${s.id}`]);
    const stats = choiceStats(answers?.[`verdict__${s.id}`]);
    const verdict = stats?.choice ?? null;
    const confidence = stats?.confidence ?? null;
    const skip = touches != null && touches < 0.35 && verdict === 'CONSISTENT' && choiceAccepted(stats);
    return { id: s.id, touches, verdict, confidence, mustRead: !skip };
  });
}

function reviewQuestions(statements) {
  const template = loadCatalog('review');
  const questions = {};
  for (const s of statements) {
    for (const [name, q] of Object.entries(template)) {
      const sent = { ...q, instructions: q.instructions.replaceAll('{{id}}', s.id) };
      delete sent.labels;
      questions[`${name}__${s.id}`] = sent;
    }
  }
  return questions;
}

function appendPlanLog(plan, line) {
  const run = path.join(here, 'run.mjs');
  const r = spawnSync(process.execPath, [run, 'log', plan, line], { encoding: 'utf8' });
  return r.status === 0;
}

function tierLog(task, result) {
  const answer = result.reason === 'mapped' || result.reason === 'tier-unset' || result.reason === 'low-confidence'
    ? `${result.tier || result.reason}/${result.complexity || 'unknown'}`
    : result.reason;
  return logLine({
    name: `tier ${task}`,
    answer,
    p: result.probability,
    conf: result.confidence,
    model: result.responseModel,
    disposition: result.acted ? 'acted' : 'ignored',
  });
}

async function readStdin() {
  if (process.stdin.isTTY) return '';
  const chunks = [];
  for await (const c of process.stdin) chunks.push(c);
  return Buffer.concat(chunks).toString('utf8');
}

function decisionFromFile(file) {
  const body = readJson(file);
  if (body && body.ok === false) return { ok: false, reason: body.reason || 'error' };
  if (body && body.answers) return { ok: true, model: body.model || 'offline', answers: body.answers };
  return { ok: false, reason: 'bad-body' };
}

async function cmdRoute(f) {
  const prompt = f.prompt ?? (f['prompt-file'] ? fs.readFileSync(f['prompt-file'], 'utf8') : '');
  console.log(JSON.stringify(await routePrompt({ prompt, cwd: f.cwd || process.cwd() })));
}

async function cmdTier(f) {
  if (!f.brief || !f.task) die('usage: openrouter.mjs tier --brief <file> --task <T> [--plan <plan>]');
  const brief = fs.readFileSync(f.brief, 'utf8');
  const catalog = loadCatalog('tier');
  const decision = await decide({ brief: clip(brief, 16000) }, questionsForSend(catalog));
  const result = tierPolicy(decision, catalog.complexity.labels);
  if (f.plan && result.reason !== 'no-key') appendPlanLog(f.plan, tierLog(f.task, result));
  console.log(JSON.stringify(result));
}

async function cmdReview(f) {
  if (!f.spec) die('usage: openrouter.mjs review --spec <file> [--plan <plan>]  < diff stat');
  const statements = parseStatements(fs.readFileSync(f.spec, 'utf8'));
  const stat = f['stat-file'] ? fs.readFileSync(f['stat-file'], 'utf8') : await readStdin();
  let result;
  if (!statements.length) {
    result = { acted: false, reason: 'no-statements', model: null, statements: [] };
  } else if (statements.length > MAX_REVIEW_STATEMENTS) {
    result = { acted: false, reason: 'too-many', model: null, statements: reviewRows(statements, {}) };
  } else if (!stat.trim()) {
    result = { acted: false, reason: 'no-stat', model: null, statements: reviewRows(statements, {}) };
  } else {
    const decision = await decide(
      { stat: clip(stat, 4000), statements: statements.map((s) => ({ id: s.id, text: clip(s.text, 800) })) },
      reviewQuestions(statements),
    );
    const rows = reviewRows(statements, decision.ok ? decision.answers : {});
    result = {
      acted: Boolean(decision.ok),
      reason: decision.ok ? 'prior' : decision.reason,
      model: decision.ok ? decision.model : null,
      statements: rows,
    };
    if (f.plan && decision.reason !== 'no-key' && decision.ok) {
      const must = rows.filter((r) => r.mustRead).length;
      const confs = rows.map((r) => r.confidence).filter((n) => typeof n === 'number');
      appendPlanLog(f.plan, logLine({
        name: 'review',
        answer: `${must}/${rows.length} must-read`,
        p: null,
        conf: confs.length ? Math.min(...confs) : null,
        model: decision.model,
        disposition: 'acted',
      }));
    }
  }
  console.log(JSON.stringify(result));
}

async function cmdPark(f) {
  if (!f.plan || !f.task || !f.question) die('usage: openrouter.mjs park --plan <plan> --task <T> --question <text>');
  const catalog = loadCatalog('park');
  const decision = await decide({ question: clip(f.question, 4000), task: f.task }, questionsForSend(catalog));
  const behaviour = decision.ok ? noulOf(decision.answers?.behaviour) : null;
  const result = {
    observed: behaviour != null,
    acted: false,
    reason: decision.ok ? 'observed' : decision.reason,
    behaviour,
    model: decision.ok ? decision.model : null,
    decide: 'controller',
  };
  if (behaviour != null) {
    appendPlanLog(f.plan, logLine({
      name: `park ${f.task}`,
      answer: 'behaviour',
      p: behaviour,
      conf: null,
      model: decision.model,
      disposition: 'ignored',
    }));
  }
  console.log(JSON.stringify(result));
}

function cmdPolicy(f) {
  const kind = f._[0];
  if (!kind || !f.answers) die('usage: openrouter.mjs policy <route|tier|review> --answers <file>');
  const decision = decisionFromFile(f.answers);
  if (kind === 'route') {
    const catalog = loadCatalog('route');
    const skillIds = new Set(Object.keys(catalog.skill.criteria));
    const prompt = f.prompt ?? '';
    if (!String(prompt).trim()) return console.log(JSON.stringify(emptyRoute('empty')));
    if (explicitSkill(prompt, skillIds)) return console.log(JSON.stringify(emptyRoute('explicit-skill')));
    if (f.cwd && runActive(f.cwd)) return console.log(JSON.stringify(emptyRoute('run-active')));
    console.log(JSON.stringify(decision.ok
      ? routePolicy({ answers: decision.answers, model: decision.model, skillIds })
      : emptyRoute(decision.reason)));
  } else if (kind === 'tier') {
    const labels = loadCatalog('tier').complexity.labels;
    console.log(JSON.stringify(tierPolicy(decision, labels)));
  } else if (kind === 'review') {
    if (!f.spec) die('usage: openrouter.mjs policy review --spec <file> --answers <file>');
    const statements = parseStatements(fs.readFileSync(f.spec, 'utf8'));
    const rows = reviewRows(statements, decision.ok ? decision.answers : {});
    console.log(JSON.stringify({
      acted: Boolean(decision.ok),
      reason: decision.ok ? 'prior' : decision.reason,
      model: decision.model ?? null,
      statements: rows,
    }));
  } else die('usage: openrouter.mjs policy <route|tier|review> --answers <file>');
}

function help() {
  console.log(`usage: node openrouter.mjs <command>
  route   --prompt <text> [--cwd <dir>]
  tier    --brief <file> --task <T> [--plan <plan>]
  review  --spec <file> [--plan <plan>]          diff stat on stdin
  park    --plan <plan> --task <T> --question <text>
  policy  <route|tier|review> --answers <file>   offline, no network`);
}

async function main() {
  const [cmd, ...rest] = process.argv.slice(2);
  const f = flags(rest);
  if (!cmd || cmd === 'help' || cmd === '--help') {
    help();
    process.exit(cmd ? 0 : 2);
  } else if (cmd === 'route') await cmdRoute(f);
  else if (cmd === 'tier') await cmdTier(f);
  else if (cmd === 'review') await cmdReview(f);
  else if (cmd === 'park') await cmdPark(f);
  else if (cmd === 'policy') cmdPolicy(f);
  else die(`unknown command: ${cmd}\n${'run with help'}`);
}

const invoked = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));
if (invoked) {
  main().catch((err) => {
    console.error(err?.message || String(err));
    process.exit(1);
  });
}
