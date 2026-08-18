// THE UNREADABLE NAMES.
//
// The devices that do not exist yet are listed in a script you cannot read.
// That is the point: a slot that announces "JEVIL, COMING SOON" is a
// roadmap, and a roadmap is a promise about a date. A name in a language
// you can't read says the thing exists without saying when.
//
// WHY THIS IS HAND-DRAWN. Wingdings is a Microsoft font: it cannot be
// embedded, it is missing on most phones and every Linux box, and a missing
// symbol font falls back to plain legible letters — leaking the exact thing
// the cipher hides, on the machines least likely to have it. The game has no
// wingdings font of its own either (no fnt_ and no sprite by that name in
// chapters 1, 3 or 5), so there was nothing to extract.
//
// THE GRID IS 7x9, AND THE GLYPHS ARE WRITTEN AS PICTURES. An earlier set
// was 5x7 binary literals, and five columns is not enough room for a symbol
// to be a shape — everything came out as a thin rune and the whole list read
// as texture rather than writing. Seven by nine holds a filled circle, an
// arrow with a head on it, a ring with a hole. Drawing them as ASCII means
// you can see what you are editing, which is the only way this stays
// maintainable.
//
// The mapping is a fixed substitution — the same letter always gives the
// same symbol — so the shared DEVICE_ prefix reads as a shared prefix, the
// names are comparable, and anyone stubborn enough can decode them. That is
// the right amount of secret.

const ART = {
  A: `..###..
.#####.
#######
#######
#######
#######
#######
.#####.
..###..`,                       // disc
  B: `#######
#######
##...##
##...##
##...##
##...##
##...##
#######
#######`,                       // pierced block
  C: `...#...
.#.#.#.
..###..
.#####.
###.###
.#####.
..###..
.#.#.#.
...#...`,                       // spark
  D: `..###..
..###..
..###..
#######
#######
#######
..###..
..###..
..###..`,                       // cross
  E: `##...##
###.###
.#####.
..###..
..###..
..###..
.#####.
###.###
##...##`,                       // saltire
  F: `...#...
..###..
..###..
.#####.
.#####.
#######
#######
#######
.......`,                       // pylon
  G: `.......
#######
#######
#######
.#####.
.#####.
..###..
..###..
...#...`,                       // funnel
  H: `...#...
..###..
.#####.
#######
#######
#######
.#####.
..###..
...#...`,                       // rhombus
  I: `..###..
.#...#.
#.....#
#..#..#
#.###.#
#..#..#
#.....#
.#...#.
..###..`,                       // eye
  J: `...#...
..###..
.#####.
#######
..###..
..###..
..###..
..###..
..###..`,                       // rising
  K: `..###..
..###..
..###..
..###..
..###..
#######
.#####.
..###..
...#...`,                       // falling
  L: `.......
...#...
..##...
.#####.
#######
.#####.
..##...
...#...
.......`,                       // west
  M: `.......
...#...
...##..
.#####.
#######
.#####.
...##..
...#...
.......`,                       // east
  N: `#######
#######
.#####.
..###..
...#...
..###..
.#####.
#######
#######`,                       // glass
  O: `..###..
.#####.
###.###
##...##
##...##
##...##
###.###
.#####.
..###..`,                       // ring
  P: `###....
#####..
#######
#####..
###....
##.....
##.....
##.....
##.....`,                       // banner
  Q: `#######
#.....#
#.###.#
#.#.#.#
#.#.#.#
#.#.#.#
#.###.#
#.....#
#######`,                       // nested box
  R: `....###
...###.
..###..
.###...
#######
..###..
.###...
###....
##.....`,                       // bolt
  S: `.......
.##....
####.##
##.####
....##.
.......
.##....
####.##
##.####`,                       // double wave
  T: `##...##
##...##
##...##
##...##
.##.##.
.#####.
..###..
...#...
..###..`,                       // vessel
  U: `#######
#######
#######
#######
#######
#######
#######
#######
#######`,                       // solid
  V: `##...##
##...##
.##.##.
.##.##.
..###..
..###..
...#...
.......
.......`,                       // chevron down
  W: `.......
.......
...#...
..###..
..###..
.##.##.
.##.##.
##...##
##...##`,                       // chevron up
  X: `#..#..#
##.#.##
.#####.
..###..
#######
..###..
.#####.
##.#.##
#..#..#`,                       // asterisk
  Y: `##...##
.##.##.
..###..
...#...
...#...
...#...
...#...
...#...
...#...`,                       // fork
  Z: `#######
#######
....##.
...##..
..##...
.##....
##.....
#######
#######`,                       // switchback
  '_': `.......
.......
.......
.......
.......
.......
.......
#######
#######`,
  ' ': `.......
.......
.......
.......
.......
.......
.......
.......
.......`,
};

