// THE BOARD'S TEXT BOXES — obj_board_writer + typer 100, and the
// shopwriter's bare centered text.
//
// The box: black, 384x85, sliding in at movespeed 16 — from above to y 48
// or from below to y 218, the side picked by where Kris stands (y < 192
// puts the box at the bottom). snd_board_lift (vol .5, pitch 1.2) on open.
//
// The text: typer 100 — fnt_8bit, white, hspace 16, vspace 20, snd_text
// per character. Commands honoured from the game's strings:
//   \n        newline
//   ^n        pause (n tenths of the game's beat — n*10 frames here)
//   /         end of page: hold for Z (the blinking triangle)
//   %         close
//   \cX       colour: W white, I ice-blue (the ice door's key flash)
// The writer's `rate` stretches the per-character interval (the ice door
// uses 6). Exact obj_writer pacing internals are approximated; labelled.
//
// The shopwriter (obj_board_shopwriter): no box — centered text typed at 2
// frames a character at board row 2 (+12), snd_board_text_main per glyph
// and snd_board_text_main_end at the end.

const COLORS = { W: '#ffffff', I: '#5AAFFF', Y: '#ffff00' };

export function createWriter(font, S, snd) {
  let box = null;        // the active board_writer

  /** Open a text box. pages: array of raw strings with the game's codes. */
  function open(pages, opts = {}) {
    const side = opts.side ?? null;
    box = {
      pages: pages.map(parse),
      page: 0, char: 0, waitZ: false, pause: 0, done: false,
      y: 0, endy: 0, side, sliding: true,
      rate: opts.rate ?? 1, tick: 0,
      textsound: opts.textsound === null ? null : (opts.textsound ?? 'snd_text'),
      skippable: opts.skippable ?? true,
      triangle: opts.triangle ?? true,
      triSiner: 0,
      autoClose: opts.autoClose ?? 0,   // frames to hold at page end, then close
      onClose: opts.onClose ?? null,
    };
    return box;
  }

  /** Split a raw string into typed items: chars, pauses, colours, waits. */
  function parse(s) {
    const items = [];
    for (let i = 0; i < s.length; i++) {
      const c = s[i];
      if (c === '^' && /\d/.test(s[i + 1] ?? '')) { items.push({ pause: +s[i + 1] * 10 }); i += 1; continue; }
      if (c === '\\' && s[i + 1] === 'c') { items.push({ color: COLORS[s[i + 2]] ?? '#ffffff' }); i += 2; continue; }
      if (c === '/') { items.push({ wait: true }); continue; }
      if (c === '%') { items.push({ close: true }); continue; }
      items.push({ ch: c });
    }
    return wrap(items);
  }

  // Word-wrap to the box: 384 wide, 18px margins, hspace 16 -> 21 glyphs a
  // line. A space that would let the next word overflow becomes a newline.
  const LINE_MAX = 21;
  function wrap(items) {
    let col = 0, lastSpace = -1, colAtSpace = 0;
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      if (it.ch === undefined) continue;
      if (it.ch === '\n') { col = 0; lastSpace = -1; continue; }
      if (it.ch === ' ') { lastSpace = i; colAtSpace = col; }
      col += 1;
      if (col > LINE_MAX && lastSpace >= 0) {
        items[lastSpace] = { ch: '\n' };
        col -= colAtSpace + 1;
        lastSpace = -1;
      }
    }
    return items;
  }

  function step(kris, pressZ) {
    if (!box) return false;
    if (box.sliding) {
      if (box.side === null) box.side = kris.y < 192 ? 1 : 0;
      if (box.endy === 0) {
        box.endy = box.side === 1 ? 218 : 48;
        box.y = box.side === 1 ? 346 : -80;
        snd('snd_board_lift', { volume: 0.5, pitch: 1.2 });
      }
      box.y += box.side === 1 ? -16 : 16;
      if ((box.side === 1 && box.y <= box.endy) || (box.side === 0 && box.y >= box.endy)) {
        box.y = box.endy;
        box.sliding = false;
      }
      return true;
    }
    if (box.pause > 0) { box.pause -= 1; return true; }
    if (box.waitZ) {
      box.triSiner += 1;
      if (box.autoClose > 0 && box.triSiner >= box.autoClose && box.page >= box.pages.length - 1) {
        close();
        return false;
      }
      if (pressZ) {
        box.waitZ = false;
        box.page += 1;
        box.char = 0;
        if (box.page >= box.pages.length) { close(); }
      }
      return true;
    }
    const items = box.pages[box.page];
    if (!items) { close(); return false; }
    box.tick += 1;
    if (box.tick < box.rate) return true;
    box.tick = 0;
    while (box.char < items.length) {
      const it = items[box.char];
      box.char += 1;
      if (it.ch !== undefined) {
        if (it.ch !== ' ' && it.ch !== '\n' && box.textsound) snd(box.textsound, { volume: 0.6 });
        return true;                     // one glyph per rate-tick
      }
      if (it.pause) { box.pause = it.pause; return true; }
      if (it.color) continue;            // colours apply at draw time
      if (it.wait) { box.waitZ = true; box.triSiner = 0; return true; }
      if (it.close) { close(); return false; }
    }
    box.waitZ = true;                    // page ran out without '/': hold
    return true;
  }

  function close() {
    const cb = box && box.onClose;
    box = null;
    if (cb) cb();
  }

  function draw(g) {
    if (!box || box.page >= box.pages.length) return;
    g.fillStyle = '#000';
    g.fillRect(128, box.y + 16, 384, 85);
    if (box.sliding) return;
    const items = box.pages[box.page];
    let cx = 128 + 18, cy = box.y + 28, color = '#ffffff';
    for (let i = 0; i < box.char && i < items.length; i++) {
      const it = items[i];
      if (it.color) { color = it.color; continue; }
      if (it.ch === undefined) continue;
      if (it.ch === '\n') { cx = 128 + 18; cy += 20; continue; }
      g.save();
      // fnt_8bit glyphs are white; tint via canvas filter-free multiply.
      if (color !== '#ffffff') {
        g.globalCompositeOperation = 'source-over';
      }
      drawGlyph(g, it.ch, cx, cy, color);
      g.restore();
      cx += 16;                          // hspace 16 (typer 100)
    }
    if (box.waitZ && box.triangle && box.triSiner % 30 < 20) {
      const tri = S.frame('spr_custommenu_arrow_nooutline', 0);
      if (tri) g.drawImage(tri, 128 + 362 - 12, box.y + 90 - 8, 24, 16);
    }
  }

  // Coloured glyphs go through a small reusable buffer (the font's art is
  // white; source-in fills it with the colour).
  const glyphBuf = document.createElement('canvas');
  glyphBuf.width = 32; glyphBuf.height = 24;
  const glyphG = glyphBuf.getContext('2d');
  function drawGlyph(g, ch, x, y, color) {
    if (color === '#ffffff') { font.draw(g, ch, x, y); return; }
    glyphG.clearRect(0, 0, 32, 24);
    glyphG.globalCompositeOperation = 'source-over';
    font.draw(glyphG, ch, 0, 0);
    glyphG.globalCompositeOperation = 'source-in';
    glyphG.fillStyle = color;
    glyphG.fillRect(0, 0, 32, 24);
    g.drawImage(glyphBuf, x, y);
  }

  return {
    open, step, draw,
    get active() { return box !== null; },
  };
}

