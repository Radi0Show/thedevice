// THE BOARD — room_board_preshadowmantle, and the way it moves.
//
// This is DELTARUNE Chapter 3's board game: the stage Kris plays for a rank
// (Z / C / B / A / S / T — `scr_get_rank_letter`). Every number below is
// read out of the room and the objects that run it, not tuned by eye:
//
//   obj_mainchara_board   Kris — 8-directional at wspeed 4, 16x16 at scale 2
//   obj_board_camera      the screen — 384x256, fixed at (128,64)
//   obj_board_solid       the walls — 32x32 cells scaled per instance
//   room_board_preshadowmantle   2460x960, a 77x30 grid of 32px tiles
//
// THE TRICK THIS ROOM IS BUILT ON, and the thing worth understanding before
// changing anything here: THE CAMERA NEVER MOVES. The screen is a fixed
// 384x256 window and Kris is clamped inside it (x 128..480, y 64..288 —
// 384-32 and 256-32, because Kris is 32 wide). When he walks off an edge,
// obj_board_camera does not pan: it translates THE ENTIRE WORLD — the tile
// layers via `layer_x`/`layer_y`, and every obj_board_parent instance,
// Kris included — one whole screen over, 24px a frame horizontally and 16
// vertically. Sixteen frames either way. So "everything in the room moves
// with the screen" is literally what the code does, and this engine keeps
// one world offset and moves everything through it the same way.

const VIEW_W = 640, VIEW_H = 480;      // the game window
const PANE_X = 128, PANE_Y = 64;       // where the board's screen sits in it
const PANE_W = 384, PANE_H = 256;      // obj_board_camera's gamescreenWidth/Height
const MS_PER_FRAME = 1000 / 30;        // GEN8 game speed

const WSPEED = 4;                      // obj_mainchara_board Create
const KRIS_SIZE = 32;                  // 16x16 sprite at the instance's scale 2

// obj_mainchara_board Step, lines 1-4. The pane inset by Kris's own size.
const BOUND_L = 128, BOUND_R = 480, BOUND_U = 64, BOUND_D = 288;

// obj_board_camera Step: horizontal shifts run at 24, vertical at 16 — both
// land on exactly 16 frames for their axis.
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

  /* ---------------- the world ----------------
     obj_board_camera's Create:
         moveX = 128 - roomStartingX - originX
         moveY = 64  - roomStartingY - originY
     and then it moves the layers AND every board instance by that. The
     layers start at 0,0 here, so this room opens shifted (0, -256) — which
     is what puts Kris's starting cell inside the screen. */
  const moveX = PANE_X - room.roomStartingX;
  const moveY = PANE_Y - room.roomStartingY;

  const world = { x: moveX, y: moveY };   // the tile layer's origin
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

  /** `place_meeting(x, y, obj_board_solid)` — Kris's 32x32 box against them. */
  function meets(x, y) {
    for (const s of solids) {
      if (x < s.x + s.w && x + KRIS_SIZE > s.x && y < s.y + s.h && y + KRIS_SIZE > s.y) return true;
    }
    return false;
  }

  /* ---------------- input ---------------- */
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

  /* ---------------- the shift ---------------- */
  let shift = 'none';
  let moving = 0;

  /** Translate EVERYTHING — the world origin, the walls, Kris. */
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

    // AND THEN KRIS GETS TWO PIXELS BACK, every frame, against the drift.
    //
    // This is the line that makes the transition work, and it is easy to
    // miss: obj_board_camera moves every board instance by the full
    // movespeed and then nudges KRIS ALONE by 2 the other way. Over the 16
    // frames of a horizontal shift he travels 352 instead of 384 — from one
    // bound to exactly the other (480 - 352 = 128), so he walks in at the
    // edge of the new screen. Without it he overshoots past the opposite
    // bound, trips the edge test again, and the screen shifts back and
    // forth forever.
    if (shift === 'right') kris.x += 2;
    if (shift === 'left') kris.x -= 2;
    if (shift === 'down') kris.y += 2;
    if (shift === 'up') kris.y -= 2;

    moving += speed;
    if (moving >= total) {
      // con 99: the world settles on whole pixels and control comes back.
      kris.x = Math.round(kris.x);
      kris.y = Math.round(kris.y);
      shift = 'none';
      moving = 0;
      kris.canfreemove = true;
    }
  }

  /* ---------------- Kris ----------------
     obj_mainchara_board's Step: read the four keys, set facing by the rules
     that make a held direction win over the one you just released, then
     resolve movement one axis at a time with a corner slip. */
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

    // The facing rules, verbatim: while facing one way, the opposite key
    // takes over immediately, and letting go of the current one hands
    // facing to whatever is still held.
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

    // X AXIS. Blocked? First try to slip up or down by g — this is what
    // lets you round a corner without catching on it — then walk px back
    // toward zero until it fits.
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

    // Y AXIS, the same shape.
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

    // DIAGONAL: walk both components down together until the pair fits.
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

    // THE EDGE. Clamp to the screen, and hand over to the camera only if
    // there is somewhere to arrive: a solid one cell beyond the boundary
    // means this edge is a wall, not a way out.
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

  /** The walk cycle: two frames, and only ACTUAL movement drives it. */
  function stepAnim() {
    if (kris.x !== kris.nowx || kris.y !== kris.nowy) kris.walkbuffer = 6;
    if (kris.walkbuffer > 3) kris.imageIndex += 0.125;
    if (kris.walkbuffer <= 0) kris.imageIndex = 0;
    kris.walkbuffer -= 0.75;
  }

  /* ---------------- drawing ---------------- */
  const { tileW, tileH, cols, border } = room.tileset;

  function drawTiles() {
    // Only the cells the screen can see — the grid is 77x30 and all but a
    // pane of it is off-screen at any moment.
    const x0 = Math.floor((PANE_X - world.x) / tileW);
    const y0 = Math.floor((PANE_Y - world.y) / tileH);
    const x1 = Math.ceil((PANE_X + PANE_W - world.x) / tileW);
    const y1 = Math.ceil((PANE_Y + PANE_H - world.y) / tileH);
    for (let ty = Math.max(0, y0); ty < Math.min(room.tilesY, y1); ty++) {
      const row = room.grid[ty];
      if (!row) continue;
      for (let tx = Math.max(0, x0); tx < Math.min(room.tilesX, x1); tx++) {
        // GameMaker packs flip/rotate flags into the high bits of the id.
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

    // The screen's edge. The game frames this area with the show's set;
    // this is a plain bezel in its place.
    ctx.strokeStyle = '#2e2e2e';
    ctx.lineWidth = 2;
    ctx.strokeRect(PANE_X - 1, PANE_Y - 1, PANE_W + 2, PANE_H + 2);
  }

  /* ---------------- the clock ---------------- */
  let raf = 0, acc = 0, last = performance.now();
  function frame(now) {
    acc += now - last;
    last = now;
    // A hidden tab pauses rAF but time keeps passing - without this
    // clamp the backlog replays at 8x on return (the fast-forward
    // burst). Coming back resumes at normal speed, dropping the gap.
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

  // Exposed for debugging and automated checks, like the sim's window.__sim.
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
