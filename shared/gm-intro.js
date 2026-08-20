// THE INTERROGATION, rendered the way the game renders it.
//
// This is a recreation of DELTARUNE Chapter 1's vessel-creation opening —
// `DEVICE_CONTACT` and the objects it drives — down to the numbers. Nothing
// here is styled by eye; every constant below is cited to the object and
// event it came from, and docs/ALLUSIONS.md carries the wider ledger.
//
//   room             320x240, drawn at an integer scale (the game runs 2x)
//   font             fnt_main, via scr_84_get_font("main")
//   typer 666        scr_textsetup(font, c_white, x, y, 33, 0, 4,
//                                  snd_nosound, 12, 20, 2)
//                    → rate 4 frames/char · hspace 12 · vspace 20 · special 2
//                    → AND snd_nosound: THE TEXT TYPES IN SILENCE. The drone
//                      is the whole soundtrack of this scene.
//   clock            30 Hz fixed step (GEN8 game speed)
//   veil             DEVICE_CONTACT's Draw — a black rect at FADEFACTOR 0.4
//                    over the backgrounds, under the text
//   soul             DEVICE_APPEARANCE + IMAGE_SOUL_BLUR at (150,120)
//   background       DEVICE_OBACK_4 + IMAGE_DEPTH, spawned every 20/OBM
//                    frames, four mirrored copies around (160,120)
//   choices          DEVICE_CHOICE TYPE 0 — options at x 110 / 190, y 180,
//                    selected in c_yellow, heart cursor easing by 0.3,
//                    CURX = -1 so NEITHER starts selected
//
// The words are the site's own, but the opening beats are the sequence's
// real strings, in its own notation: `^N` pauses (1→5 2→10 3→15 4→20 5→30
// 6→40 7→60 8→90 9→150 frames), `&` breaks the line, `%` ends a message.

import { loadFont, drawCharSpecial2, drawText, textWidth } from './gm-font.js';

const VIEW_W = 320, VIEW_H = 240;
const MS_PER_FRAME = 1000 / 30;
// Where the sequence's assets live, RELATIVE TO THE PAGE. The host passes
// its own prefix, because this page has moved once already and a hardcoded
// path resolves against whatever directory the document happens to sit in.
const DEFAULT_ASSETS = 'assets/gonermaker/';

/** obj_writer's Alarm_0: `^N` adds this many frames to the next character. */
const PAUSE = { 1: 5, 2: 10, 3: 15, 4: 20, 5: 30, 6: 40, 7: 60, 8: 90, 9: 150 };

/** typer 666. `special` 2 is the glow; the sound is snd_nosound. */
const TYPER = { rate: 4, hspace: 12, vspace: 20 };

function loadImage(src) {
  return new Promise((res, rej) => {
    const i = new Image();
    i.onload = () => res(i);
    i.onerror = () => rej(new Error(`${src} missing`));
    i.src = src;
  });
}

/**
 * Run the sequence on `canvas`. Resolves with the answers once the screen
 * has faded out.
 *
 * @param {object} io  onSound(on) is called the moment sound is granted, so
 *                     the host can persist it; skipRequested() is polled.
 */
