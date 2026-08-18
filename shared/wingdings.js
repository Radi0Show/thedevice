// THE UNREADABLE NAMES.
//
// The devices that do not exist yet are listed in a script you cannot read.
// That is the point: an empty slot that announces "JEVIL, COMING SOON" is a
// roadmap, and a roadmap is a promise. A name in a language you can't read
// says something is there without saying when.
//
// WHY THIS IS HAND-DRAWN. Wingdings is a Microsoft font: it cannot be
// embedded, it is absent on most phones and every Linux box, and a missing
// symbol font falls back to plain legible letters — which would leak the
// exact thing the cipher is hiding. The game has no wingdings font of its
// own either (no fnt_ or sprite by that name in chapters 1, 3 or 5), so
// there is nothing to extract. These are drawn here: 5x7 cells to match the
// site's other pixel glyphs, one symbol per letter, rendered as SVG rects
// so they stay crisp at any scale and identical on every machine.
//
// The mapping is a fixed substitution — the same letter always gives the
// same symbol — so the names are consistent, comparable, and decodable by
// anyone who cares to sit down with them. That is the correct amount of
// secret.

const GLYPHS = {
  A: [0b00100, 0b00100, 0b01110, 0b01110, 0b11111, 0b11111, 0b00000], // ascending mark
  B: [0b11111, 0b10001, 0b10101, 0b10101, 0b10001, 0b11111, 0b00000], // boxed eye
  C: [0b01110, 0b11000, 0b11000, 0b11000, 0b11000, 0b01110, 0b00000], // half disc
  D: [0b00100, 0b00100, 0b11111, 0b11111, 0b00100, 0b00100, 0b00000], // cross
  E: [0b10001, 0b01010, 0b00100, 0b00100, 0b01010, 0b10001, 0b00000], // saltire
  F: [0b01110, 0b10001, 0b10101, 0b10101, 0b10001, 0b01110, 0b00000], // ringed dot
  G: [0b11111, 0b00000, 0b11111, 0b00000, 0b11111, 0b00000, 0b00000], // three bars
  H: [0b10101, 0b10101, 0b10101, 0b10101, 0b10101, 0b10101, 0b00000], // palisade
  I: [0b00100, 0b01110, 0b11111, 0b11111, 0b01110, 0b00100, 0b00000], // diamond
  J: [0b00100, 0b01110, 0b10101, 0b00100, 0b00100, 0b00100, 0b00000], // rising arrow
  K: [0b00100, 0b00100, 0b00100, 0b10101, 0b01110, 0b00100, 0b00000], // falling arrow
  L: [0b00100, 0b01100, 0b11111, 0b11111, 0b01100, 0b00100, 0b00000], // leftward
  M: [0b00100, 0b00110, 0b11111, 0b11111, 0b00110, 0b00100, 0b00000], // rightward
  N: [0b01110, 0b01110, 0b00000, 0b00000, 0b01110, 0b01110, 0b00000], // two weights
  O: [0b01110, 0b10001, 0b10001, 0b10001, 0b10001, 0b01110, 0b00000], // ring
  P: [0b11111, 0b00100, 0b00100, 0b00100, 0b00100, 0b11111, 0b00000], // pillar
  Q: [0b11111, 0b01110, 0b00100, 0b00100, 0b01110, 0b11111, 0b00000], // hourglass
  R: [0b10000, 0b11000, 0b01110, 0b00111, 0b00011, 0b00001, 0b00000], // fall line
  S: [0b01100, 0b10010, 0b00100, 0b01000, 0b10010, 0b01100, 0b00000], // wave
  T: [0b11111, 0b10001, 0b10001, 0b10001, 0b10001, 0b11111, 0b00000], // vessel
  U: [0b11111, 0b11111, 0b11111, 0b11111, 0b11111, 0b11111, 0b00000], // filled
  V: [0b10001, 0b10001, 0b01010, 0b01010, 0b00100, 0b00100, 0b00000], // chevron down
  W: [0b00100, 0b00100, 0b01010, 0b01010, 0b10001, 0b10001, 0b00000], // chevron up
  X: [0b10101, 0b01110, 0b11111, 0b11111, 0b01110, 0b10101, 0b00000], // star
  Y: [0b10001, 0b01010, 0b00100, 0b00100, 0b00100, 0b00100, 0b00000], // fork
  Z: [0b11111, 0b00010, 0b00100, 0b01000, 0b10000, 0b11111, 0b00000], // switchback
  '_': [0b00000, 0b00000, 0b00000, 0b00000, 0b00000, 0b00000, 0b11111],
  ' ': [0, 0, 0, 0, 0, 0, 0],
};

const COLS = 5, ROWS = 7, ADVANCE = 7;

/**
 * Render `text` as the unreadable script.
 *
 * The real text goes in as a visually hidden span, so find-in-page, copy
 * and a screen reader all still get the actual name — the cipher is for the
 * eye, not a way of withholding the page from anybody who needs it read
 * aloud.
 */
export function wingdings(text, scale = 3, label = null) {
  const chars = [...text.toUpperCase()];
  const width = chars.length * ADVANCE - 2;
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', `0 0 ${width} ${ROWS}`);
  svg.setAttribute('width', width * scale);
  svg.setAttribute('height', ROWS * scale);
  svg.setAttribute('shape-rendering', 'crispEdges');
  svg.setAttribute('fill', 'currentColor');
  svg.setAttribute('aria-hidden', 'true');

  chars.forEach((ch, i) => {
    const rows = GLYPHS[ch] ?? GLYPHS[' '];
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

  const wrap = document.createElement('span');
  const hidden = document.createElement('span');
  hidden.textContent = label ?? text;
  hidden.style.cssText =
    'position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%);white-space:nowrap';
  wrap.append(hidden, svg);
  return wrap;
}
