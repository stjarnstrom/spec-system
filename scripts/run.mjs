#!/usr/bin/env node
// Run tooling for spec-implement and spec-run: the mechanical core of a
// subagent-driven run. The plan file is the ledger — checkboxes are task
// state, `## Run log` is the event record — so a run survives compaction by
// reading the plan, never its own memory. Bulky artefacts (briefs, reports,
// diff packages, test logs) live in a self-ignoring workspace,
// .spec-run/<plan>/, so they reach subagents as paths, not pasted text.
//
//   status  <plan>                      tasks, run-log tail, and the next task
//   start   <plan> <T>                  mark [~], log the base commit, write the brief
//   brief   <plan> <T>                  (re)write the task brief only
//   package <plan|-> <base> [<head>]    write commits + stat + diff for review
//   done    <plan> <T> <base> -- <cmd>  run the tests; only on exit 0 mark [x] and log
//   park    <plan> <T> <question>       mark [!] and log the question
//   unpark  <plan> <T> <answer>         mark [ ] again once its question is answered
//   log     <plan> <line>               append one run-log line
//   active  [set <plan>... | clear]     the in-progress marker the session hook reads
//
// Zero dependencies. Run from anywhere inside the repo.

import fs from 'node:fs';
import path from 'node:path';
import { execSync, spawnSync } from 'node:child_process';

