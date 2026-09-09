


import { loadFont, drawCharSpecial2, drawText, textWidth } from './gm-font.js';

const VIEW_W = 320, VIEW_H = 240;
const MS_PER_FRAME = 1000 / 30;

const DEFAULT_ASSETS = 'assets/gonermaker/';


const PAUSE = { 1: 5, 2: 10, 3: 15, 4: 20, 5: 30, 6: 40, 7: 60, 8: 90, 9: 150 };


const TYPER = { rate: 4, hspace: 12, vspace: 20 };

function loadImage(src) {
  return new Promise((res, rej) => {
    const i = new Image();
    i.onload = () => res(i);
    i.onerror = () => rej(new Error(`${src} missing`));
    i.src = src;
  });
}



export async function runIntro(canvas, io = {}) {

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



  const drone = new Audio(`${ASSETS}audio_drone.ogg`);
  drone.loop = true;
  drone.volume = 0.55;
  const appearance = new Audio(`${ASSETS}AUDIO_APPEARANCE.wav`);
  appearance.volume = 0.5;

  let soundOn = io.soundOn !== false;
  const startDrone = () => { if (soundOn) drone.play().catch(() => {}); };

  startDrone();

  window.__gmAudio = { drone, appearance, get soundOn() { return soundOn; } };
  const play = (a) => { if (soundOn) { a.currentTime = 0; a.play().catch(() => {}); } };


  const held = new Set();
  const pressed = new Set();
  const onKey = (e) => {
    const k = e.key.toLowerCase();
    if (['arrowleft', 'arrowright', 'arrowup', 'arrowdown', 'z', 'x', 'enter', ' '].includes(k)) {
      e.preventDefault();
    }
    if (!held.has(k)) pressed.add(k);
    held.add(k);
    startDrone();
  };
  const onKeyUp = (e) => { const k = e.key.toLowerCase(); held.delete(k); };
  window.addEventListener('keydown', onKey);
  window.addEventListener('keyup', onKeyUp);
  const takePressed = (...keys) => {
    for (const k of keys) if (pressed.has(k)) { pressed.clear(); return k; }
    return null;
  };

  let tap = null;
  const onPointer = (e) => {
    const r = canvas.getBoundingClientRect();
    tap = { x: ((e.clientX - r.left) / r.width) * VIEW_W, y: ((e.clientY - r.top) / r.height) * VIEW_H };
    startDrone();
  };
  canvas.addEventListener('pointerdown', onPointer);


  let siner = 0;
  let veil = 0.4;
  let fadeUp = 0;
  let obMade = false, obTimer = 0;
  const OBM = 0.5;
  const obacks = [];
  let writer = null;
  let choice = null;


  const soul = {
    on: false, t: -10, momentum: 0, m: 10, tmax: 10,
    x: 150, y: 120, homeY: 120, hsiner: 0,
  };

  const waiters = [];

  const waitFrames = (n) => new Promise((res) => waiters.push({ left: n, res }));
  const waitUntil = (pred) => new Promise((res) => waiters.push({ pred, res }));





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

    const fast = held.has('x');
    if (w.pause > 0) { w.pause -= fast ? 4 : 1; return; }
    w.timer -= 1;
    if (w.timer > 0) return;
    w.timer = fast ? 1 : TYPER.rate;
    const c = w.text[w.pos];
    if (c === undefined) { w.done = true; return; }
    if (c === '^') { w.pause += PAUSE[w.text[w.pos + 1]] ?? 0; w.pos += 2; return; }
    if (c === '\\') { w.pos += 3; return; }
    if (c === '%') { w.done = true; return; }
    w.pos += 1;
  }


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


  function ask(labels = ['YES', 'NO']) {
    choice = {
      labels,
      x: [110, 190], y: 180,
      cur: -1,
      resolve: null,
    };

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

      const near = Math.abs(tap.x - c.x[0]) < Math.abs(tap.x - c.x[1]) ? 0 : 1;
      if (tap.y > 150) { c.cur = near; commit(); }
      tap = null;
      return;
    }
    if ((k === 'z' || k === 'enter') && c.cur >= 0) commit();

    function commit() {
      const r = c.resolve;
      choice = null;
      r(c.cur === 0);
    }
  }

  function drawChoice() {
    const c = choice;
    if (!c) return;

    for (let i = 0; i < c.labels.length; i++) {
      drawText(ctx, font, c.labels[i], c.x[i], c.y,
        { color: c.cur === i ? '#ffff00' : '#ffffff' });
    }
  }



  function stepSoul() {
    if (!soul.on) return;
    if (soul.momentum > 0 && soul.t < soul.tmax + 2) soul.t += soul.momentum;
    if (soul.momentum < 0) soul.t += soul.momentum;
    soul.hsiner += 1;


    const idealX = choice && choice.cur >= 0 ? choice.x[choice.cur] - 25 : 150;
    const idealY = soul.homeY;

    soul.x = Math.abs(soul.x - idealX) <= 2 ? idealX : soul.x + (idealX - soul.x) * 0.3;
    soul.y = Math.abs(soul.y - idealY) <= 2 ? idealY : soul.y + (idealY - soul.y) * 0.3;
  }

  function drawSoul() {
    if (!soul.on) return;
    const { t, m } = soul;

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


  function step() {
    siner += 1;
    stepObacks();
    if (aborted) {

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

    ctx.globalAlpha = veil;
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    ctx.globalAlpha = 1;
    drawSoul();
    drawWriter();
    drawChoice();
  }


  let raf = 0, acc = 0, last = performance.now(), stopped = false;
  function frame(now) {
    if (stopped) return;
    acc += now - last;
    last = now;

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



  const answers = { photosensitive: false, soundOn: false, persist: true };

  try {

    await say(' ^9 ^8 %', 110, 80);
    if (aborted) throw new Error('skip');
    await say(' ARE YOU^6& THERE^6? ^6 %', 110, 80);
    await say('^6 ARE WE^6&CONNECTED^6? ^6 ^6 %', 110, 80);


    play(appearance);
    soul.on = true; soul.momentum = 0.5;
    await waitFrames(20);
    await waitFrames(90);


    await say('EXCELLENT^4. ^6 %', 110, 50);
    await say('^6  TRULY^4&EXCELLENT^4. ^6 %', 110, 50);
    await say('\\M2  NOW^4. ^7 %', 110, 50);
    await say('  WE MAY^5&  BEGIN^4. ^6 %', 110, 50);


    obMade = true;


    await say('FIRST^4. ^6 %', 75, 40);
    await say('^2 ARE YOU&PHOTOSENSITIVE? ^2 ', 75, 40);
    answers.photosensitive = await ask();
    writer = null;
    await say(answers.photosensitive
      ? 'UNDERSTOOD^3. ^5 %'
      : 'THEN LET THEM^3&FLICKER^3. ^5 %', 75, 40);


    await say('^2 DO YOU WANT&SOUND? ^2 ', 75, 40);
    answers.soundOn = await ask();
    writer = null;
    soundOn = answers.soundOn;
    io.onSound?.(soundOn);
    if (soundOn) startDrone();
    else drone.pause();
    await say(soundOn ? 'LISTEN CLOSELY^3. ^5 %' : 'VERY WELL^3.&SILENCE^3. ^5 %', 75, 40);


    await say('^2 WHEN YOU REACH&AN END, WILL&YOU PERSIST? ^2 ', 75, 40);
    answers.persist = await ask();
    writer = null;
    await say('.  .  . ^6 %', 75, 40);
    await say('IT DOES NOT^3&MATTER^3. ^4 &YOU WILL^3. ^6 %', 75, 40);


    await say('THANK YOU^5&FOR YOUR TIME^4. ^5 %', 75, 40);
    await say('YOUR ANSWERS^3 ^5 %', 75, 50);
    await say('  will now be&  recorded^6. ^5 %', 75, 50);
    await say('MOST OF THEM^3&WERE NOT NEEDED^3. ^6 %', 75, 40);
  } catch {

  }


  writer = null; choice = null;
  fadeUp = 0.05;
  await waitUntil(() => veil >= 1);
  if (soundOn) {

    const fade = setInterval(() => {
      drone.volume = Math.max(0, drone.volume - 0.05);
      if (drone.volume <= 0) { clearInterval(fade); drone.pause(); }
    }, 40);
  }
  teardown();
  return answers;
}
