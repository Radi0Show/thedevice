#!/usr/bin/env node
// Strip comments from THIS SITE'S OWN served files, in place, repeatably.
//
// WHY IN PLACE, AND WHY A DRIVER
//
// There is no build step here: the repo tree IS what Cloudflare Pages and GH
// Pages serve. So "the shipped copy keeps no comments" has to mean the working
// tree keeps no comments in the files a browser downloads. Git holds the
// history, so nothing is actually lost -- but that also means this is not a
// one-shot chore. Every future edit re-introduces comments into the served
// files, so the strip has to be a command you can re-run, not a thing an agent
// did once by hand. That is this file.
//
// WHAT IS IN SCOPE
//
// Only the hub's OWN hand-written pages and shared modules. Two categories are
// deliberately left fully commented:
//
//   1. The VENDORED sims (DEVICE_KNIGHT/{sim,render,input,web},
//      DEVICE_MANTLE/sim). CLAUDE.md forbids hand-editing a vendored copy at
//      all -- those trees are overwritten wholesale by tools/vendor-*.sh, so an
//      edit here is erased on the next re-vendor and, worse, makes the vendored
//      copy differ from upstream for no recorded reason. If they are to ship
//      stripped, the strip belongs in the vendor step, not here.
//      (DEVICE_KNIGHT/index.html is NOT vendored -- vendor-knight.sh copies only
//      web/ sim/ render/ input/ assets/, and that page is the hub's host page.
//      So it IS in scope.)
//
//   2. tools/. Build and extraction scripts are never sent to a browser, so the
//      only thing stripping them would accomplish is destroying the notes that
//      explain them -- including this file and strip-comments.mjs itself.
//
// SAFETY POSTURE
//
// Nothing is written until the stripped text has been checked independently of
// the stripper that produced it (a stripper cannot be its own witness):
//
//   .js/.mjs  -- `node --check` on a temp .mjs copy. The .mjs extension matters:
//                `node --check foo.js` parses as CommonJS and rejects `import`.
//                The ORIGINAL is checked too; a file that did not parse before
//                is skipped rather than rewritten, so this tool can never be
//                blamed for breakage it did not cause.
//   .html     -- the count of `<script` and `<div` opening tags must be
//                identical before and after, and every inline script body that
//                parsed before must still parse after.
//   .css      -- brace balance and total brace count must be unchanged.
//
// A file that fails any check is left EXACTLY as it was and reported as FAILED;
// the run continues so one bad file cannot hide the rest.
//
// Usage:
//   node tools/strip-site.mjs                 strip the repo in place
//   node tools/strip-site.mjs --dry-run       report what would change, write nothing
//   node tools/strip-site.mjs --root <dir>    operate on a different tree
//   node tools/strip-site.mjs --exclude <rel> skip an extra path (repeatable)
//   node tools/strip-site.mjs --json          machine-readable summary on stdout
//
// Exit code is 1 if any file failed verification, else 0.

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { stripByExt } from './strip-comments.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(HERE, '..');

// Only these are served as text a human can read in DevTools. Everything else
// (images, audio, fonts, .md, .json, .csv, .token) is left alone.
const EXTENSIONS = new Set(['.html', '.htm', '.css', '.js', '.mjs']);

// Path prefixes, repo-relative, POSIX separators. See "WHAT IS IN SCOPE" above.
const DEFAULT_EXCLUDES = [
  'tools',
  'DEVICE_KNIGHT/sim',
  'DEVICE_KNIGHT/render',
  'DEVICE_KNIGHT/input',
  'DEVICE_KNIGHT/web',
  'DEVICE_MANTLE/sim',
];

// Directory names skipped wherever they appear. `oracle/` holds captured
// ground-truth from the real game and is never source; the rest are obvious.
const EXCLUDED_DIR_NAMES = new Set(['.git', 'node_modules', 'oracle']);

function parseArgs(argv) {
  const opts = { root: REPO_ROOT, dryRun: false, json: false, excludes: [...DEFAULT_EXCLUDES] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--dry-run' || a === '-n') opts.dryRun = true;
    else if (a === '--json') opts.json = true;
    else if (a === '--root') opts.root = path.resolve(argv[++i]);
    else if (a.startsWith('--root=')) opts.root = path.resolve(a.slice(7));
    else if (a === '--exclude') opts.excludes.push(toPosix(argv[++i]));
    else if (a.startsWith('--exclude=')) opts.excludes.push(toPosix(a.slice(10)));
    else if (a === '--help' || a === '-h') { printHelp(); process.exit(0); }
    else { console.error(`strip-site: unknown argument ${a}`); process.exit(2); }
  }
  return opts;
}

