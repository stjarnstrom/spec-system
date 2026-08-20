#!/usr/bin/env node
// Registry tooling for the spec layer.
//
//   node specs/registry.mjs check   validate registry.yaml against the specs
//                                   and the working tree; exit 1 on any failure
//   node specs/registry.mjs sync    run check, then regenerate the tables in
//                                   REGISTRY.md between the generated markers
//
//   node specs/registry.mjs owns <file>...   map files (e.g. git diff --name-only)
//                                   to their owning capability, seam, or unowned
//
//   node specs/registry.mjs pin <capability>   set the capability's pin to its
//                                   spec file's current content hash — the last
//                                   act of implementing, never part of amending
//
// registry.yaml is the machine truth; REGISTRY.md is its human rendering.
//
// A pin is the git blob hash of the spec file content the code satisfies.
// Spec files carry no version number — git holds their history. The pin's
// three states are the whole model: equal to the file's current hash (in
// sync), different (an amendment is written and unimplemented — a plan must
// exist), or `none` (a target spec whose code does not exist yet).

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';

export const TOOL_VERSION = '0.4.0';

// Identical to `git hash-object <file>` — pins survive with or without git.
function blobHash(abs) {
  const buf = fs.readFileSync(abs);
  return crypto.createHash('sha1').update(`blob ${buf.length}\0`).update(buf).digest('hex');
}
const shortPin = (p) => (typeof p === 'string' && p !== 'none' ? p.slice(0, 12) : String(p));

