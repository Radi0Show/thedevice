// THE CRT — obj_ch5_LW20W_crt, running the chapter's own shader.
//
// Chapter 5's weird route ends on a television that puts the whole picture
// through `shader = 28` — shd_crt2. Its Create also builds a string:
//
//     _insert_text = stringsetloc("INSERT\nCHAPTER 7 SIDE B", ...)
//
// **AND NOTHING EVER DRAWS IT.** A grep of all 11,850 code entries in the
// chapter finds exactly one occurrence: that assignment. It is a write-only
// variable, the same shape as `splitbox`, `slice_delay` and `linex` in
// knight-sim's notes — content that exists as a string and never reaches a
// screen. So there is no font to copy and no position to match; this
// finishes the joke instead, in the font the rest of the site speaks in.
//
// THE EFFECT IS THE REAL SHADER, NOT A LIKENESS. An earlier version of this
// file split the colour channels by hand in 2D canvas and it read as flat,
// because shd_crt2 is a whole CRT: barrel warp, noise, interference, a
// rolling band that also drives the aberration, a Gaussian horizontal
// filter, Gaussian scanlines, an aperture grille, a brightness lift and a
// vignette. Reproducing that by approximation is a losing game, so the
// shader is extracted verbatim into assets/crt/shd_crt2.frag and run in
// WebGL against the same two uniforms the object feeds it.

import { loadFont, drawText, textWidth } from './gm-font.js';

const MS_PER_FRAME = 1000 / 30;

// The shader's own `resolution` const is 640x480 — the game's application
// surface — so the picture is composed at that size and the emulated pixel
// grid lands where the shader expects it.
const VIEW_W = 640, VIEW_H = 480;
// The content itself is laid out in 320x240 and drawn at 2, the way the
// dark world draws everything (scr_darksize).
const LAYOUT_SCALE = 2;

const VERT = `
attribute vec2 a_pos;
varying vec2 v_vTexcoord;
void main() {
  v_vTexcoord = vec2(a_pos.x, 1.0 - a_pos.y);
  gl_Position = vec4(a_pos * 2.0 - 1.0, 0.0, 1.0);
}`;

/** scr_wave, verbatim: a sine between `from` and `to` over `period` seconds. */
function scrWave(from, to, period, phase) {
  const half = (to - from) * 0.5;
  return from + half
    + Math.sin(((Date.now() * 0.001 + period * phase) / period) * (2 * Math.PI)) * half;
}

function compile(gl, type, src) {
  const sh = gl.createShader(type);
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    throw new Error('shader: ' + gl.getShaderInfoLog(sh));
  }
  return sh;
}

