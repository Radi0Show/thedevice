// PIXEL GLYPHS — the site's display face, hand-authored.
//
// No webfont: shipping a third-party pixel font means a license file and a
// binary this repo cannot read, and extracting the game's own font into the
// hub would put game assets outside the sim that ships them. 45 glyphs of
// 5x7 bitmap cover every header this site sets, they scale by integers only,
// and SVG rects in currentColor inherit the focus/selection color for free.
//
// The real text stays in the element (visually hidden), so screen readers,
// find-in-page and copy all see words, not rectangles. Without JS the text
// simply shows as monospace — a fallback, not a failure.

const GLYPHS = {
  A: [0b01110,0b10001,0b10001,0b11111,0b10001,0b10001,0b10001],
  B: [0b11110,0b10001,0b11110,0b10001,0b10001,0b10001,0b11110],
  C: [0b01110,0b10001,0b10000,0b10000,0b10000,0b10001,0b01110],
  D: [0b11100,0b10010,0b10001,0b10001,0b10001,0b10010,0b11100],
  E: [0b11111,0b10000,0b11110,0b10000,0b10000,0b10000,0b11111],
  F: [0b11111,0b10000,0b11110,0b10000,0b10000,0b10000,0b10000],
  G: [0b01110,0b10001,0b10000,0b10111,0b10001,0b10001,0b01111],
  H: [0b10001,0b10001,0b11111,0b10001,0b10001,0b10001,0b10001],
  I: [0b11111,0b00100,0b00100,0b00100,0b00100,0b00100,0b11111],
  J: [0b00111,0b00010,0b00010,0b00010,0b00010,0b10010,0b01100],
  K: [0b10001,0b10010,0b10100,0b11000,0b10100,0b10010,0b10001],
  L: [0b10000,0b10000,0b10000,0b10000,0b10000,0b10000,0b11111],
  M: [0b10001,0b11011,0b10101,0b10101,0b10001,0b10001,0b10001],
  N: [0b10001,0b11001,0b10101,0b10011,0b10001,0b10001,0b10001],
  O: [0b01110,0b10001,0b10001,0b10001,0b10001,0b10001,0b01110],
  P: [0b11110,0b10001,0b10001,0b11110,0b10000,0b10000,0b10000],
  Q: [0b01110,0b10001,0b10001,0b10001,0b10101,0b10010,0b01101],
  R: [0b11110,0b10001,0b10001,0b11110,0b10100,0b10010,0b10001],
  S: [0b01111,0b10000,0b10000,0b01110,0b00001,0b00001,0b11110],
  T: [0b11111,0b00100,0b00100,0b00100,0b00100,0b00100,0b00100],
  U: [0b10001,0b10001,0b10001,0b10001,0b10001,0b10001,0b01110],
  V: [0b10001,0b10001,0b10001,0b10001,0b10001,0b01010,0b00100],
  W: [0b10001,0b10001,0b10001,0b10101,0b10101,0b11011,0b10001],
  X: [0b10001,0b10001,0b01010,0b00100,0b01010,0b10001,0b10001],
  Y: [0b10001,0b10001,0b01010,0b00100,0b00100,0b00100,0b00100],
  Z: [0b11111,0b00001,0b00010,0b00100,0b01000,0b10000,0b11111],
  0: [0b01110,0b10001,0b10011,0b10101,0b11001,0b10001,0b01110],
  1: [0b00100,0b01100,0b00100,0b00100,0b00100,0b00100,0b01110],
  2: [0b01110,0b10001,0b00001,0b00010,0b00100,0b01000,0b11111],
  3: [0b11111,0b00010,0b00100,0b00010,0b00001,0b10001,0b01110],
  4: [0b00010,0b00110,0b01010,0b10010,0b11111,0b00010,0b00010],
  5: [0b11111,0b10000,0b11110,0b00001,0b00001,0b10001,0b01110],
  6: [0b00110,0b01000,0b10000,0b11110,0b10001,0b10001,0b01110],
  7: [0b11111,0b00001,0b00010,0b00100,0b01000,0b01000,0b01000],
  8: [0b01110,0b10001,0b10001,0b01110,0b10001,0b10001,0b01110],
  9: [0b01110,0b10001,0b10001,0b01111,0b00001,0b00010,0b01100],
  ' ': [0,0,0,0,0,0,0],
  '_': [0,0,0,0,0,0,0b11111],
  '-': [0,0,0,0b11111,0,0,0],
  '.': [0,0,0,0,0,0b01100,0b01100],
  ',': [0,0,0,0,0,0b00100,0b01000],
  ':': [0,0b01100,0b01100,0,0b01100,0b01100,0],
  '!': [0b00100,0b00100,0b00100,0b00100,0b00100,0,0b00100],
  '?': [0b01110,0b10001,0b00001,0b00010,0b00100,0,0b00100],
  "'": [0b00100,0b00100,0,0,0,0,0],
  '/': [0b00001,0b00001,0b00010,0b00100,0b01000,0b10000,0b10000],
  '[': [0b01110,0b01000,0b01000,0b01000,0b01000,0b01000,0b01110],
  ']': [0b01110,0b00010,0b00010,0b00010,0b00010,0b00010,0b01110],
  '(': [0b00010,0b00100,0b01000,0b01000,0b01000,0b00100,0b00010],
  ')': [0b01000,0b00100,0b00010,0b00010,0b00010,0b00100,0b01000],
  '&': [0b01100,0b10010,0b10100,0b01000,0b10101,0b10010,0b01101],
};

const COLS = 5, ROWS = 7, ADVANCE = 6; // one blank column between glyphs

/** Build one SVG for a line of text, horizontal runs merged per row. */
function render(text, scale) {
  const chars = [...text.toUpperCase()];
  const width = chars.length * ADVANCE - 1;
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', `0 0 ${width} ${ROWS}`);
  svg.setAttribute('width', width * scale);
  svg.setAttribute('height', ROWS * scale);
  svg.setAttribute('shape-rendering', 'crispEdges');
  svg.setAttribute('aria-hidden', 'true');
  // Inline, not a stylesheet rule: pages that host the sim carry their own
  // minimal styles, and a glyph must never be black-on-black there.
  svg.setAttribute('fill', 'currentColor');
  chars.forEach((ch, i) => {
    const rows = GLYPHS[ch] ?? GLYPHS['?'];
    const x0 = i * ADVANCE;
    for (let y = 0; y < ROWS; y++) {
      let run = -1;
      for (let x = 0; x <= COLS; x++) {
        const on = x < COLS && (rows[y] >> (COLS - 1 - x)) & 1;
        if (on && run < 0) run = x;
        if (!on && run >= 0) {
          const r = document.createElementNS(ns, 'rect');
          r.setAttribute('x', x0 + run);
          r.setAttribute('y', y);
          r.setAttribute('width', x - run);
          r.setAttribute('height', 1);
          svg.append(r);
          run = -1;
        }
      }
    }
  });
  return svg;
}

/** Swap every [data-pixel] element's text for glyphs, keeping the text. */
export function initPixelText(root = document) {
  for (const el of root.querySelectorAll('[data-pixel]')) {
    const text = el.textContent.trim();
    if (!text) continue;
    const scale = Number(el.dataset.scale || 3);
    const hidden = document.createElement('span');
    hidden.textContent = text;
    // Visually hidden, not display:none — assistive tech must still read it.
    hidden.style.cssText =
      'position:absolute;width:1px;height:1px;overflow:hidden;'
      + 'clip-path:inset(50%);white-space:nowrap';
    el.replaceChildren(hidden, render(text, scale));
  }
}