/** The shopwriter: bare centered typed text, no box. */
export function createShopwriter(font, snd) {
  let sw = null;

  function show(text, { color = '#ffffff', y = 64 + 64 + 12, sound = true } = {}) {
    sw = { text, shown: 0, timer: 0, color, y, sound, complete: false };
  }
  function clear() { sw = null; }

  function step() {
    if (!sw) return;
    sw.timer += 1;
    if (sw.timer % 2 === 0 && sw.shown <= sw.text.length + 20) {
      sw.shown += 1;
      const ch = sw.text[sw.shown - 1];
      if (sw.shown < sw.text.length) {
        if (ch !== ' ' && ch !== '#' && sw.sound) snd('snd_board_text_main', { volume: 0.7 });
      }
      if (sw.shown === sw.text.length) {
        sw.complete = true;
        if (sw.sound) snd('snd_board_text_main_end', { volume: 0.7 });
      }
    }
  }

  function draw(g) {
    if (!sw) return;
    const shown = sw.text.slice(0, sw.shown);
    const w = font.width(sw.text);
    if (sw.color === '#ffffff') {
      font.draw(g, shown, 320 - Math.round(w / 2) + 4, sw.y);
    } else {
      // black (the tease and "Having fun?") — tint through a buffer
      const buf = document.createElement('canvas');
      buf.width = 384; buf.height = 24;
      const bg = buf.getContext('2d');
      font.draw(bg, shown, 0, 0);
      bg.globalCompositeOperation = 'source-in';
      bg.fillStyle = sw.color;
      bg.fillRect(0, 0, 384, 24);
      g.drawImage(buf, 320 - Math.round(w / 2) + 4, sw.y);
    }
  }

  return { show, clear, step, draw, get active() { return sw !== null; }, get complete() { return sw ? sw.complete : false; } };
}