function printHelp() {
  console.log(`strip-site.mjs -- remove comments from the site's own served files, in place

  --dry-run, -n      report what would change; write nothing
  --root <dir>       tree to walk (default: the repo this script lives in)
  --exclude <rel>    skip an extra repo-relative path (repeatable)
  --json             print a JSON summary after the human-readable report
  --help, -h         this text

Always excluded: ${DEFAULT_EXCLUDES.join(', ')}
and any directory named: ${[...EXCLUDED_DIR_NAMES].join(', ')}`);
}

const toPosix = (p) => p.split(path.sep).join('/').replace(/^\.\//, '').replace(/\/+$/, '');

function isExcluded(rel, excludes) {
  return excludes.some((ex) => rel === ex || rel.startsWith(ex + '/'));
}

function walk(root, excludes) {
  const found = [];
  const visit = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const abs = path.join(dir, entry.name);
      const rel = toPosix(path.relative(root, abs));
      if (entry.isDirectory()) {
        if (EXCLUDED_DIR_NAMES.has(entry.name)) continue;
        if (isExcluded(rel, excludes)) continue;
        visit(abs);
      } else if (entry.isFile()) {
        if (isExcluded(rel, excludes)) continue;
        if (EXTENSIONS.has(path.extname(entry.name).toLowerCase())) found.push({ abs, rel });
      }
    }
  };
  visit(root);
  return found.sort((a, b) => a.rel.localeCompare(b.rel));
}

// ---- independent verification ------------------------------------------

// One temp dir per run; `node --check` needs a real file, and the extension has
// to be .mjs so the parser uses module goal instead of CommonJS.
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'strip-site-'));
let tmpSeq = 0;

function parses(source) {
  const file = path.join(TMP, `check-${tmpSeq++}.mjs`);
  fs.writeFileSync(file, source, 'utf8');
  try {
    execFileSync(process.execPath, ['--check', file], { stdio: 'pipe' });
    return { ok: true, error: null };
  } catch (err) {
    const text = String(err.stderr || err.message || '').trim().split('\n').slice(0, 4).join(' | ');
    return { ok: false, error: text };
  } finally {
    try { fs.unlinkSync(file); } catch { /* best effort */ }
  }
}

const countTag = (html, tag) => (html.match(new RegExp(`<${tag}\\b`, 'gi')) || []).length;
const countChar = (text, ch) => {
  let n = 0;
  for (const c of text) if (c === ch) n++;
  return n;
};

