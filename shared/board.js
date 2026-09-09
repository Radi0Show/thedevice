


const VIEW_W = 640, VIEW_H = 480;
const PANE_X = 128, PANE_Y = 64;
const PANE_W = 384, PANE_H = 256;
const MS_PER_FRAME = 1000 / 30;

const WSPEED = 4;
const KRIS_SIZE = 32;


const BOUND_L = 128, BOUND_R = 480, BOUND_U = 64, BOUND_D = 288;


const SHIFT_H_SPEED = 24, SHIFT_V_SPEED = 16;

const FACE_DOWN = 0, FACE_RIGHT = 1, FACE_UP = 2, FACE_LEFT = 3;
const FACE_NAME = ['down', 'right', 'up', 'left'];

function loadImage(src) {
  return new Promise((res, rej) => {
    const i = new Image();
    i.onload = () => res(i);
    i.onerror = () => rej(new Error(`${src} missing`));
    i.src = src;
  });
}

export async function runBoard(canvas, base = 'assets/board/') {
  const ctx = canvas.getContext('2d');
  canvas.width = VIEW_W;
  canvas.height = VIEW_H;
  ctx.imageSmoothingEnabled = false;

  const room = await fetch(`${base}room.json`).then((r) => r.json());
  const [tileset, spotlight, ...krisFrames] = await Promise.all([
    loadImage(base + room.tileset.file),
    loadImage(`${base}spotlight.png`).catch(() => null),
    ...['down', 'right', 'up', 'left'].flatMap((d) =>
      [0, 1].map((f) => loadImage(`${base}kris_${d}_${f}.png`))),
  ]);
  const krisSprite = {
    down: [krisFrames[0], krisFrames[1]],
    right: [krisFrames[2], krisFrames[3]],
    up: [krisFrames[4], krisFrames[5]],
    left: [krisFrames[6], krisFrames[7]],
  };



  const moveX = PANE_X - room.roomStartingX;
  const moveY = PANE_Y - room.roomStartingY;

  const world = { x: moveX, y: moveY };
  const solids = room.solids.map((s) => ({ x: s.x + moveX, y: s.y + moveY, w: s.w, h: s.h }));
  const spot = room.spotlight
    ? { x: room.spotlight.x + moveX, y: room.spotlight.y + moveY } : null;

  const kris = {
    x: room.kris.x + moveX,
    y: room.kris.y + moveY,
    facing: FACE_DOWN,
    imageIndex: 0,
    walkbuffer: 0,
    canfreemove: true,
    nowx: 0, nowy: 0,
  };


  function meets(x, y) {
    for (const s of solids) {
      if (x < s.x + s.w && x + KRIS_SIZE > s.x && y < s.y + s.h && y + KRIS_SIZE > s.y) return true;
    }
    return false;
  }


  const held = new Set();
  const KEYMAP = {
    arrowup: 'u', arrowdown: 'd', arrowleft: 'l', arrowright: 'r',
    w: 'u', s: 'd', a: 'l', d: 'r',
  };
  const onKey = (e) => {
    const k = KEYMAP[e.key.toLowerCase()];
    if (!k) return;
    e.preventDefault();
    held.add(k);
  };
  const onKeyUp = (e) => {
    const k = KEYMAP[e.key.toLowerCase()];
    if (k) held.delete(k);
  };
  window.addEventListener('keydown', onKey);
  window.addEventListener('keyup', onKeyUp);


  let shift = 'none';
  let moving = 0;


  function translate(dx, dy) {
    world.x += dx; world.y += dy;
    for (const s of solids) { s.x += dx; s.y += dy; }
    if (spot) { spot.x += dx; spot.y += dy; }
    kris.x += dx; kris.y += dy;
  }

  function stepShift() {
    if (shift === 'none') return;
    const horizontal = shift === 'left' || shift === 'right';
    const speed = horizontal ? SHIFT_H_SPEED : SHIFT_V_SPEED;
    const total = horizontal ? PANE_W : PANE_H;
    const dx = shift === 'right' ? -speed : shift === 'left' ? speed : 0;
    const dy = shift === 'down' ? -speed : shift === 'up' ? speed : 0;
    translate(dx, dy);


    if (shift === 'right') kris.x += 2;
    if (shift === 'left') kris.x -= 2;
    if (shift === 'down') kris.y += 2;
    if (shift === 'up') kris.y -= 2;

    moving += speed;
    if (moving >= total) {

      kris.x = Math.round(kris.x);
      kris.y = Math.round(kris.y);
      shift = 'none';
      moving = 0;
      kris.canfreemove = true;
    }
  }



  function stepKris() {
    kris.nowx = kris.x;
    kris.nowy = kris.y;
    if (!kris.canfreemove) return;

    const pr = held.has('r') ? 1 : 0, pl = held.has('l') ? 1 : 0;
    const pd = held.has('d') ? 1 : 0, pu = held.has('u') ? 1 : 0;

    let px = 0, py = 0, pressdir = -1;
    if (pr) { px = WSPEED; pressdir = FACE_RIGHT; }
    if (pl) { px = -WSPEED; pressdir = FACE_LEFT; }
    if (pd) { py = WSPEED; pressdir = FACE_DOWN; }
    if (pu) { py = -WSPEED; pressdir = FACE_UP; }


    const f = kris.facing;
    if (f === FACE_UP) {
      if (pd) kris.facing = FACE_DOWN;
      if (!pu && pressdir !== -1) kris.facing = pressdir;
    } else if (f === FACE_DOWN) {
      if (pu) kris.facing = FACE_UP;
      if (!pd && pressdir !== -1) kris.facing = pressdir;
    } else if (f === FACE_LEFT) {
      if (pr) kris.facing = FACE_RIGHT;
      if (!pl && pressdir !== -1) kris.facing = pressdir;
    } else if (f === FACE_RIGHT) {
      if (pl) kris.facing = FACE_LEFT;
      if (!pr && pressdir !== -1) kris.facing = pressdir;
    }

    const x = kris.x, y = kris.y;


    if (px !== 0 && meets(x + px, y)) {
      for (let g = WSPEED; g > 0; g -= 1) {
        if (!pd && !meets(x + px, y - g)) { kris.y -= g; py = 0; break; }
        if (!pu && !meets(x + px, y + g)) { kris.y += g; py = 0; break; }
      }
      let bkx = 0;
      if (px > 0) {
        for (let i = px; i >= 0; i -= 1) if (!meets(x + i, kris.y)) { px = i; bkx = 1; break; }
      } else {
        for (let i = px; i <= 0; i += 1) if (!meets(x + i, kris.y)) { px = i; bkx = 1; break; }
      }
      if (!bkx) px = 0;
    }


    if (py !== 0 && meets(kris.x, y + py)) {
      for (let g = WSPEED; g > 0; g -= 1) {
        if (!pr && !meets(kris.x - g, y + py)) { kris.x -= g; px = 0; break; }
        if (!pl && !meets(kris.x + g, y + py)) { kris.x += g; px = 0; break; }
      }
      let bky = 0;
      if (py > 0) {
        for (let i = py; i >= 0; i -= 1) if (!meets(kris.x, y + i)) { py = i; bky = 1; break; }
      } else {
        for (let i = py; i <= 0; i += 1) if (!meets(kris.x, y + i)) { py = i; bky = 1; break; }
      }
      if (!bky) py = 0;
    }


    if (px !== 0 && py !== 0 && meets(kris.x + px, kris.y + py)) {
      let i = px, j = py, ok = 0;
      while (j !== 0 || i !== 0) {
        if (!meets(kris.x + i, kris.y + j)) { px = i; py = j; ok = 1; break; }
        if (Math.abs(j) >= 1) j += j > 0 ? -1 : 1; else j = 0;
        if (Math.abs(i) >= 1) i += i > 0 ? -1 : 1; else i = 0;
      }
      if (!ok) { px = 0; py = 0; }
    }

    kris.x += px;
    kris.y += py;


    if (kris.x > BOUND_R) {
      kris.x = BOUND_R;
      if (!meets(kris.x + 32, kris.y)) { kris.facing = FACE_RIGHT; kris.canfreemove = false; shift = 'right'; }
    }
    if (kris.x < BOUND_L) {
      kris.x = BOUND_L;
      if (!meets(kris.x - 32, kris.y)) { kris.facing = FACE_LEFT; kris.canfreemove = false; shift = 'left'; }
    }
    if (kris.y > BOUND_D) {
      kris.y = BOUND_D;
      if (!meets(kris.x, kris.y + 32)) { kris.canfreemove = false; shift = 'down'; }
    }
    if (kris.y < BOUND_U) {
      kris.y = BOUND_U;
      if (!meets(kris.x, kris.y - 32)) { kris.facing = FACE_UP; kris.canfreemove = false; shift = 'up'; }
    }
  }


  function stepAnim() {
    if (kris.x !== kris.nowx || kris.y !== kris.nowy) kris.walkbuffer = 6;
    if (kris.walkbuffer > 3) kris.imageIndex += 0.125;
    if (kris.walkbuffer <= 0) kris.imageIndex = 0;
    kris.walkbuffer -= 0.75;
  }


  const { tileW, tileH, cols, border } = room.tileset;

  function drawTiles() {

    const x0 = Math.floor((PANE_X - world.x) / tileW);
    const y0 = Math.floor((PANE_Y - world.y) / tileH);
    const x1 = Math.ceil((PANE_X + PANE_W - world.x) / tileW);
    const y1 = Math.ceil((PANE_Y + PANE_H - world.y) / tileH);
    for (let ty = Math.max(0, y0); ty < Math.min(room.tilesY, y1); ty++) {
      const row = room.grid[ty];
      if (!row) continue;
      for (let tx = Math.max(0, x0); tx < Math.min(room.tilesX, x1); tx++) {

        const id = row[tx] & 0x7ffff;
        if (!id) continue;
        const sx = (id % cols) * (tileW + border * 2) + border;
        const sy = Math.floor(id / cols) * (tileH + border * 2) + border;
        ctx.drawImage(tileset, sx, sy, tileW, tileH,
          world.x + tx * tileW, world.y + ty * tileH, tileW, tileH);
      }
    }
  }

  function draw() {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);

    ctx.save();
    ctx.beginPath();
    ctx.rect(PANE_X, PANE_Y, PANE_W, PANE_H);
    ctx.clip();

    ctx.fillStyle = room.bgColor;
    ctx.fillRect(PANE_X, PANE_Y, PANE_W, PANE_H);
    drawTiles();

    if (spot && spotlight) ctx.drawImage(spotlight, spot.x, spot.y);

    const frames = krisSprite[FACE_NAME[kris.facing]];
    const frame = frames[Math.floor(kris.imageIndex) % frames.length];
    ctx.drawImage(frame, Math.round(kris.x), Math.round(kris.y), KRIS_SIZE, KRIS_SIZE);

    ctx.restore();


    ctx.strokeStyle = '#2e2e2e';
    ctx.lineWidth = 2;
    ctx.strokeRect(PANE_X - 1, PANE_Y - 1, PANE_W + 2, PANE_H + 2);
  }


  let raf = 0, acc = 0, last = performance.now();
  function frame(now) {
    acc += now - last;
    last = now;

    if (acc > MS_PER_FRAME * 4) acc = MS_PER_FRAME;
    let guard = 0;
    while (acc >= MS_PER_FRAME && guard++ < 8) {
      acc -= MS_PER_FRAME;
      stepShift();
      stepKris();
      stepAnim();
    }
    draw();
    raf = requestAnimationFrame(frame);
  }
  raf = requestAnimationFrame(frame);


  window.__board = {
    get kris() { return kris; },
    get shift() { return shift; },
    get world() { return world; },
    solids,
    press: (k, on = true) => { if (on) held.add(k); else held.delete(k); },
    stop() { cancelAnimationFrame(raf); window.removeEventListener('keydown', onKey); window.removeEventListener('keyup', onKeyUp); },
  };
  return window.__board;
}