export async function runIntro(canvas, io = {}) {
  // Published before the first await so [ SKIP ] works during asset loading:
  // an abort clears whatever is on screen and drops straight to the fade.
  let aborted = false;
  io.abort = () => { aborted = true; };

  const ctx = canvas.getContext('2d');
  canvas.width = VIEW_W;
  canvas.height = VIEW_H;
  ctx.imageSmoothingEnabled = false;

  const ASSETS = io.base ?? DEFAULT_ASSETS;
  const [font, bgImage, soulImage] = await Promise.all([
    loadFont(ASSETS),
    loadImage(`${ASSETS}IMAGE_DEPTH.png`),
    loadImage(`${ASSETS}IMAGE_SOUL_BLUR.png`),
  ]);

  /* ---------------- audio ----------------
     The drone is `global.currentsong[0] = snd_init("AUDIO_DRONE.ogg");
     mus_loop(...)` in DEVICE_CONTACT's Create — it runs from frame one, and
     so does this one: sound is ON by default and the question turns it off.
     The only thing a browser adds is that playback cannot BEGIN without a
     gesture, so a cold visit stays quiet until the first key or tap and
     picks the drone up there. Nothing waits on an answer. */
  const drone = new Audio(`${ASSETS}audio_drone.ogg`);
  drone.loop = true;
  drone.volume = 0.55;
  const appearance = new Audio(`${ASSETS}AUDIO_APPEARANCE.wav`);
  appearance.volume = 0.5;
  // ON unless it has been turned off. Only an explicit `false` silences it.
  let soundOn = io.soundOn !== false;
  const startDrone = () => { if (soundOn) drone.play().catch(() => {}); };
  // Try immediately: a RECONFIGURE arrives on the back of a click, so the
  // page already has user activation and the drone can start on frame one
  // the way DEVICE_CONTACT's Create does. A cold visit is blocked until the
  // first key or tap, and the handlers below pick it up there.
  startDrone();
  // Exposed for debugging and for automated checks — whether the drone is
  // actually running is not observable from the DOM otherwise. Nothing in
  // here reads it back.
  window.__gmAudio = { drone, appearance, get soundOn() { return soundOn; } };
  const play = (a) => { if (soundOn) { a.currentTime = 0; a.play().catch(() => {}); } };

  /* ---------------- input ---------------- */
  const held = new Set();
  const pressed = new Set();
  const onKey = (e) => {
    const k = e.key.toLowerCase();
    if (['arrowleft', 'arrowright', 'arrowup', 'arrowdown', 'z', 'x', 'enter', ' '].includes(k)) {
      e.preventDefault();
    }
    if (!held.has(k)) pressed.add(k);
    held.add(k);
    startDrone(); // first gesture — see the audio note above
  };
  const onKeyUp = (e) => { const k = e.key.toLowerCase(); held.delete(k); };
  window.addEventListener('keydown', onKey);
  window.addEventListener('keyup', onKeyUp);
  const takePressed = (...keys) => {
    for (const k of keys) if (pressed.has(k)) { pressed.clear(); return k; }
    return null;
  };
  /* Pointer taps act as "advance", and a tap on a choice picks it. */
  let tap = null;
  const onPointer = (e) => {
    const r = canvas.getBoundingClientRect();
    tap = { x: ((e.clientX - r.left) / r.width) * VIEW_W, y: ((e.clientY - r.top) / r.height) * VIEW_H };
    startDrone();
  };
  canvas.addEventListener('pointerdown', onPointer);

  /* ---------------- scene state ---------------- */
  let siner = 0;                 // shared pulse; obj_writer increments per frame
  let veil = 0.4;                // DEVICE_CONTACT Create: FADEFACTOR = 0.4
  let fadeUp = 0;                // FADEUP — the ramp to a full-screen black
  let obMade = false, obTimer = 0;
  const OBM = 0.5;               // DEVICE_CONTACT Create: OBM = 0.5
  const obacks = [];
  let writer = null;
  let choice = null;
  /**
   * THE SOUL, and there is only ever one of it.
   *
   * The original does not do this: DEVICE_CONTACT closes the soul away
   * (`SOUL.t -= 2; SOUL.momentum = -0.5`) before the questions start, and
   * DEVICE_CHOICE then draws its OWN cursor already sitting at the option
   * row — two separate objects that never share the screen. Running the
   * site's questions inside the opening beat put both up at once, which is
   * a heart too many.
   *
   * So the soul descends and becomes the cursor: same sprite, carried down
   * on DEVICE_CHOICE's own easing (`HEARTDIFF = (IDEAL - HEART) * 0.3`,
   * snapping inside 2px) to the row DEVICE_CHOICE would have drawn it on.
   * `m` is sprite_height / 2.
   */
  const soul = {
    on: false, t: -10, momentum: 0, m: 10, tmax: 10,
    x: 150, y: 120, homeY: 120, hsiner: 0,
  };

  const waiters = [];
  // EVERY wait resolves on abort, or [ SKIP ] would hang on whichever one
  // happened to be pending — a 150-frame pause, or a question.
  const waitFrames = (n) => new Promise((res) => waiters.push({ left: n, res }));
  const waitUntil = (pred) => new Promise((res) => waiters.push({ pred, res }));

  /* ---------------- the writer ----------------
     obj_writer walks the string one character every `rate` frames; control
     codes are consumed without advancing the pen. */
  /**
   * Type a message and HOLD IT ON SCREEN.
   *
   * A finished obj_writer does not clear itself — DEVICE_CONTACT destroys it,
   * or the next message replaces it — which is the only reason a question can
   * still be readable while you are answering it. Resolving on "typing
   * finished" instead of "writer gone" is the difference between the choice
   * appearing under its question and appearing under nothing.
   */
  function say(text, x, y) {
    const w = {
      text, x, y, pos: 0, timer: TYPER.rate, pause: 0, done: false, specfade: 1,
    };
    writer = w;
    return waitUntil(() => w.done || writer !== w);
  }

  function stepWriter() {
    const w = writer;
    if (!w || w.done) return;
    // Holding X speeds the writer, exactly as DEVICE_CONTACT's own
    // `button2_h()` block does: the pause drains and the rate floors at 1.
    const fast = held.has('x');
    if (w.pause > 0) { w.pause -= fast ? 4 : 1; return; }
    w.timer -= 1;
    if (w.timer > 0) return;
    w.timer = fast ? 1 : TYPER.rate;
    const c = w.text[w.pos];
    if (c === undefined) { w.done = true; return; }
    if (c === '^') { w.pause += PAUSE[w.text[w.pos + 1]] ?? 0; w.pos += 2; return; }
    if (c === '\\') { w.pos += 3; return; }   // \M0 — a music cue, not text
    if (c === '%') { w.done = true; return; } // end of message
    w.pos += 1;
  }

  /** The Draw loop: lay the typed prefix out, `wx += hspace` per character. */
  function drawWriter() {
    const w = writer;
    if (!w) return;
    let wx = w.x, wy = w.y;
    for (let n = 0; n < w.pos; n++) {
      const ch = w.text[n];
      if (ch === '&') { wx = w.x; wy += TYPER.vspace; continue; }
      if (ch === '^') { n += 1; continue; }
      if (ch === '\\') { n += 2; continue; }
      if (ch === '%' || ch === '/') continue;
      if (ch !== ' ') drawCharSpecial2(ctx, font, ch, wx, wy, w.specfade, siner);
      wx += TYPER.hspace;
    }
  }

  /* ---------------- DEVICE_CHOICE, TYPE 0 ---------------- */
  function ask(labels = ['YES', 'NO']) {
    choice = {
      labels,
      x: [110, 190], y: 180,
      cur: -1,                     // CURX = -1: neither starts selected
      resolve: null,
    };
    // The soul comes down to the option row and stays there — it is the
    // cursor from here on.
    soul.homeY = 180;
    return new Promise((res) => { choice.resolve = res; });
  }

  function stepChoice() {
    const c = choice;
    if (!c) return;
    const k = takePressed('arrowleft', 'arrowright', 'z', 'enter');
    if (k === 'arrowleft') c.cur = 0;
    if (k === 'arrowright') c.cur = 1;
    if (tap) {
      // A tap picks the nearer option outright.
      const near = Math.abs(tap.x - c.x[0]) < Math.abs(tap.x - c.x[1]) ? 0 : 1;
      if (tap.y > 150) { c.cur = near; commit(); }
      tap = null;
      return;
    }
    if ((k === 'z' || k === 'enter') && c.cur >= 0) commit();

    function commit() {
      const r = c.resolve;
      choice = null;
      r(c.cur === 0); // YES = true
    }
  }

  function drawChoice() {
    const c = choice;
    if (!c) return;
    // No cursor is drawn here: the soul IS the cursor, and it draws itself.
    for (let i = 0; i < c.labels.length; i++) {
      drawText(ctx, font, c.labels[i], c.x[i], c.y,
        { color: c.cur === i ? '#ffff00' : '#ffffff' });
    }
  }

  /* ---------------- DEVICE_APPEARANCE ----------------
     The soul does not fade in; it opens. A one-pixel row of the sprite is
     stretched 800 tall into a vertical beam, the beam widens, then the
     middle band unrolls from the centre until the whole 20x20 is on screen. */
  function stepSoul() {
    if (!soul.on) return;
    if (soul.momentum > 0 && soul.t < soul.tmax + 2) soul.t += soul.momentum;
    if (soul.momentum < 0) soul.t += soul.momentum;
    soul.hsiner += 1;

    // Where it wants to be: the middle of the screen until the first
    // question, then the option row — and, once a side is chosen, beside it.
    const idealX = choice && choice.cur >= 0 ? choice.x[choice.cur] - 25 : 150;
    const idealY = soul.homeY;
    // DEVICE_CHOICE's easing, on both axes: 0.3 of the remaining distance a
    // frame, snapping once inside 2px so it settles instead of creeping.
    soul.x = Math.abs(soul.x - idealX) <= 2 ? idealX : soul.x + (idealX - soul.x) * 0.3;
    soul.y = Math.abs(soul.y - idealY) <= 2 ? idealY : soul.y + (idealY - soul.y) * 0.3;
  }

  function drawSoul() {
    if (!soul.on) return;
    const { t, m } = soul;
    // `SOUL.y = SOUL.ystart + sin(HSINER / 16) * 2` — DEVICE_CONTACT's own
    // bob, and only while the soul is still the thing in the middle. A
    // cursor sitting next to YES does not breathe.
    const bob = soul.homeY === 120 ? Math.sin(soul.hsiner / 16) * 2 : 0;
    const x = Math.round(soul.x), y = Math.round(soul.y + bob), w = 20;
    if (t <= 0) {
      const xs = Math.max(0, 1 + t / 10);
      ctx.drawImage(soulImage, 0, m, w, 1,
        Math.round(x - (w / 2) * xs + w / 2), y + m - 400, w * xs, 800);
    } else if (t < m) {
      ctx.drawImage(soulImage, 0, m - t, w, 1 + t * 2, x, y - t + m, w, 1 + t * 2);
      ctx.drawImage(soulImage, 0, Math.max(0, m - t - 1), w, 1, x, y - 400 - t + m, w, 400);
      ctx.drawImage(soulImage, 0, Math.min(19, m + t), w, 1, x, y + t + m, w, 400);
    } else {
      ctx.drawImage(soulImage, x, y);
    }
  }

  /* ---------------- DEVICE_OBACK_4 ---------------- */
  function spawnOback() {
    obacks.push({ siner: 0, alpha: 0.2, xs: 1, ys: 1, o: 0, b: -0.2, speed: 0.01 * OBM });
  }

  function stepObacks() {
    if (obMade) {
      obTimer += OBM;
      if (obTimer >= 20) { spawnOback(); obTimer = 0; }
    }
    for (let i = obacks.length - 1; i >= 0; i--) {
      const o = obacks[i];
      o.siner += 1;
      if (o.speed > 0) o.alpha = Math.sin(o.siner / 34) * 0.2;
      o.ys += o.speed; o.xs += o.speed;
      if (o.b < 0) o.b += 0.01;
      if (o.ys > 2) {
        o.o += 0.01;
        if (o.o >= 0.5) obacks.splice(i, 1);
      }
    }
  }

  function drawObacks() {
    // Newer instances get a HIGHER depth (5 + OB_DEPTH, and OB_DEPTH climbs
    // every frame), so they sit further back: draw newest first.
    for (let i = obacks.length - 1; i >= 0; i--) {
      const o = obacks[i];
      if (o.siner <= 2) continue;
      const a = Math.max(0, 0.2 + o.alpha - o.o + o.b);
      if (a <= 0) continue;
      ctx.globalAlpha = a;
      for (const [sx, sy] of [[1, 1], [-1, 1], [-1, -1], [1, -1]]) {
        ctx.save();
        ctx.translate(160, 120);
        ctx.scale(sx * (1 + o.xs), sy * (1 + o.ys));
        ctx.drawImage(bgImage, 0, 0);
        ctx.restore();
      }
    }
    ctx.globalAlpha = 1;
  }

  /* ---------------- one 30 Hz step ---------------- */
  function step() {
    siner += 1;
    stepObacks();
    if (aborted) {
      // Drop the text and the question on the floor; the fade is the only
      // thing left to run.
      writer = null;
      if (choice) { const c = choice; choice = null; c.resolve(false); }
      while (waiters.length) waiters.pop().res();
    } else {
      stepWriter();
      stepChoice();
    }
    stepSoul();
    if (fadeUp > 0 && veil < 1) veil = Math.min(1, veil + fadeUp);
    for (let i = waiters.length - 1; i >= 0; i--) {
      const w = waiters[i];
      if (w.pred) { if (w.pred()) { waiters.splice(i, 1); w.res(); } }
      else if (--w.left <= 0) { waiters.splice(i, 1); w.res(); }
    }
    tap = null;
  }

  function draw() {
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    drawObacks();
    // DEVICE_CONTACT's Draw: the veil sits over the backgrounds and under
    // the text, which is why the opening words are full white on black.
    ctx.globalAlpha = veil;
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    ctx.globalAlpha = 1;
    drawSoul();
    drawWriter();
    drawChoice();
  }

  /* ---------------- the clock ---------------- */
  let raf = 0, acc = 0, last = performance.now(), stopped = false;
  function frame(now) {
    if (stopped) return;
    acc += now - last;
    last = now;
    // A hidden tab pauses rAF but time keeps passing - without this
    // clamp the backlog replays at 8x on return (the fast-forward
    // burst). Coming back resumes at normal speed, dropping the gap.
    if (acc > MS_PER_FRAME * 4) acc = MS_PER_FRAME;
    let guard = 0;
    while (acc >= MS_PER_FRAME && guard++ < 8) { acc -= MS_PER_FRAME; step(); }
    draw();
    raf = requestAnimationFrame(frame);
  }
  raf = requestAnimationFrame(frame);

  const teardown = () => {
    stopped = true;
    cancelAnimationFrame(raf);
    window.removeEventListener('keydown', onKey);
    window.removeEventListener('keyup', onKeyUp);
    canvas.removeEventListener('pointerdown', onPointer);
    drone.pause();
  };

  /* =====================================================================
     THE SCRIPT.

     Beats and coordinates from DEVICE_CONTACT's Step; the opening lines are
     the sequence's own strings, verbatim, in its own notation.
     ===================================================================== */
  const answers = { photosensitive: false, soundOn: false, persist: true };

  try {
    // EVENT 0 — writer at (110,80). ' ^9 ^8 %' is 240 frames of nothing:
    // the silence the sequence opens on, before it asks anything.
    await say(' ^9 ^8 %', 110, 80);
    if (aborted) throw new Error('skip');
    await say(' ARE YOU^6& THERE^6? ^6 %', 110, 80);
    await say('^6 ARE WE^6&CONNECTED^6? ^6 ^6 %', 110, 80);

    // EVENT 1 — snd_play(AUDIO_APPEARANCE); the soul opens at (150,120).
    play(appearance);
    soul.on = true; soul.momentum = 0.5;
    await waitFrames(20);
    await waitFrames(90);

    // EVENT 5 — the writer moves up to (110,50).
    await say('EXCELLENT^4. ^6 %', 110, 50);
    await say('^6  TRULY^4&EXCELLENT^4. ^6 %', 110, 50);
    await say('\\M2  NOW^4. ^7 %', 110, 50);
    await say('  WE MAY^5&  BEGIN^4. ^6 %', 110, 50);

    // The backgrounds arrive with the questions, as they do in the game
    // (OBMADE flips at the same seam the drone hands over).
    obMade = true;

    // Q1 — the sequence's own first question, asked before anything moves.
    await say('FIRST^4. ^6 %', 75, 40);
    await say('^2 ARE YOU&PHOTOSENSITIVE? ^2 ', 75, 40);
    answers.photosensitive = await ask();
    writer = null;
    await say(answers.photosensitive
      ? 'UNDERSTOOD^3. ^5 %'
      : 'THEN LET THEM^3&FLICKER^3. ^5 %', 75, 40);

    // Q2 — sound. It is already playing; this is the switch that stops it.
    await say('^2 DO YOU WANT&SOUND? ^2 ', 75, 40);
    answers.soundOn = await ask();
    writer = null;
    soundOn = answers.soundOn;
    io.onSound?.(soundOn);
    if (soundOn) startDrone();
    else drone.pause();
    await say(soundOn ? 'LISTEN CLOSELY^3. ^5 %' : 'VERY WELL^3.&SILENCE^3. ^5 %', 75, 40);

    // Q3 — the pointless one. DEVICE_FAILURE's own question.
    await say('^2 WHEN YOU REACH&AN END, WILL&YOU PERSIST? ^2 ', 75, 40);
    answers.persist = await ask();
    writer = null;
    await say('.  .  . ^6 %', 75, 40);
    await say('IT DOES NOT^3&MATTER^3. ^4 &YOU WILL^3. ^6 %', 75, 40);

    // The close, and the drop out of capitals — the sequence's own trick.
    await say('THANK YOU^5&FOR YOUR TIME^4. ^5 %', 75, 40);
    await say('YOUR ANSWERS^3 ^5 %', 75, 50);
    await say('  will now be&  recorded^6. ^5 %', 75, 50);
    await say('MOST OF THEM^3&WERE NOT NEEDED^3. ^6 %', 75, 40);
  } catch {
    /* skipped — fall through to the fade */
  }

  // FADEUP: the veil ramps to a full black and the scene hands over.
  writer = null; choice = null;
  fadeUp = 0.05;
  await waitUntil(() => veil >= 1);
  if (soundOn) {
    // mus_volume(currentsong, 0, 2) — the drone goes out with the picture.
    const fade = setInterval(() => {
      drone.volume = Math.max(0, drone.volume - 0.05);
      if (drone.volume <= 0) { clearInterval(fade); drone.pause(); }
    }, 40);
  }
  teardown();
  return answers;
}