const die = (msg, code = 2) => { console.error(`✗ ${msg}`); process.exit(code); };
const git = (args) => execSync(`git ${args}`, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();

let ROOT;
try { ROOT = git('rev-parse --show-toplevel'); } catch { ROOT = process.cwd(); }
const RUN_DIR = path.join(ROOT, '.spec-run');

function workspace(name) {
  fs.mkdirSync(RUN_DIR, { recursive: true });
  const ignore = path.join(RUN_DIR, '.gitignore');
  if (!fs.existsSync(ignore)) fs.writeFileSync(ignore, '*\n');
  const ws = path.join(RUN_DIR, name);
  fs.mkdirSync(ws, { recursive: true });
  return ws;
}

function resolvePlan(arg) {
  if (!arg) die('name the plan file');
  const fromCwd = path.resolve(process.cwd(), arg);
  let abs = fs.existsSync(fromCwd) ? fromCwd : path.resolve(ROOT, arg);
  // pin and archive move a finished plan from active/ to completed/.
  const moved = path.join(ROOT, 'docs', 'changes', 'completed', path.basename(abs));
  if (!fs.existsSync(abs) && fs.existsSync(moved)) abs = moved;
  if (!fs.existsSync(abs)) die(`plan not found: ${arg}`);
  return abs;
}
const rel = (abs) => path.relative(ROOT, abs).replaceAll('\\', '/');
const planName = (abs) => path.basename(abs, '.md');

// ── plan parsing ─────────────────────────────────────────────────────────────
// A task is a top-level checkbox line; its detail is the indented lines under
// it. Its id is **T<n>** when written, else its position (legacy plans).

const TASK_RE = /^[-*] \[([ x~!])\] (.*)$/;

function parsePlan(abs) {
  const lines = fs.readFileSync(abs, 'utf8').split('\n');
  const tasks = [];
  lines.forEach((line, i) => {
    const m = line.match(TASK_RE);
    if (!m) return;
    const id = (m[2].match(/\*\*(T\d+)\*\*/) ?? [])[1] ?? `T${tasks.length + 1}`;
    let end = i + 1;
    while (end < lines.length && (/^\s+\S/.test(lines[end]) || (lines[end] === '' && /^\s+\S/.test(lines[end + 1] ?? '')))) end++;
    const after = m[2].match(/·\s*after:\s*([^·]+)$/);
    tasks.push({
      id, line: i, end, state: m[1], text: m[2],
      after: after ? [...after[1].matchAll(/T\d+/g)].map((x) => x[0]) : [],
      human: /\[human\]/i.test(m[2]),
    });
  });
  return { lines, tasks };
}

function section(lines, title) {
  const start = lines.findIndex((l) => new RegExp(`^##\\s+${title}\\s*$`, 'i').test(l));
  if (start === -1) return null;
  let end = start + 1;
  while (end < lines.length && !/^##\s/.test(lines[end])) end++;
  const body = lines.slice(start + 1, end).join('\n').trim();
  return body || null;
}

function findTask(plan, id) {
  const t = plan.tasks.find((x) => x.id.toLowerCase() === String(id).toLowerCase());
  if (!t) die(`no task ${id} in the plan (tasks: ${plan.tasks.map((x) => x.id).join(', ') || 'none'})`);
  return t;
}

function setState(abs, id, state) {
  const plan = parsePlan(abs);
  const t = findTask(plan, id);
  plan.lines[t.line] = plan.lines[t.line].replace(/^([-*]) \[[ x~!]\]/, `$1 [${state}]`);
  fs.writeFileSync(abs, plan.lines.join('\n'));
}

function appendLog(abs, entry) {
  const lines = fs.readFileSync(abs, 'utf8').split('\n');
  let start = lines.findIndex((l) => /^##\s+Run log\s*$/i.test(l));
  if (start === -1) {
    while (lines.length && lines[lines.length - 1] === '') lines.pop();
    lines.push('', '## Run log', '');
    start = lines.length - 2;
  }
  let end = start + 1;
  while (end < lines.length && !/^##\s/.test(lines[end])) end++;
  let at = end;
  while (at > start + 1 && lines[at - 1] === '') at--;
  const one = entry.replace(/\s*\n\s*/g, ' ').trim();
  lines.splice(at, 0, ...(at === start + 1 ? ['', `- ${one}`] : [`- ${one}`]));
  if (lines[lines.length - 1] !== '') lines.push('');
  fs.writeFileSync(abs, lines.join('\n'));
}

// ── statement resolution ─────────────────────────────────────────────────────
// Statement ids cited by a task resolve to their full blocks in specs/*.md,
// so the implementer reads the exact normative text, never a paraphrase.

const ID_RE = /\b[A-Z][A-Z0-9]*-(?:[IU]-)?\d{3,}\b/g;

function specFiles() {
  const dir = path.join(ROOT, 'specs');
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter((f) => f.endsWith('.md') && !/^(FORMAT|REGISTRY)\.md$/.test(f) && !f.endsWith('.anomalies.md'))
    .map((f) => path.join(dir, f));
}

function resolveStatements(ids) {
  const found = new Map(); // id -> { file, block }
  const owned = new Map(); // spec file -> paths[]
  for (const file of specFiles()) {
    const text = fs.readFileSync(file, 'utf8');
    const lines = text.split('\n');
    for (const id of ids) {
      if (found.has(id)) continue;
      const i = lines.findIndex((l) => new RegExp(`^###\\s+${id}\\b`).test(l));
      if (i === -1) continue;
      let end = i + 1;
      while (end < lines.length && !/^###?\s/.test(lines[end])) end++;
      found.set(id, { file, block: lines.slice(i, end).join('\n').trim() });
      if (!owned.has(file)) {
        const fm = text.match(/^---\n([\s\S]*?)\n---/);
        const paths = fm ? (fm[1].match(/^paths:\s*\n((?:\s+-\s.*\n?)*)/m)?.[1] ?? '').split('\n').map((l) => l.replace(/^\s+-\s+/, '').trim()).filter(Boolean) : [];
        owned.set(file, paths);
      }
    }
  }
  return { found, owned };
}

function writeBrief(abs, id) {
  const plan = parsePlan(abs);
  const t = findTask(plan, id);
  const taskText = plan.lines.slice(t.line, t.end).join('\n');
  const ids = [...new Set(taskText.match(ID_RE) ?? [])];
  const { found, owned } = resolveStatements(ids);
  const headEnd = plan.lines.findIndex((l) => /^##\s/.test(l) || TASK_RE.test(l));
  const header = plan.lines.slice(0, headEnd === -1 ? plan.lines.length : headEnd).join('\n').trim();
  const out = [`# Brief — ${planName(abs)} ${t.id}`, '', `Plan: ${rel(abs)}`, '', header, '', '## Your task', '', taskText, ''];
  const uncertain = ids.filter((x) => /-U-\d/.test(x));
  if (found.size) {
    out.push('## Statements this task makes true', '', 'Verbatim from the spec. These are the requirements; the code and the tests answer to them.', '');
    for (const [sid, s] of found) out.push(`<!-- ${rel(s.file)} -->`, s.block, '');
  }
  const missing = ids.filter((x) => !found.has(x));
  if (missing.length) out.push(`Not found in specs/: ${missing.join(', ')} — check the plan before starting.`, '');
  if (uncertain.length) out.push(`**Open uncertainty cited: ${uncertain.join(', ')}.** Behaviour it leaves open is not yours to decide — report BLOCKED with the question.`, '');
  for (const [file, paths] of owned) if (paths.length) out.push(`## Owned paths (${rel(file)})`, '', ...paths.map((p) => `- ${p}`), '');
  for (const s of ['Test seams', 'Review focus', 'Constraints']) {
    const body = section(plan.lines, s);
    if (body) out.push(`## ${s}`, '', body, '');
  }
  const ws = workspace(planName(abs));
  const file = path.join(ws, `${t.id}-brief.md`);
  fs.writeFileSync(file, out.join('\n'));
  return { file, uncertain, missing, ws, t };
}

// ── commands ─────────────────────────────────────────────────────────────────

const [cmd, ...args] = process.argv.slice(2);
const mark = { ' ': '[ ]', x: '[x]', '~': '[~]', '!': '[!]' };

if (cmd === 'status') {
  const abs = resolvePlan(args[0]);
  const plan = parsePlan(abs);
  const n = (s) => plan.tasks.filter((t) => t.state === s).length;
  console.log(`plan: ${rel(abs)} — ${n('x')}/${plan.tasks.length} done`
    + (n('~') ? ` · ${n('~')} in progress` : '') + (n('!') ? ` · ${n('!')} parked` : ''));
  for (const t of plan.tasks) console.log(`  ${mark[t.state]} ${t.text}`);
  const log = (section(plan.lines, 'Run log') ?? '').split('\n').filter((l) => l.startsWith('- '));
  if (log.length) {
    console.log(`run log (last ${Math.min(log.length, 15)} of ${log.length}):`);
    for (const l of log.slice(-15)) console.log(`  ${l.slice(2)}`);
  }
  const state = Object.fromEntries(plan.tasks.map((t) => [t.id, t.state]));
  const doing = plan.tasks.find((t) => t.state === '~');
  const ready = plan.tasks.filter((t) => t.state === ' ' && t.after.every((d) => state[d] === 'x'));
  if (doing) console.log(`next: resume ${doing.id} — its work since the logged base is in git log`);
  else if (ready.length) console.log(`next: ${ready[0].id}${ready.length > 1 ? ` (also ready: ${ready.slice(1).map((t) => t.id).join(', ')})` : ''}`);
  else if (plan.tasks.every((t) => t.state === 'x')) console.log('next: every task done — full verification, then pin (or archive)');
  else console.log('next: nothing ready — the remaining tasks are parked or wait on parked tasks');
} else if (cmd === 'start' || cmd === 'brief') {
  const abs = resolvePlan(args[0]);
  if (!args[1]) die(`usage: run.mjs ${cmd} <plan> <T>`);
  const b = writeBrief(abs, args[1]);
  if (cmd === 'start') {
    const base = git('rev-parse HEAD');
    setState(abs, b.t.id, '~');
    appendLog(abs, `${b.t.id}: started (base ${base.slice(0, 7)})`);
    console.log(`base: ${base}`);
  }
  console.log(`brief: ${b.file}`);
  console.log(`report: ${path.join(b.ws, `${b.t.id}-report.md`)}`);
  if (b.uncertain.length) console.log(`warning: cites open uncertainty ${b.uncertain.join(', ')}`);
  if (b.missing.length) console.log(`warning: statements not found in specs/: ${b.missing.join(', ')}`);
} else if (cmd === 'package') {
  const [planArg, base, head = 'HEAD'] = args;
  if (!planArg || !base) die('usage: run.mjs package <plan|-> <base> [<head>]');
  const ws = workspace(planArg === '-' ? 'review' : planName(resolvePlan(planArg)));
  let b, h;
  try { b = git(`rev-parse ${base}`); h = git(`rev-parse ${head}`); } catch { die(`cannot resolve ${base} or ${head}`, 3); }
  if (spawnSync('git', ['merge-base', '--is-ancestor', b, h]).status !== 0) die(`${base} is not an ancestor of ${head}`, 3);
  const commits = git(`log --oneline ${b}..${h}`);
  if (!commits) die(`empty range ${b.slice(0, 7)}..${h.slice(0, 7)} — nothing committed to review`, 3);
  const file = path.join(ws, `review-${b.slice(0, 7)}..${h.slice(0, 7)}.diff`);
  const diff = execSync(`git diff -U10 ${b} ${h}`, { encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 });
  fs.writeFileSync(file, `# commits\n${commits}\n\n# stat\n${git(`diff --stat ${b} ${h}`)}\n\n# diff\n${diff}`);
  console.log(`package: ${file} (${commits.split('\n').length} commits)`);
} else if (cmd === 'done') {
  const abs = resolvePlan(args[0]);
  const sep = args.indexOf('--');
  const [, id, base] = args;
  if (!id || !base || sep === -1 || sep === args.length - 1) die('usage: run.mjs done <plan> <T> <base> -- <test command>');
  const t = findTask(parsePlan(abs), id);
  let base7;
  try { base7 = git(`rev-parse --verify --short=7 ${base}^{commit}`); } catch { die(`${t.id}: cannot resolve base ${base} — nothing recorded`); }
  const testCmd = args.slice(sep + 1).join(' ');
  const logFile = path.join(workspace(planName(abs)), `${t.id}-tests.log`);
  const r = spawnSync('sh', ['-c', testCmd], { cwd: ROOT, encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 });
  const output = `${r.stdout ?? ''}${r.stderr ?? ''}`;
  fs.writeFileSync(logFile, output);
  const tail = output.trimEnd().split('\n');
  console.log(tail.slice(-20).join('\n'));
  if (r.status !== 0) die(`${t.id}: tests exited ${r.status} — nothing recorded (full log: ${logFile})`, 1);
  const head = git('rev-parse --short=7 HEAD');
  // The result line: the runner's last pass count, plus a later fail count
  // when it prints them apart (node --test does); else the last line.
  const lines = tail.map((l) => l.trim()).filter(Boolean);
  const passAt = lines.findLastIndex((l) => /\bpass(ed|es)?\b|\bok\b/i.test(l));
  const failAt = lines.findLastIndex((l) => /\bfail(ed|ures?)?\b/i.test(l));
  const last = passAt === -1 ? (lines.pop() ?? 'exit 0')
    : failAt > passAt ? `${lines[passAt]} · ${lines[failAt]}` : lines[passAt];
  setState(abs, t.id, 'x');
  appendLog(abs, `${t.id}: complete (${base7}..${head}, tests: ${testCmd} → ${last})`);
  console.log(`✓ ${t.id} complete`);
} else if (cmd === 'park') {
  const abs = resolvePlan(args[0]);
  const [, id, ...q] = args;
  if (!id || !q.length) die('usage: run.mjs park <plan> <T> <question>');
  const t = findTask(parsePlan(abs), id);
  setState(abs, t.id, '!');
  appendLog(abs, `${t.id}: parked — ${q.join(' ')}`);
  console.log(`! ${t.id} parked`);
} else if (cmd === 'unpark') {
  const abs = resolvePlan(args[0]);
  const [, id, ...a] = args;
  if (!id || !a.length) die('usage: run.mjs unpark <plan> <T> <how the question was answered>');
  const t = findTask(parsePlan(abs), id);
  if (t.state !== '!') die(`${t.id} is not parked`);
  setState(abs, t.id, ' ');
  appendLog(abs, `${t.id}: unparked — ${a.join(' ')}`);
  console.log(`✓ ${t.id} ready again`);
} else if (cmd === 'log') {
  const abs = resolvePlan(args[0]);
  if (args.length < 2) die('usage: run.mjs log <plan> <line>');
  appendLog(abs, args.slice(1).join(' '));
  console.log('✓ logged');
} else if (cmd === 'active') {
  const marker = path.join(RUN_DIR, 'ACTIVE');
  if (args[0] === 'set') {
    const plans = args.slice(1).map((p) => rel(resolvePlan(p)));
    if (!plans.length) die('usage: run.mjs active set <plan>...');
    workspace('.');
    fs.writeFileSync(marker, `${plans.join('\n')}\n`);
    console.log(`✓ run marked active: ${plans.join(', ')}`);
  } else if (args[0] === 'clear') {
    fs.rmSync(marker, { force: true });
    console.log('✓ run marker cleared');
  } else {
    console.log(fs.existsSync(marker) ? fs.readFileSync(marker, 'utf8').trim() : 'no run in progress');
  }
} else {
  (cmd && cmd !== 'help' ? console.error : console.log)(`usage: node run.mjs <command> …
  status  <plan>                      tasks, run-log tail, and the next task
  start   <plan> <T>                  mark [~], log the base commit, write the brief
  brief   <plan> <T>                  (re)write the task brief only
  package <plan|-> <base> [<head>]    write commits + stat + diff for review
  done    <plan> <T> <base> -- <cmd>  run the tests; only on exit 0 mark [x] and log
  park    <plan> <T> <question>       mark [!] and log the question
  unpark  <plan> <T> <answer>         mark [ ] again once its question is answered
  log     <plan> <line>               append one run-log line
  active  [set <plan>... | clear]     the in-progress marker the session hook reads`);
  process.exit(cmd && cmd !== 'help' ? 2 : 0);
}