const COLS = 7, ROWS = 9;
/** fnt_8bit's cell is 16 wide; a 7-wide glyph at scale 2 leaves 2px of air. */
export const DEFAULT_ADVANCE = 16;
export const GLYPH_COLS = COLS, GLYPH_ROWS = ROWS;

/** Art -> rows of booleans, once. */
const GLYPHS = Object.fromEntries(Object.entries(ART).map(([k, art]) => [
  k, art.trim().split('\n').map((line) => {
    const row = [];
    for (let x = 0; x < COLS; x++) row.push(line[x] === '#');
    return row;
  }),
]));

/** Horizontal runs per row — fewer rects to draw, and fewer SVG nodes. */
function runs(rows) {
  const out = [];
  rows.forEach((row, y) => {
    let start = -1;
    for (let x = 0; x <= COLS; x++) {
      const on = x < COLS && row[x];
      if (on && start < 0) start = x;
      if (!on && start >= 0) { out.push([start, y, x - start]); start = -1; }
    }
  });
  return out;
}

const RUNS = Object.fromEntries(Object.entries(GLYPHS).map(([k, r]) => [k, runs(r)]));

export function wingdingsWidth(text, advance = DEFAULT_ADVANCE) {
  return [...String(text)].length * advance;
}

/** What a line of this occupies vertically, for centring against the font. */
export function wingdingsHeight(scale = 2) {
  return ROWS * scale;
}

/** Draw straight onto a canvas — the board is painted, not laid out in DOM. */
export function drawWingdings(ctx, text, x, y, { scale = 2, advance = DEFAULT_ADVANCE, color = '#ffffff' } = {}) {
  ctx.fillStyle = color;
  let pen = x;
  for (const ch of String(text).toUpperCase()) {
    for (const [rx, ry, len] of (RUNS[ch] ?? RUNS[' '])) {
      ctx.fillRect(pen + rx * scale, y + ry * scale, len * scale, scale);
    }
    pen += advance;
  }
  return pen - x;
}

/**
 * The SVG form, for pages that lay the names out in DOM.
 *
 * The real text goes in as a visually hidden span, so find-in-page, copy and
 * a screen reader all still get the actual name — the cipher is for the eye,
 * not a way of withholding the page from anyone who needs it read aloud.
 */
export function wingdings(text, scale = 3, label = null) {
  const chars = [...String(text).toUpperCase()];
  const advance = COLS + 1;
  const width = chars.length * advance - 1;
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', `0 0 ${width} ${ROWS}`);
  svg.setAttribute('width', width * scale);
  svg.setAttribute('height', ROWS * scale);
  svg.setAttribute('shape-rendering', 'crispEdges');
  svg.setAttribute('fill', 'currentColor');
  svg.setAttribute('aria-hidden', 'true');

  chars.forEach((ch, i) => {
    for (const [rx, ry, len] of (RUNS[ch] ?? RUNS[' '])) {
      const r = document.createElementNS(ns, 'rect');
      r.setAttribute('x', i * advance + rx);
      r.setAttribute('y', ry);
      r.setAttribute('width', len);
      r.setAttribute('height', 1);
      svg.append(r);
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
