// THE CRT — obj_ch5_LW20W_crt, and the cartridge it is asking for.
//
// Chapter 5's weird route ends on a television that puts the whole picture
// through a chromatic-aberration shader, wobbling. Its Create also builds a
// string:
//
//     _insert_text = stringsetloc("INSERT\nCHAPTER 7 SIDE B", ...)
//
// **AND NOTHING EVER DRAWS IT.** A grep of all 11,850 code entries in the
// chapter finds exactly one occurrence — that assignment. It is a
// write-only variable, the same shape as `splitbox`, `slice_delay` and
// `linex` in knight-sim's notes: cut content that survives as a string.
//
// So there is no font to copy and no position to match, because the game
// never puts it on screen. This screen finishes the joke instead: the
// television asks for the cartridge this site is actually about, in the
// font the rest of the site already speaks in.
//
// What IS copied is the effect, from the object's own numbers:
//
//   aberration = 0.34
//   spd  = scr_wave(0, 0.75, 4, 0)
//        = 0.375 + sin(((now/1000) / 4) * 2pi) * 0.375
//   time += spd            — every frame, and the shader waves on `time`
//
// scr_wave(a, b, period, phase) is a sine between a and b over `period`
// seconds; at phase 0 and period 4 that is a four-second breath.

import { loadFont, drawText, textWidth } from './gm-font.js';

const MS_PER_FRAME = 1000 / 30;

/** scr_wave, verbatim. */
function scrWave(from, to, period, phase) {
  const half = (to - from) * 0.5;
  return from + half
    + Math.sin(((Date.now() * 0.001 + period * phase) / period) * (2 * Math.PI)) * half;
}

export async function runCrt(canvas, opts = {}) {
  const W = canvas.width, H = canvas.height;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;

  const font = await loadFont(opts.fontBase ?? 'assets/gonermaker/');

  // The picture is composed here and then split into channels on the way
  // out, which is what the shader does to the application surface.
  const inner = document.createElement('canvas');
  inner.width = W; inner.height = H;
  const g = inner.getContext('2d');
  g.imageSmoothingEnabled = false;

  /* ---------------- the questions ----------------
     DEVICE_CHOICE's shape: options in a row, the selected one in c_yellow,
     nothing selected until you choose. The site's own settings, asked the
     way the vessel sequence asks things. */
  const questions = opts.questions ?? [];
  let row = 0;

  const state = {
    title: opts.title ?? ['INSERT', 'THE KNIGHT'],
    time: 0,
    aberration: 0.34,
  };

  function step() {
    state.time += scrWave(0, 0.75, 4, 0);
  }

  function drawInner() {
    g.fillStyle = '#000';
    g.fillRect(0, 0, W, H);

    // The cartridge prompt, centred, in the game's font.
    let y = 34;
    for (const line of state.title) {
      const w = textWidth(font, line);
      drawText(g, font, line, Math.round((W - w) / 2), y, { color: '#ffffff' });
      y += 22;
    }

    // The settings, one question a row.
    y = 104;
    questions.forEach((q, qi) => {
      const label = q.label;
      const lw = textWidth(font, label);
      drawText(g, font, label, Math.round((W - lw) / 2), y,
        { color: qi === row ? '#ffffff' : '#5a5a5a' });

      // Options laid out either side of centre, DEVICE_CHOICE style.
      const opts2 = q.options;
      const gap = 26;
      let total = opts2.reduce((a, o) => a + textWidth(font, o) + gap, -gap);
      let ox = Math.round((W - total) / 2);
      opts2.forEach((o, oi) => {
        const chosen = q.value === oi;
        const active = qi === row;
        drawText(g, font, o, ox, y + 20, {
          color: chosen ? (active ? '#ffff00' : '#b0b000') : (active ? '#ffffff' : '#5a5a5a'),
        });
        ox += textWidth(font, o) + gap;
      });
      y += 46;
    });

    if (opts.footer) {
      const fw = textWidth(font, opts.footer);
      drawText(g, font, opts.footer, Math.round((W - fw) / 2), H - 22, { color: '#2e2e2e' });
    }
  }

  /**
   * The aberration: the same picture three times, red pushed one way and
   * blue the other, by an offset that breathes on `time`. `lighter`
   * recombines them the way an additive channel split does.
   */
  /**
   * The aberration: the same picture three times, red pushed one way and
   * blue the other, by an offset that breathes on `time`. `lighter`
   * recombines them the way an additive channel split does.
   *
   * The three channel buffers are built ONCE. The first version made two
   * fresh canvases per channel per frame — ninety allocations a second to
   * draw the same three pictures.
   */
  const channels = ['#ff0000', '#00ff00', '#0000ff'].map((tint) => {
    const c = document.createElement('canvas');
    c.width = W; c.height = H;
    return { ctx: c.getContext('2d'), canvas: c, tint };
  });

  function present() {
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, W, H);

    const off = state.aberration * (1 + Math.sin(state.time / 6) * 1.6);
    const shift = [-off, 0, off];

    ctx.globalCompositeOperation = 'lighter';
    channels.forEach((ch, i) => {
      ch.ctx.globalCompositeOperation = 'source-over';
      ch.ctx.clearRect(0, 0, W, H);
      ch.ctx.drawImage(inner, 0, 0);
      ch.ctx.globalCompositeOperation = 'multiply';
      ch.ctx.fillStyle = ch.tint;
      ch.ctx.fillRect(0, 0, W, H);
      ctx.drawImage(ch.canvas, shift[i], 0);
    });
    ctx.globalCompositeOperation = 'source-over';

    // Scanlines, because it is a television.
    ctx.globalAlpha = 0.18;
    ctx.fillStyle = '#000';
    for (let y = 0; y < H; y += 3) ctx.fillRect(0, y, W, 1);
    ctx.globalAlpha = 1;
  }

  /* ---------------- input ---------------- */
  const onKey = (e) => {
    const k = e.key.toLowerCase();
    if (!questions.length) return;
    const q = questions[row];
    if (k === 'arrowdown' || k === 's') { e.preventDefault(); row = (row + 1) % questions.length; }
    else if (k === 'arrowup' || k === 'w') { e.preventDefault(); row = (row + questions.length - 1) % questions.length; }
    else if (k === 'arrowleft' || k === 'a') { e.preventDefault(); q.value = Math.max(0, (q.value ?? 0) - 1); q.onChange?.(q.value); }
    else if (k === 'arrowright' || k === 'd') { e.preventDefault(); q.value = Math.min(q.options.length - 1, (q.value ?? 0) + 1); q.onChange?.(q.value); }
    else if (k === 'z' || k === 'enter') { e.preventDefault(); opts.onConfirm?.(questions); }
  };
  window.addEventListener('keydown', onKey);

  let raf = 0, acc = 0, last = performance.now();
  function frame(now) {
    acc += now - last;
    last = now;
    let guard = 0;
    while (acc >= MS_PER_FRAME && guard++ < 8) { acc -= MS_PER_FRAME; step(); }
    drawInner();
    present();
    raf = requestAnimationFrame(frame);
  }
  raf = requestAnimationFrame(frame);

  return {
    get row() { return row; },
    questions,
    stop() { cancelAnimationFrame(raf); window.removeEventListener('keydown', onKey); },
  };
}