// Inline script bodies, minus JSON payloads (which are data and never parsed as
// code) and minus external scripts (empty bodies).
function inlineScripts(html) {
  const bodies = [];
  const re = /<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    const attrs = m[1] || '';
    if (/\bsrc\s*=/i.test(attrs)) continue;
    if (/type\s*=\s*["']?(application\/json|application\/ld\+json)/i.test(attrs)) continue;
    if (m[2].trim() === '') continue;
    bodies.push(m[2]);
  }
  return bodies;
}

// Returns { ok, checks: [strings], error }. `checks` is what we can honestly
// claim was verified for this file, so the report says it rather than implying it.
function verify(ext, before, after) {
  const checks = [];
  if (ext === '.js' || ext === '.mjs') {
    const wasValid = parses(before);
    if (!wasValid.ok) return { ok: false, checks, error: `original did not parse; refusing to rewrite (${wasValid.error})` };
    const nowValid = parses(after);
    if (!nowValid.ok) return { ok: false, checks, error: `node --check failed after stripping: ${nowValid.error}` };
    return { ok: true, checks: ['node --check'], error: null };
  }

  if (ext === '.html' || ext === '.htm') {
    for (const tag of ['script', 'div']) {
      const b = countTag(before, tag);
      const a = countTag(after, tag);
      if (b !== a) return { ok: false, checks, error: `<${tag}> opening tags ${b} -> ${a}` };
      checks.push(`<${tag}> x${a}`);
    }
    const bodiesBefore = inlineScripts(before);
    const bodiesAfter = inlineScripts(after);
    if (bodiesBefore.length !== bodiesAfter.length) {
      return { ok: false, checks, error: `inline script count ${bodiesBefore.length} -> ${bodiesAfter.length}` };
    }
    let checkedBodies = 0;
    for (let i = 0; i < bodiesBefore.length; i++) {
      // Only hold the stripped body to a standard the original already met.
      if (!parses(bodiesBefore[i]).ok) continue;
      const nowValid = parses(bodiesAfter[i]);
      if (!nowValid.ok) return { ok: false, checks, error: `inline script #${i + 1} stopped parsing: ${nowValid.error}` };
      checkedBodies++;
    }
    if (checkedBodies) checks.push(`${checkedBodies} inline script${checkedBodies === 1 ? '' : 's'} parse`);
    return { ok: true, checks, error: null };
  }

  if (ext === '.css') {
    const bo = countChar(before, '{');
    const bc = countChar(before, '}');
    const ao = countChar(after, '{');
    const ac = countChar(after, '}');
    if (bo !== ao || bc !== ac) return { ok: false, checks, error: `braces {${bo}/${bc}} -> {${ao}/${ac}}` };
    if (ao !== ac) return { ok: false, checks, error: `unbalanced braces after stripping (${ao} open, ${ac} close)` };
    checks.push(`${ao} rule blocks, balanced`);
    return { ok: true, checks, error: null };
  }

  return { ok: true, checks: ['no check for this type'], error: null };
}

// ---- main ---------------------------------------------------------------

const opts = parseArgs(process.argv.slice(2));
const lines = (s) => (s === '' ? 0 : s.split('\n').length);

const files = walk(opts.root, opts.excludes);
const results = [];

for (const { abs, rel } of files) {
  const ext = path.extname(rel).toLowerCase();
  const before = fs.readFileSync(abs, 'utf8');
  const after = stripByExt(before, ext);
  const row = {
    file: rel,
    status: 'unchanged',
    linesBefore: lines(before),
    linesAfter: lines(after),
    linesRemoved: 0,
    bytesBefore: Buffer.byteLength(before),
    bytesAfter: Buffer.byteLength(before),
    checks: [],
    error: null,
  };

  if (after === before) {
    results.push(row);
    continue;
  }

  const v = verify(ext, before, after);
  row.checks = v.checks;
  row.linesRemoved = lines(before) - lines(after);
  row.bytesAfter = Buffer.byteLength(after);

  if (!v.ok) {
    row.status = 'FAILED';
    row.error = v.error;
    row.linesAfter = lines(before);
    row.bytesAfter = row.bytesBefore;
    row.linesRemoved = 0;
    results.push(row);
    continue;
  }

  if (opts.dryRun) {
    row.status = 'would strip';
  } else {
    fs.writeFileSync(abs, after, 'utf8');
    row.status = 'stripped';
  }
  results.push(row);
}

try { fs.rmSync(TMP, { recursive: true, force: true }); } catch { /* best effort */ }

const changed = results.filter((r) => r.status === 'stripped' || r.status === 'would strip');
const failed = results.filter((r) => r.status === 'FAILED');
const untouched = results.filter((r) => r.status === 'unchanged');

const pad = (s, n) => String(s).padEnd(n);
const width = Math.max(4, ...results.map((r) => r.file.length));

console.log(`strip-site: ${opts.dryRun ? 'DRY RUN, ' : ''}root ${opts.root}`);
console.log(`excluding: ${opts.excludes.join(', ')}\n`);

for (const r of changed) {
  const pct = r.bytesBefore ? Math.round((1 - r.bytesAfter / r.bytesBefore) * 100) : 0;
  console.log(
    `  ${pad(r.file, width)}  -${String(r.linesRemoved).padStart(4)} lines  ` +
    `${String(r.bytesBefore).padStart(6)} -> ${String(r.bytesAfter).padStart(6)} B (-${pct}%)  ` +
    `[${r.checks.join(', ')}]`
  );
}
for (const r of untouched) console.log(`  ${pad(r.file, width)}  (no comments)`);
for (const r of failed) console.log(`  ${pad(r.file, width)}  FAILED, left untouched: ${r.error}`);

const totalRemoved = changed.reduce((n, r) => n + r.linesRemoved, 0);
const totalBefore = changed.reduce((n, r) => n + r.bytesBefore, 0);
const totalAfter = changed.reduce((n, r) => n + r.bytesAfter, 0);

console.log(
  `\n${results.length} file(s) scanned, ${changed.length} ${opts.dryRun ? 'would change' : 'rewritten'}, ` +
  `${untouched.length} already clean, ${failed.length} failed. ` +
  `${totalRemoved} comment lines removed, ${totalBefore - totalAfter} bytes saved.`
);

if (opts.json) {
  console.log(JSON.stringify({
    root: opts.root,
    dryRun: opts.dryRun,
    scanned: results.length,
    changed: changed.length,
    unchanged: untouched.length,
    failed: failed.length,
    linesRemoved: totalRemoved,
    bytesSaved: totalBefore - totalAfter,
    files: results,
  }, null, 2));
}

process.exit(failed.length ? 1 : 0);
