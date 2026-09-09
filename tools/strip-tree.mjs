#!/usr/bin/env node
// STRIP A VENDORED TREE IN PLACE — the post-copy pass the vendor scripts run.
//
// WHY THIS FILE, AND WHY IT IS NOT strip-comments.mjs
//
// `strip-comments.mjs` is the verified character scanner (27/27 adversarial tests
// in `test-strip-comments.mjs`). It is a LIBRARY: it turns one string into another
// and knows nothing about the filesystem. Do not add walking, I/O or CLI parsing to
// it — its test suite is what makes it trustworthy, and every line added to it is a
// line the suite does not cover. This file is the thin, disposable half: find files,
// call `stripByExt`, verify, write.
//
// THE SPLIT THIS ENFORCES. The upstream sims (`knight-sim/`, `eram-sim/`) are ~45%
// comments by line on purpose — GML citations, `ORIGINAL BUG:` markers, "tried and
// reverted" notes. Those are the most valuable thing in `sim/`, and they must never
// be deleted from source. They are also shipped verbatim to anyone who opens
// DevTools, where they are only noise. So: SOURCE KEEPS EVERY COMMENT, THE VENDORED
// COPY KEEPS NONE. This runs on the copy, after `mirror()`, never on a repo.
//
// Because the vendor scripts re-copy from source before calling this, the pass is
// idempotent by construction: strip(copy(source)) is the same bytes every run.
//
// SAFETY. A retained comment is cosmetic; a corrupted file is a broken site. So
// every rewrite is verified before it lands, and a file that fails verification is
// LEFT EXACTLY AS COPIED and reported — never written half-stripped. Any failure
// exits non-zero so the vendoring step fails loudly rather than shipping a break.
//
// Usage:  node tools/strip-tree.mjs <dir> [dir...]

import { readFileSync, writeFileSync, readdirSync, lstatSync, mkdtempSync, rmSync } from 'node:fs';
import { join, extname, resolve, relative, isAbsolute, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { stripByExt } from './strip-comments.mjs';

const EXTS = new Set(['.js', '.mjs', '.css', '.html', '.htm']);

// Never descend into these. `oracle/` holds captured ground-truth from the real
// game; it is data, and a `//` inside it is content, not a comment.
const SKIP_DIRS = new Set(['oracle', 'node_modules', '.git']);

// THE GUARD THAT MAKES THIS SAFE TO CALL.
//
// This pass DELETES COMMENTS, and the comments in the upstream sims are the most
// valuable thing in them. The invariant that keeps that safe is not "the caller
// passes the right path" -- it is that a stripped tree is always a VENDORED COPY.
// So: refuse any path outside the repo this script lives in. A mistyped argument,
// a stale `$SRC`, or a symlink pointing at `knight-sim/sim` then costs nothing.
const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..');
function assertInsideRepo(p) {
  const rel = relative(REPO, resolve(p));
  if (rel === '' || rel.startsWith('..') || isAbsolute(rel)) {
    console.error(`refusing to strip outside ${REPO}: ${p}`);
    console.error('this pass only ever runs on a vendored copy, never on a sim repo.');
    process.exit(2);
  }
}

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    // lstat, not stat: never follow a symlink: it could leave the vendored tree.
    const st = lstatSync(p);
    if (st.isSymbolicLink()) continue;
    if (st.isDirectory()) {
      if (SKIP_DIRS.has(name)) continue;
      walk(p, out);
    } else if (EXTS.has(extname(name).toLowerCase())) {
      out.push(p);
    }
  }
  return out;
}

// Syntax-check JS by handing it to node itself. The temp copy MUST be `.mjs`:
// `node --check` on a `.js` file assumes CommonJS and rejects `import`/`export`
// outright, which would fail every file in these trees.
const scratch = mkdtempSync(join(tmpdir(), 'strip-tree-'));
function jsParses(text) {
  const tmp = join(scratch, 'check.mjs');
  writeFileSync(tmp, text);
  const r = spawnSync(process.execPath, ['--check', tmp], { encoding: 'utf8' });
  return { ok: r.status === 0, err: (r.stderr || '').trim().split('\n').slice(0, 3).join('\n') };
}

// CSS and HTML have no `--check`, so verify the cheap structural invariants that a
// mis-scanned comment would break: a swallowed `{`, or a `<script>` eaten whole.
const count = (s, re) => (s.match(re) || []).length;
function structureHolds(before, after, ext) {
  if (ext === '.css') {
    if (count(before, /\{/g) !== count(after, /\{/g)) return 'brace count changed';
    if (count(before, /\}/g) !== count(after, /\}/g)) return 'brace count changed';
    return null;
  }
  for (const [label, re] of [
    ['<script', /<script/gi], ['</script', /<\/script/gi],
    ['<style', /<style/gi], ['</style', /<\/style/gi],
  ]) {
    if (count(before, re) !== count(after, re)) return `${label} count changed`;
  }
  return null;
}

const dirs = process.argv.slice(2);
if (dirs.length === 0) {
  console.error('usage: node tools/strip-tree.mjs <dir> [dir...]');
  process.exit(2);
}

let scanned = 0, rewritten = 0, saved = 0;
const failures = [];

for (const dir of dirs) assertInsideRepo(dir);

for (const dir of dirs) {
  for (const file of walk(dir)) {
    scanned++;
    const ext = extname(file).toLowerCase();
    const before = readFileSync(file, 'utf8');
    let after;
    try {
      after = stripByExt(before, ext);
    } catch (e) {
      failures.push(`${file}: stripper threw: ${e.message}`);
      continue;
    }
    if (after === before) continue;

    if (ext === '.js' || ext === '.mjs') {
      const { ok, err } = jsParses(after);
      if (!ok) { failures.push(`${file}: stripped output does not parse:\n${err}`); continue; }
    } else {
      const why = structureHolds(before, after, ext);
      if (why) { failures.push(`${file}: ${why}`); continue; }
    }

    writeFileSync(file, after);
    rewritten++;
    saved += Buffer.byteLength(before) - Buffer.byteLength(after);
  }
}

rmSync(scratch, { recursive: true, force: true });

for (const f of failures) console.error(`  !! ${f}`);
console.log(
  `  stripped: ${rewritten}/${scanned} files, ${(saved / 1024).toFixed(1)} KiB removed` +
  (failures.length ? `, ${failures.length} LEFT UNSTRIPPED (see above)` : '')
);
if (failures.length) process.exit(1);