// The specs dir is found from the working directory (walk up to the nearest
// specs/registry.yaml), so one copy of this script serves any repo it is run
// in. Fallback: the script's own directory, for a copy vendored into specs/.
function findSpecs() {
  let dir = process.cwd();
  for (;;) {
    const cand = path.join(dir, 'specs', 'registry.yaml');
    if (fs.existsSync(cand)) return path.join(dir, 'specs');
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  const own = path.dirname(fileURLToPath(import.meta.url));
  if (fs.existsSync(path.join(own, 'registry.yaml'))) return own;
  console.error('✗ no specs/registry.yaml found above the working directory');
  process.exit(2);
}

// ── YAML loading ──────────────────────────────────────────────────────────────
// Prefer js-yaml when the host repo has it; otherwise fall back to a bundled
// parser for the subset these files actually use: nested maps, sequences
// (scalar items and `- key: value` map items), block scalars (|), full-line
// comments, and int/bool coercion. `#` starts a comment only after whitespace,
// so path#symbol entries survive.
function miniYamlLoad(text) {
  const src = text.split('\n');
  const sig = []; // significant lines: {indent, body, lineNo}
  for (let n = 0; n < src.length; n++) {
    const raw = src[n];
    if (!raw.trim() || /^\s*#/.test(raw)) continue;
    sig.push({ indent: raw.match(/^ */)[0].length, body: raw.trim(), lineNo: n });
  }
  const scalar = (v) => {
    const cut = v.search(/\s#/);
    if (cut !== -1) v = v.slice(0, cut).trimEnd();
    if (v === 'true') return true;
    if (v === 'false') return false;
    if (v === 'null' || v === '~' || v === '') return null;
    // length guard: an all-digit content hash must stay a string
    if (/^-?\d+$/.test(v) && v.length <= 15) return Number(v);
    const q = v.match(/^(['"])(.*)\1$/);
    return q ? q[2] : v;
  };
  const blockScalar = (afterLine, keyIndent) => {
    // consume raw source lines more indented than the key; clip to one \n
    const out = [];
    let n = afterLine + 1;
    let strip = null;
    for (; n < src.length; n++) {
      const raw = src[n];
      if (!raw.trim()) { out.push(''); continue; }
      const ind = raw.match(/^ */)[0].length;
      if (ind <= keyIndent) break;
      strip ??= ind;
      out.push(raw.slice(strip));
    }
    while (out.length && out[out.length - 1] === '') out.pop();
    return [out.join('\n') + '\n', n];
  };
  let i = 0;
  function parseBlock(indent) {
    if (i >= sig.length || sig[i].indent < indent) return null;
    return sig[i].body.startsWith('- ') || sig[i].body === '-'
      ? parseSeq(sig[i].indent) : parseMap(sig[i].indent);
  }
  function parseEntry(map, key, rest, keyIndent, lineNo) {
    if (rest === '|' || rest === '|-') {
      const [val, nextSrcLine] = blockScalar(lineNo, keyIndent);
      map[key] = val;
      while (i < sig.length && sig[i].lineNo < nextSrcLine) i++;
    } else if (rest !== '') {
      map[key] = scalar(rest);
    } else {
      map[key] = i < sig.length && sig[i].indent > keyIndent ? parseBlock(sig[i].indent) : null;
    }
  }
  function parseMap(indent) {
    const map = {};
    while (i < sig.length && sig[i].indent === indent && !sig[i].body.startsWith('- ')) {
      const m = sig[i].body.match(/^([^\s:]+):(?: (.*))?$/);
      if (!m) throw new Error(`mini-yaml: cannot parse line ${sig[i].lineNo + 1}: ${sig[i].body}`);
      i++;
      parseEntry(map, m[1], m[2] ?? '', indent, sig[i - 1].lineNo);
    }
    return map;
  }
  function parseSeq(indent) {
    const seq = [];
    while (i < sig.length && sig[i].indent === indent && sig[i].body.startsWith('- ')) {
      const rest = sig[i].body.slice(2);
      const m = rest.match(/^([^\s:]+):(?: (.*))?$/);
      if (m) {
        // `- key: value` opens a map; further entries sit two spaces deeper
        const map = {};
        const lineNo = sig[i].lineNo;
        i++;
        parseEntry(map, m[1], m[2] ?? '', indent, lineNo);
        while (i < sig.length && sig[i].indent === indent + 2 && !sig[i].body.startsWith('- ')) {
          const e = sig[i].body.match(/^([^\s:]+):(?: (.*))?$/);
          if (!e) throw new Error(`mini-yaml: cannot parse line ${sig[i].lineNo + 1}`);
          i++;
          parseEntry(map, e[1], e[2] ?? '', indent + 2, sig[i - 1].lineNo);
        }
        seq.push(map);
      } else {
        seq.push(scalar(rest));
        i++;
      }
    }
    return seq;
  }
  const doc = parseBlock(0);
  i = 0;
  return doc;
}

let yaml;
try {
  yaml = require('js-yaml');
  if (process.env.SPEC_REGISTRY_MINI_YAML) throw new Error('forced');
} catch {
  yaml = { load: miniYamlLoad };
}

const SPECS = findSpecs();
const ROOT = path.dirname(SPECS);
// Resolve js-yaml from the HOST repo, not from wherever this script lives.
const require = createRequire(path.join(ROOT, 'noop.js'));

const reg = yaml.load(fs.readFileSync(path.join(SPECS, 'registry.yaml'), 'utf8'));
const caps = reg.capabilities ?? {};
const errors = [];
const err = (m) => errors.push(m);

// Pin state, computed once per capability with a spec:
//   'in sync'               — the spec file's hash equals the pin
//   'amendment outstanding' — the file changed since the pin; a plan must exist
//   'target'                — pinned: none; the code does not exist yet
for (const c of Object.values(caps)) {
  if (!c || !c.spec) continue;
  const abs = path.join(SPECS, c.spec);
  if (c.pinned === 'none') c._state = 'target';
  else if (typeof c.pinned === 'string' && fs.existsSync(abs))
    c._state = blobHash(abs) === c.pinned ? 'in sync' : 'amendment outstanding';
  else c._state = null;
}

// ── path ownership ────────────────────────────────────────────────────────────

function splitOwned(entry) {
  const i = entry.indexOf('#');
  return i === -1
    ? { file: entry, symbol: null }
    : { file: entry.slice(0, i), symbol: entry.slice(i + 1) };
}

function checkOwnedPath(cap, entry, c) {
  // While the pin does not match the spec file, owned paths the plan has not
  // built yet are legal — a target spec (pinned: none) or an amendment adding
  // files owns paths that do not exist until implemented. Noted, not an
  // error; the pin/file mismatch is the record that work is outstanding.
  const planned = c && c._state && c._state !== 'in sync';
  const missing = (what) => planned
    ? console.log(`  ○ ${cap}: owned ${what} not yet on disk (plan outstanding)`)
    : err(`${cap}: owned ${what} missing`);
  const { file, symbol } = splitOwned(entry);
  if (file.endsWith('/**')) {
    const dir = path.join(ROOT, file.slice(0, -3));
    if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory())
      missing(`directory: ${file}`);
    return;
  }
  const abs = path.join(ROOT, file);
  if (!fs.existsSync(abs)) return missing(`file: ${file}`);
  if (symbol && !fs.readFileSync(abs, 'utf8').includes(symbol)) {
    if (planned) console.log(`  ○ ${cap}: owned symbol "${symbol}" not yet in ${file} (plan outstanding)`);
    else err(`${cap}: symbol "${symbol}" not found in ${file}`);
  }
}

// No path may have two owners. Whole-file ownership conflicts with any other
// claim on the file; two distinct #symbols in one file are fine. Globs count:
// a dir/** claim conflicts with any other capability's claim under that
// prefix, nested globs included.
function checkOwnershipDisjoint() {
  const claims = [];
  for (const [cap, c] of Object.entries(caps))
    for (const entry of c.paths ?? []) {
      const { file, symbol } = splitOwned(entry);
      const glob = file.endsWith('/**');
      claims.push({ cap, file, symbol, glob, prefix: glob ? file.slice(0, -2) : null });
    }
  for (let i = 0; i < claims.length; i++)
    for (let j = i + 1; j < claims.length; j++) {
      const a = claims[i], b = claims[j];
      if (a.cap === b.cap) continue;
      const label = (x) => `${x.cap} (${x.file}${x.symbol ? '#' + x.symbol : ''})`;
      if (a.glob || b.glob) {
        const covers = (g, o) => g.glob && (o.glob ? o.prefix.startsWith(g.prefix) || g.prefix.startsWith(o.prefix) : o.file.startsWith(g.prefix));
        if (covers(a, b) || covers(b, a))
          err(`ownership conflict: ${label(a)} overlaps ${label(b)}`);
      } else if (a.file === b.file) {
        if (a.symbol === null || b.symbol === null || a.symbol === b.symbol)
          err(`ownership conflict on ${a.file}: ${label(a)} and ${label(b)}`);
      }
    }
}

// ── spec files ────────────────────────────────────────────────────────────────

function parseSpec(cap, c) {
  const abs = path.join(SPECS, c.spec);
  if (!fs.existsSync(abs)) { err(`${cap}: spec file missing: ${c.spec}`); return null; }
  const text = fs.readFileSync(abs, 'utf8');
  const m = text.match(/^---\n([\s\S]*?)\n---\n/);
  if (!m) { err(`${cap}: no frontmatter in ${c.spec}`); return null; }
  let fm;
  try { fm = yaml.load(m[1]); } catch (e) { err(`${cap}: bad frontmatter: ${e.message}`); return null; }

  if (fm.spec !== cap) err(`${cap}: frontmatter says spec: ${fm.spec}`);
  if ('version' in fm)
    err(`${cap}: version: in frontmatter is obsolete — git holds the history and the pin is a content hash; remove the line`);
  if ('status' in fm) err(`${cap}: status belongs in the registry, not the spec frontmatter`);

  // Statements. A block runs to the next heading; a requirement is verified
  // unless its block carries the literal UNVERIFIED.
  const body = text.slice(m[0].length);
  const blocks = body.split(/^### /m).slice(1);
  const stmt = { req: [], inv: [], unc: [] };
  const ids = new Set();
  for (const b of blocks) {
    const id = b.split(/\s/, 1)[0];
    if (!id.startsWith(`${c.prefix}-`)) continue;
    if (ids.has(id)) err(`${cap}: duplicate statement id ${id}`);
    ids.add(id);
    const kind = /^-I-/.test(id.slice(c.prefix.length)) ? 'inv'
      : /^-U-/.test(id.slice(c.prefix.length)) ? 'unc' : 'req';
    const block = b.slice(0, b.search(/^## /m) === -1 ? b.length : b.search(/^## /m));
    stmt[kind].push({ id, verified: kind === 'req' ? !block.includes('verified-by: UNVERIFIED') : null, block });

    // Invariants carry checked-by (a falsifying shell command, or UNCHECKED)
    // instead of verified-by — see FORMAT.md "checked-by".
    if (kind === 'inv') {
      const cb = block.match(/^checked-by: (.+)$/m);
      if (!cb) err(`${cap}: invariant ${id} has no checked-by (use UNCHECKED if none can exist)`);
      else if (block.includes('verified-by:')) err(`${cap}: invariant ${id} mixes verified-by and checked-by`);
      else stmt.inv[stmt.inv.length - 1].check = cb[1] === 'UNCHECKED' ? null : cb[1];
    }

    // Every verified-by entry that is not UNVERIFIED must point at a real file.
    for (const vb of block.matchAll(/verified-by:\s*([\s\S]*?)(?=\n\n|\n###|\n##|$)/g)) {
      for (let e of vb[1].split(',')) {
        e = e.trim();
        if (!e || e === 'UNVERIFIED') continue;
        const file = e.split('#')[0].trim();
        if (!fs.existsSync(path.join(ROOT, file)))
          err(`${cap}: ${id} verified-by points at missing file: ${file}`);
      }
    }
  }
  return { fm, stmt };
}

// ── pin: record that the code satisfies the spec file as it stands ───────────

if (process.argv[2] === 'pin') {
  const cap = process.argv[3];
  const c = caps[cap];
  if (!c || !c.spec) { console.error(`✗ pin: "${cap ?? '<capability>'}" is not a capability with a spec`); process.exit(2); }
  const h = blobHash(path.join(SPECS, c.spec));
  if (c.pinned === h) { console.log(`✓ ${cap}: already pinned at ${shortPin(h)}`); process.exit(0); }
  const regPath = path.join(SPECS, 'registry.yaml');
  const lines = fs.readFileSync(regPath, 'utf8').split('\n');
  const start = lines.findIndex((l) => new RegExp(`^\\s+${cap}: *$`).test(l));
  if (start === -1) { console.error(`✗ pin: cannot find "${cap}:" in registry.yaml`); process.exit(2); }
  const indent = lines[start].match(/^ */)[0].length;
  let done = false;
  for (let n = start + 1; n < lines.length; n++) {
    const l = lines[n];
    if (l.trim() && !/^\s*#/.test(l) && l.match(/^ */)[0].length <= indent) break;
    const m = l.match(/^(\s+pinned:) .*$/);
    if (m) { lines[n] = `${m[1]} ${h}`; done = true; break; }
  }
  if (!done) { console.error(`✗ pin: no pinned: line under "${cap}" — add one (\`pinned: none\`) first`); process.exit(2); }
  fs.writeFileSync(regPath, lines.join('\n'));
  console.log(`✓ ${cap}: pinned at ${shortPin(h)} (was ${shortPin(c.pinned)}) — run check before committing`);
  process.exit(0);
}

// ── owns: map changed files to owners ─────────────────────────────────────────

if (process.argv[2] === 'owns') {
  // Arguments may be cwd-relative (a shell in a subdir) or root-relative
  // (git diff --name-only) — normalise to root-relative, preferring whichever
  // actually exists on disk.
  const files = process.argv.slice(3).map((f) => {
    const fromCwd = path.relative(ROOT, path.resolve(process.cwd(), f));
    if (fs.existsSync(path.resolve(process.cwd(), f)) && !fromCwd.startsWith('..')) return fromCwd;
    return f.replaceAll('\\', '/');
  });
  if (!files.length) { console.error('usage: registry.mjs owns <file>...'); process.exit(2); }
  const touched = new Map(); // capability -> files
  let exit = 0;
  const ownersOf = (f) => {
    const owners = [];
    for (const [cap, c] of Object.entries(caps))
      for (const entry of c.paths ?? []) {
        const { file, symbol } = splitOwned(entry);
        if (file === f) owners.push(symbol ? `${cap} (only #${symbol})` : cap);
        else if (file.endsWith('/**') && f.startsWith(file.slice(0, -2))) owners.push(cap);
      }
    return owners;
  };
  for (const f of files) {
    let owners = ownersOf(f);
    // A test file belongs to whoever owns the source it tests — evidence moves
    // with its statement (extension may differ: simLoader.ts / simLoader.test.tsx).
    const t = f.match(/^(.*)\.test\.[jt]sx?$/);
    if (!owners.length && t) {
      for (const ext of ['.ts', '.tsx', '.js', '.cjs']) {
        const srcOwners = ownersOf(t[1] + ext);
        if (srcOwners.length) {
          owners = [...new Set(srcOwners.map((o) => o.split(' ')[0]))].map((o) => `${o} (tests ${t[1] + ext})`);
          break;
        }
      }
    }
    const seam = (reg.seams ?? []).find((sm) => sm.path === f);
    const label = owners.length ? [...new Set(owners)].join(', ')
      : seam ? `seam (${seam.what}) — no spec delta`
      : 'unowned';
    console.log(`${f}  →  ${label}`);
    for (const o of new Set(owners.map((x) => x.split(' ')[0]))) {
      const c = caps[o];
      if (c?.spec) (touched.get(o) ?? touched.set(o, []).get(o)).push(f);
    }
  }
  for (const [cap, fl] of touched) {
    const c = caps[cap];
    console.log(`\n${cap}: pinned ${shortPin(c.pinned)} — check the change against specs/${c.spec}`
      + (c._state !== 'in sync' ? ` (${c._state}: ${c.plan})` : ''));
    void fl;
  }
  process.exit(exit);
}

// ── main checks ───────────────────────────────────────────────────────────────

const derived = {}; // cap -> {verified, total, inv, unc}
for (const [cap, c] of Object.entries(caps)) {
  for (const p of c.paths ?? []) checkOwnedPath(cap, p, c);

  if (c.spec) {
    if (!c.prefix) err(`${cap}: spec without a statement prefix`);
    if ('version' in c)
      err(`${cap}: version: in the registry is obsolete — git holds the history; remove the line`);
    if (c.pinned == null) err(`${cap}: spec without a pin (use \`pinned: none\` for a target spec)`);
    else if (typeof c.pinned === 'number')
      err(`${cap}: integer pins are obsolete — pin to the spec file's content hash (node specs/registry.mjs pin ${cap})`);
    else if (c.pinned !== 'none' && !/^[0-9a-f]{40}$/.test(c.pinned))
      err(`${cap}: pinned is neither \`none\` nor a 40-hex content hash`);
    if (c._state && c._state !== 'in sync' && !c.plan)
      err(`${cap}: spec file does not match the pin (${c._state}) but no plan is named`);
    if (c.plan && !fs.existsSync(path.join(ROOT, c.plan)))
      err(`${cap}: plan file missing: ${c.plan}`);

    const parsed = parseSpec(cap, c);
    if (parsed) {
      const { fm, stmt } = parsed;
      let checked = 0;
      for (const inv of stmt.inv) {
        if (!inv.check) continue;
        checked += 1;
        try {
          execSync(inv.check, { cwd: ROOT, stdio: 'pipe', shell: '/bin/sh' });
        } catch {
          err(`${cap}: invariant ${inv.id} VIOLATED — checked-by failed: ${inv.check}`);
        }
      }
      derived[cap] = {
        verified: stmt.req.filter((r) => r.verified).length,
        total: stmt.req.length, inv: stmt.inv.length, checked, unc: stmt.unc.length,
      };
      // depends-on in the spec must appear as source:spec edges, and vice versa.
      const declared = new Set(fm['depends-on'] ?? []);
      const inYaml = new Set((reg.edges ?? []).filter((e) => e.from === cap && e.source === 'spec').map((e) => e.to));
      for (const d of declared) {
        if (!(d in caps)) err(`${cap}: depends-on unknown capability ${d}`);
        if (!inYaml.has(d)) err(`${cap}: depends-on ${d} not recorded as a spec edge in registry.yaml`);
      }
      for (const d of inYaml)
        if (!declared.has(d)) err(`${cap}: registry has spec edge to ${d} the spec does not declare`);
      for (const ex of fm.excludes ?? []) {
        const target = typeof ex === 'string' ? ex.split(':')[0] : Object.keys(ex)[0];
        if (!(target in caps)) err(`${cap}: excludes unknown capability ${target}`);
      }
    }
  } else {
    if (c.version != null || c.pinned != null)
      err(`${cap}: pin without a spec`);
  }
}
checkOwnershipDisjoint();

for (const e of reg.edges ?? []) {
  if (!(e.from in caps)) err(`edge from unknown capability ${e.from}`);
  if (!(e.to in caps)) err(`edge to unknown capability ${e.to}`);
  if (e.source === 'code' && caps[e.from]?.spec)
    err(`edge ${e.from} -> ${e.to} is source: code but ${e.from} has a spec — declare it there`);
}
for (const s of reg.seams ?? [])
  if (!fs.existsSync(path.join(ROOT, s.path))) err(`seam path missing: ${s.path}`);

// In the repo that develops the plugin, the substrate copies of FORMAT.md and
// this script are canonical — the specs/ copies must not drift from them.
const SUBSTRATE = path.join(ROOT, 'plugins', 'spec-system', 'substrate');
if (fs.existsSync(SUBSTRATE)) {
  for (const f of ['FORMAT.md']) {
    const a = path.join(SPECS, f), b = path.join(SUBSTRATE, f);
    if (fs.existsSync(a) && fs.existsSync(b) && fs.readFileSync(a, 'utf8') !== fs.readFileSync(b, 'utf8'))
      err(`${f} drifted between specs/ and plugins/spec-system/substrate/ — they must be identical`);
  }
}

// ── report / sync ─────────────────────────────────────────────────────────────

if (errors.length) {
  for (const m of errors) console.error(`✗ ${m}`);
  console.error(`\n${errors.length} problem(s).`);
  process.exit(1);
}

const counts = Object.entries(derived)
  .map(([cap, d]) => `${cap}: ${d.verified}/${d.total} verified, ${d.inv} invariants (${d.checked} checked, all hold), ${d.unc} uncertainties`
    + (caps[cap]._state !== 'in sync' ? ` — ${caps[cap]._state} (${caps[cap].plan})` : ''))
  .join('\n');
console.log(`✓ registry consistent\n${counts}`);

if (process.argv[2] === 'sync') {
  const cell = (c) =>
    c.spec
      ? [`[${c.spec}](${c.spec})`,
         c._state === 'in sync' ? `\`${shortPin(c.pinned)}\`` : `**${c._state}** → ${c.plan}`,
         `\`${c.status}\``, `${derived[cellCap].verified}/${derived[cellCap].total}`]
      : ['—', '—', `\`${c.status}\``, '—'];
  let cellCap;
  const rows = Object.entries(caps).map(([cap, c]) => {
    cellCap = cap;
    return `| \`${cap}\` | ${cell(c).join(' | ')} | ${(c.paths ?? []).map((p) => `\`${p}\``).join(', ')} |`;
  });
  const capTable = [
    '| capability | spec | pin | status | verified | owned paths |',
    '|---|---|---|---|---|---|', ...rows,
  ].join('\n');

  const edgeTable = [
    '| capability | depends-on | via | reason |', '|---|---|---|---|',
    ...(reg.edges ?? []).map((e) => `| \`${e.from}\` | \`${e.to}\` | ${e.source} | ${e.reason} |`),
  ].join('\n');

  const seamTable = [
    '| path | seam |', '|---|---|',
    ...(reg.seams ?? []).map((s) => `| \`${s.path}\` | ${s.what} |`),
  ].join('\n');

  const mdPath = path.join(SPECS, 'REGISTRY.md');
  let md = fs.readFileSync(mdPath, 'utf8');
  const put = (name, content) => {
    const re = new RegExp(`(<!-- generated:${name} -->)[\\s\\S]*?(<!-- /generated:${name} -->)`);
    if (!re.test(md)) { console.error(`✗ REGISTRY.md missing markers for ${name}`); process.exit(1); }
    md = md.replace(re, `$1\n${content}\n$2`);
  };
  put('capabilities', capTable);
  put('edges', edgeTable);
  put('seams', seamTable);
  fs.writeFileSync(mdPath, md);
  console.log('✓ REGISTRY.md tables regenerated');
}
