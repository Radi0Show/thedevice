#!/usr/bin/env node
// DERIVE DEVICE_KAIZO's host page from the vendored kaizo entry page.
//
// tools/vendor-kaizo.sh runs this. It exists because the kaizo page's BODY is
// not ours: the sim reads the touch overlay and the pre-fight mode-select DOM
// out of it, and a hand-maintained copy would fall behind the first time
// upstream adds a node. So the body travels verbatim and only the head is
// ours.
//
// FOUR relative references move one directory up, because upstream's page sits
// in web/ and this one sits above it. They are listed explicitly rather than
// rewritten by pattern: a blanket regex over href/src would also catch the
// site-relative links this file adds, and a silent miss here is a page that
// loads a 404 instead of the game.
import { readFileSync, writeFileSync } from 'node:fs';

const [, , inPath, outPath] = process.argv;
if (!inPath || !outPath) {
  console.error('usage: host-kaizo.mjs <vendored web/kaizo.html> <out index.html>');
  process.exit(2);
}

let html = readFileSync(inPath, 'utf8');

const MOVES = [
  ['<link rel="manifest" href="manifest.webmanifest">', '<link rel="manifest" href="web/manifest.webmanifest">'],
  ['<link rel="apple-touch-icon" href="icon-180.png">', '<link rel="apple-touch-icon" href="web/icon-180.png">'],
  ['<link rel="icon" href="icon-192.png">', '<link rel="icon" href="web/icon-192.png">'],
  ['<script type="module" src="./kaizo.js"></script>', '<script type="module" src="./web/kaizo.js"></script>'],
];
for (const [from, to] of MOVES) {
  if (!html.includes(from)) {
    console.error(`host-kaizo: upstream no longer contains ${JSON.stringify(from)} — the page moved and this script must be updated rather than guessed at`);
    process.exit(1);
  }
  html = html.replace(from, to);
}

// This site's own metadata, in place of upstream's bare <title>. The og:image
// is the knight card: DEVICE_KAIZO has no art of its own yet, and pointing at
// a file that does not exist would render a broken card rather than none.
const HEAD = `<title>DEVICE_KAIZO</title>
<meta name="description" content="A browser recreation of EnderCat8's Kaizo Roaring Knight mod, built on the frame-accurate Roaring Knight sim. Free, non-commercial, keyboard-first. Not the real mod.">
<meta property="og:type" content="website">
<meta property="og:site_name" content="THE DEVICE">
<meta property="og:title" content="DEVICE_KAIZO">
<meta property="og:description" content="EnderCat8's Kaizo Roaring Knight, recreated in your browser.">
<meta property="og:url" content="https://shadowcrystal.dev/DEVICE_KAIZO/">
<meta property="og:image" content="https://shadowcrystal.dev/og/knight.png">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="DEVICE_KAIZO">
<meta name="twitter:description" content="EnderCat8's Kaizo Roaring Knight, recreated in your browser.">
<meta name="twitter:image" content="https://shadowcrystal.dev/og/knight.png">
<link rel="icon" href="../favicon.svg" type="image/svg+xml">`;

const TITLE = '<title>Kaizo Knight Simulator</title>';
if (!html.includes(TITLE)) {
  console.error('host-kaizo: upstream title not found — refusing to guess where the head metadata goes');
  process.exit(1);
}
html = html.replace(TITLE, HEAD);

writeFileSync(outPath, html);
console.log(`host-kaizo: derived ${outPath} from ${inPath}`);