export async function runCrt(canvas, opts = {}) {
  canvas.width = VIEW_W;
  canvas.height = VIEW_H;

  const [font, fragSrc] = await Promise.all([
    loadFont(opts.fontBase ?? 'assets/gonermaker/'),
    fetch(opts.shader ?? 'assets/crt/shd_crt2.frag').then((r) => r.text()),
  ]);

  // The picture, composed in 2D and handed to the shader as a texture —
  // exactly what the object does with the application surface.
  const inner = document.createElement('canvas');
  inner.width = VIEW_W; inner.height = VIEW_H;
  const g = inner.getContext('2d');
  g.imageSmoothingEnabled = false;

  const gl = canvas.getContext('webgl', { antialias: false, premultipliedAlpha: false });
  if (!gl) throw new Error('no webgl');

  const prog = gl.createProgram();
  gl.attachShader(prog, compile(gl, gl.VERTEX_SHADER, VERT));
  gl.attachShader(prog, compile(gl, gl.FRAGMENT_SHADER, fragSrc));
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    throw new Error('link: ' + gl.getProgramInfoLog(prog));
  }
  gl.useProgram(prog);

  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0, 0, 1, 0, 0, 1, 1, 1]), gl.STATIC_DRAW);
  const aPos = gl.getAttribLocation(prog, 'a_pos');
  gl.enableVertexAttribArray(aPos);
  gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

  const uTime = gl.getUniformLocation(prog, 'TIME');
  const uAber = gl.getUniformLocation(prog, 'aberation_amount');
  const uTex = gl.getUniformLocation(prog, 'gm_BaseTexture');

  const tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, tex);
  // NEAREST: the shader does its own filtering, and the source is pixel art.
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
  gl.uniform1i(uTex, 0);

  /* ---------------- the screen's contents ---------------- */
  const questions = opts.questions ?? [];
  let row = 0;

  const state = {
    title: opts.title ?? ['INSERT', 'THE KNIGHT'],
    // obj_ch5_LW20W_crt Step: aberration 0.34, and time accumulates a wave.
    time: 0,
    aberration: 0.34,
    frame: 0,
  };

  // SCROLL MODE (opts.scroll = { text, frames?, speed? }): the cartridge
  // boot — one line of text tiled across the screen, every row drifting
  // left, alternate rows half-phase, stepped at the CRT's 30fps. The
  // drift rate and row spacing are approximated from the look of the
  // game's insert screens, not extracted values. It scrolls until Z;
  // pass `frames` only if a timed auto-advance is ever wanted again.
  const scroll = opts.scroll ?? null;
  let scrollDone = false;

  function step() {
    state.time += scrWave(0, 0.75, 4, 0);
    state.frame += 1;
    if (scroll && !scrollDone && scroll.frames && state.frame >= scroll.frames) {
      scrollDone = true;
      opts.onConfirm?.();
    }
  }

  function drawInner() {
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.fillStyle = '#000';
    g.fillRect(0, 0, VIEW_W, VIEW_H);
    g.setTransform(LAYOUT_SCALE, 0, 0, LAYOUT_SCALE, 0, 0);
    const W = VIEW_W / LAYOUT_SCALE;

    if (scroll) {
      const H = VIEW_H / LAYOUT_SCALE;
      const text = `${scroll.text}    `;
      const tw = textWidth(font, text);
      const speed = scroll.speed ?? 1.5;           // px per 30fps step
      const off = (state.frame * speed) % tw;
      const rowH = 28;
      for (let r = -1; r * rowH < H + rowH; r++) {
        const phase = r % 2 ? tw / 2 : 0;
        for (let x = -tw; x < W + tw; x += tw) {
          drawText(g, font, text, Math.round(x - off - phase), 18 + r * rowH,
            { color: '#8a8a8a' });
        }
      }
      return;
    }

    let y = 30;
    for (const line of state.title) {
      const w = textWidth(font, line);
      drawText(g, font, line, Math.round((W - w) / 2), y, { color: '#ffffff' });
      y += 22;
    }

    y = 108;
    questions.forEach((q, qi) => {
      const lw = textWidth(font, q.label);
      drawText(g, font, q.label, Math.round((W - lw) / 2), y,
        { color: qi === row ? '#ffffff' : '#5a5a5a' });

      const gap = 26;
      const total = q.options.reduce((a, o) => a + textWidth(font, o) + gap, -gap);
      let ox = Math.round((W - total) / 2);
      q.options.forEach((o, oi) => {
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
      drawText(g, font, opts.footer, Math.round((W - fw) / 2),
        VIEW_H / LAYOUT_SCALE - 24, { color: '#2e2e2e' });
    }
  }

  function present() {
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, inner);
    gl.uniform1f(uTime, state.time);
    gl.uniform1f(uAber, state.aberration);
    gl.viewport(0, 0, VIEW_W, VIEW_H);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  /* ---------------- input ---------------- */
  const confirmScroll = () => {
    if (!scrollDone) { scrollDone = true; opts.onConfirm?.(); }
  };
  const onPointer = () => { if (scroll) confirmScroll(); };
  window.addEventListener('pointerdown', onPointer);

  const onKey = (e) => {
    if (scroll) {
      // the scroller has two inputs, and they are the same input: get on
      // with it (Z/Enter, or a tap anywhere — the phone's whole screen is
      // the button)
      const sk = e.key.toLowerCase();
      if (sk === 'z' || sk === 'enter') {
        e.preventDefault();
        confirmScroll();
      }
      return;
    }
    if (!questions.length) return;
    const k = e.key.toLowerCase();
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
    // A hidden tab pauses rAF but time keeps passing - without this
    // clamp the backlog replays at 8x on return (the fast-forward
    // burst). Coming back resumes at normal speed, dropping the gap.
    if (acc > MS_PER_FRAME * 4) acc = MS_PER_FRAME;
    let guard = 0;
    while (acc >= MS_PER_FRAME && guard++ < 8) { acc -= MS_PER_FRAME; step(); }
    drawInner();
    present();
    raf = requestAnimationFrame(frame);
  }
  raf = requestAnimationFrame(frame);

  window.__crt = {
    get row() { return row; },
    get time() { return state.time; },
    questions,
    stop() { cancelAnimationFrame(raf); window.removeEventListener('keydown', onKey); window.removeEventListener('pointerdown', onPointer); },
  };
  return window.__crt;
}
