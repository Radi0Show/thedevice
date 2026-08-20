// THE BOARD ENGINE — the sword route's three levels, all of them.
//
// Chapter 3's board game, the one ranked Z C B A S T. The sword route hands
// you one level after each board:
//
//   1  room_board_1_sword   6220x1920   desert: monsters, spear monsters,
//                                       flowers, pond fish, one bluebird,
//                                       cactus hazards, the tree loop
//   2  room_board_2_sword   5184x4736   water: boats, docks, warp maze,
//                                       fish that dash, the ice door
//   3  room_board_3_sword   3968x3392   the approach: stanchions, no
//                                       enemies, one exit trigger
//
// THE CAMERA NEVER MOVES. The screen is a fixed 384x256 window at (128,64);
// walking off an edge translates THE WHOLE WORLD one pane over (24px/frame
// horizontal, 16 vertical), with Kris — and an engaged boat — nudged +2px a
// frame against the drift so they land on the opposite bound. Warps are the
// same translation done all at once behind a 10-frame fade
// (obj_board_camera's shift = "warp").
//
// LIFETIME: the moment a shift begins every enemy and projectile is
// destroyed; the frame it lands (con 98) every living spawner inside the
// player's bounds fires, the arriving screen's colour changer retints the
// TV, and regions (water, falls, triggers) activate. Enemies are strictly
// per-screen.
//
// Everything numeric is read from the dump and cited where it lands;
// approximations are labelled on the page, not just here.

import { createEnemies, CONTACT_DAMAGE } from './enemies.js';
import { loadAtlas } from './sprites.js';
import { createAudio } from './audio.js';
import { loadFont } from './text.js';
import { createCRT } from './crt.js';
import { createWriter, createShopwriter } from './writer.js';
import { createMantle } from './mantle.js';

const VIEW_W = 640, VIEW_H = 480;
const PANE_X = 128, PANE_Y = 64, PANE_W = 384, PANE_H = 256;
const MS_PER_FRAME = 1000 / 30;

const WSPEED = 4;                      // obj_mainchara_board Create
const KRIS_SIZE = 32;
const BOUND_L = 128, BOUND_R = 480, BOUND_U = 64, BOUND_D = 288;
const SHIFT_H_SPEED = 24, SHIFT_V_SPEED = 16;

const FACE_DOWN = 0, FACE_RIGHT = 1, FACE_UP = 2, FACE_LEFT = 3;
const FACE_NAME = ['down', 'right', 'up', 'left'];

/* ---------------- getting hit ----------------
   obj_mainchara_board's Create and the damage block in its Step. Kris opens
   at myhealth 999; the Step's first health line clamps to maxhealth 12. A
   contact hit costs 2 (the hitbox's damage), projectiles cost 1, cactus 1. */
const MAXHEALTH = 12;
const IFRAMES = 20;
const HURTTIMER = 5;
const HITMOVE = 32;                    // Create's 64 is overwritten by the hit
const HITMOVESPEED = 16;

/* ---------------- the sword ----------------
   Eight frames; hitbox at buffer 6, re-aimed at 4; a direction press on
   7/6/5/4/0 turns the swing. Boxes from the two hitbox sprites' dims and
   origins at scale +/-2, relative to Kris's corner. */
const SWORDBUFFER = 8;
const SWORD_BOXES = {
  0: [0, 16, 22, 50], 1: [16, 12, 50, 22], 2: [8, -34, 22, 50], 3: [-34, 12, 50, 22],
};
const STRIKE_OFFSET = { 0: [0, 0], 1: [0, 0], 2: [0, -32], 3: [-32, 0] };
const STRIKE_FRAME = { 7: 0, 6: 0, 5: 1, 4: 1, 3: 1, 2: 2, 1: 0, 0: 0 };

/* The level-up table from the Step; xptolevel starts 3, or 10 in level 2. */
const XP_TABLE = { 2: 24, 3: 15, 4: 14, 5: 68 };

/* obj_board_death_event_sword's colour ladder (BGR literals decoded). */
const DEATH_REDS = [
  { t: 0, css: 'rgb(209,25,0)' }, { t: 40, css: 'rgb(167,27,0)' },
  { t: 50, css: 'rgb(121,20,0)' }, { t: 60, css: 'rgb(0,0,0)' },
];
const DEATH_END = 120;

/* The per-level intro colour fades. 1-3 are the managers' con-1 fades;
   4 is obj_board_b3s_repeatintro's #7C344F; the mantle rooms hold black
   (obj_gameshow_swordroute's Create). */
const INTRO_COLOR = { 1: '#FFD864', 2: '#E2FF81', 3: '#4DAFFF',
  4: '#7C344F', 5: '#000000', 6: '#000000', 7: '#7C344F' };

function pointDirection(x1, y1, x2, y2) {
  const d = Math.atan2(-(y2 - y1), x2 - x1) * 180 / Math.PI;
  return d < 0 ? d + 360 : d;
}

export async function runBoard(canvas, level, opts = {}) {
  const base = opts.base ?? 'assets/';
  const g = canvas.getContext('2d');
  canvas.width = VIEW_W;
  canvas.height = VIEW_H;
  g.imageSmoothingEnabled = false;

  const room = level;
  const S = await loadAtlas(base);
  const font = await loadFont(base);
  const audio = opts.audio ?? createAudio(base);
  const snd = (n, o) => audio.play(n, o);
  // The game's own shd_crt over the screen region; null when WebGL is out.
  const crt = await createCRT(base).catch(() => null);
  if (crt) crt.state.enabled = localStorage.getItem('eramsim.crt') !== '0';
  const writer = createWriter(font, S, snd);
  const shopwriter = createShopwriter(font, snd);
  let mantle = null;   // the Shadow Mantle, level 6 only (created after kris)

  const tileset = await new Promise((res, rej) => {
    const i = new Image();
    i.onload = () => res(i);
    i.onerror = () => rej(new Error('tileset missing'));
    i.src = `${base}${room.tileset.file}`;
  });

  // Everything the three levels can draw, warmed up front — the board is
  // small enough that "speed to play" wins over lazy loading.
  await S.preload(Object.keys(S.manifest));

  /* ---------------- the world ---------------- */
  const moveX = PANE_X - room.roomStartingX;
  const moveY = PANE_Y - room.roomStartingY;
  const world = { x: moveX, y: moveY };

  const shifted = (arr) => arr.map((o) => ({ ...o, x: o.x + moveX, y: o.y + moveY }));
  const solids = shifted(room.solids);
  const boatSolids = shifted(room.boatSolids ?? []);
  const fishSolids = shifted(room.fishSolids ?? []);
  const spawners = shifted(room.spawners ?? []);
  const warps = shifted(room.warps ?? []);
  const triggers = shifted(room.triggers ?? []);
  const colorChangers = shifted(room.colorChangers ?? []);
  const water = shifted(room.water ?? []);
  const waterfalls = shifted(room.waterfalls ?? []);
  const treeSpawners = shifted(room.treeSpawners ?? []);
  // obj_board_fern's parent is obj_board_solid: every fern is a wall, hp 1
  // to the sword (defense 1 — swordlv 2 fells it, defeat splash and gone).
  const rawProps = shifted(room.props ?? []);
  const props = rawProps.filter((p) => p.sprite !== 'spr_board_fern');
  const ferns = rawProps.filter((p) => p.sprite === 'spr_board_fern').map((f) => ({
    ...f, solid: { x: f.x, y: f.y, w: 32, h: 32 },
  }));
  const events = shifted(room.events ?? []);
  // Events whose objects descend from obj_board_solid are WALLS (the
  // parent-chain audit): the chest-room NPC (also sword-immune there, per
  // its own Step), level 3's stanchions, the shelter Tenna, and the
  // shelter door. Masks are the 16px sprite x scale, like the triggers.
  const SOLID_EVENTS = new Set(['npc', 'b3s_stanchion', 'dungeon3_tenna',
    'warptopreshadowmantle']);
  for (const e of events) {
    if (SOLID_EVENTS.has(e.obj)) {
      e.solid = { x: e.x, y: e.y, w: 16 * (e.sx || 1), h: 16 * (e.sy || 1) };
    }
  }
  const docks = shifted(room.docks ?? []);
  const boats = shifted(room.boats ?? []).map((b) => ({
    ...b, engaged: false, facing: FACE_DOWN, bob: 0, disembark: 0, myx: 0, myy: 0,
  }));
  // obj_board_cactus's parent is obj_board_hazard, NOT obj_board_solid —
  // a cactus is a walk-in hazard (overlap, damage, the knockback throws
  // you back out), never a wall. Making it solid left its mask-true
  // hurtbox unreachable from adjacent cells.
  const cactus = shifted(room.cactus ?? []).map((c) => ({
    ...c, hp: 3, frame: Math.floor(Math.random() * 2),
  }));
  for (const f of ferns) solids.push(f.solid);
  for (const e of events) { if (e.solid) solids.push(e.solid); }
  // obj_board_b1powerpond's parent is obj_board_solid — the pond blocks.
  for (const w of water) {
    if (w.type === 'b1powerpond') solids.push({ x: w.x, y: w.y, w: 64, h: 32 });
  }
  const candies = [];                 // dropped + placed heal pickups
  const trees = [];                   // spawned by treeSpawners, per screen

  /* Level 3's caterpillar party: obj_board_caterpillarchara trails the
     parent's position history (`target = 12` slots). Susie follows Kris,
     Ralsei follows behind her. The exact catch-up interpolation is
     approximated by the plain history — labelled. */
  const followers = room.number === 3
    ? [{ name: 'susie', delay: 12 }, { name: 'ralsei', delay: 24 }]
    : [];
  const trail = [];

  const pickup = room.pickup
    ? { x: room.pickup.x + moveX, y: room.pickup.y + moveY, taken: false }
    : null;

  /* ---------------- kris ---------------- */
  const kris = {
    x: room.kris.x + moveX, y: room.kris.y + moveY,
    facing: FACE_DOWN, imageIndex: 0, walkbuffer: 0,
    canfreemove: true, nowx: 0, nowy: 0,
    // obj_mainchara_board's Create: the dungeons and the mantle rooms
    // start WITH the sword (dungeon_3 at swordlv 3, the mantle rooms at 5
    // via obj_gameshow_swordroute's Create).
    sword: opts.sword ?? room.number >= 4,
    swordlv: room.number === 4 ? 3 : room.number >= 5 ? 5 : 1,
    xp: 0,
    xptolevel: room.number === 2 ? 10 : room.number === 4 ? 68 : 3,
    swordbuffer: 0, swordfacing: 0, swordhitbox: null,
    myhealth: 999, maxhealth: MAXHEALTH,
    iframes: 0, hurttimer: 0, hitcon: 0, hitmove: 0, hitx: 0, hity: 0,
    blend: 'white', monstersdefeated: 0,
    boat: false,                       // riding
    atdoorway: false, leftdoorway: false,
  };

  /* VIOLENCE — obj_board_controller's Create: true, except false in
     room_board_1_sword. Level 2's manager holds it false until Kris has
     the sword. The enemies re-derive their own aggression on top. */
  let violence = room.number !== 1;
  if (room.number === 2) violence = false;

  function makeMantle() {
    return createMantle({
      kris, snd, S, writer,
      audio,
      retint: (c, f) => retint(c, f),
      glitch: (a, b) => { if (crt) { crt.state.glitch = a; crt.state.glitchStrength = b; } },
      splash: (x, y) => foes.splashAt(x, y),
      onWin: () => beginOutro('mantle'),
    });
  }
  if (room.number === 6) mantle = makeMantle();

  const foes = createEnemies(room, {
    solids, fishSolids,
    swordlv: () => kris.swordlv,
    hasSword: () => kris.sword,
    onKill: () => { kris.xp += 1; },
    onCandy: (x, y) => candies.push({ x, y, t: 0, dropped: true }),
    snd, violence,
  });

  /* A solid Kris is ALREADY inside does not block him — it lets him out.
     Level 3's own room data places his start overlapping a 10x4-cell wall
     band (the door alcove), so the game demonstrably allows walking out of
     an overlap; it only forbids walking INTO one. Without this rule the
     level-3 spawn is a softlock. */
  function meets(x, y) {
    for (const s of solids) {
      if (x < s.x + s.w && x + KRIS_SIZE > s.x && y < s.y + s.h && y + KRIS_SIZE > s.y) {
        const already = kris.x < s.x + s.w && kris.x + KRIS_SIZE > s.x
          && kris.y < s.y + s.h && kris.y + KRIS_SIZE > s.y;
        if (!already) return true;
      }
    }
    return false;
  }
  const boatMeets = (x, y) => {
    const b = boats.find((o) => o.engaged);
    return boatSolids.some((s) => {
      const hit = x < s.x + s.w && x + KRIS_SIZE > s.x && y < s.y + s.h && y + KRIS_SIZE > s.y;
      if (!hit) return false;
      const already = b && b.x < s.x + s.w && b.x + KRIS_SIZE > s.x
        && b.y < s.y + s.h && b.y + KRIS_SIZE > s.y;
      return !already;
    });
  };

  /* ---------------- input ---------------- */
  const held = new Set();
  const KEYMAP = {
    arrowup: 'u', arrowdown: 'd', arrowleft: 'l', arrowright: 'r',
    w: 'u', s: 'd', a: 'l', d: 'r',
    z: '1', enter: '1', ' ': '1',
  };
  let press1 = false;
  const onKey = (e) => {
    const k = KEYMAP[e.key.toLowerCase()];
    if (e.key.toLowerCase() === 'm') { audio.muted = !audio.muted; }
    if (!k) return;
    e.preventDefault();
    audio.unlock();
    if (k === '1' && !held.has('1')) press1 = true;
    held.add(k);
  };
  const onKeyUp = (e) => {
    const k = KEYMAP[e.key.toLowerCase()];
    if (k) held.delete(k);
  };
  window.addEventListener('keydown', onKey);
  window.addEventListener('keyup', onKeyUp);

  /* ---------------- the TV set ---------------- */
  // obj_gameshow_swordroute: screencolor with a 16-frame merge fade, the
  // set art, and the additive glow below the screen.
  const tv = {
    color: '#000000', newColor: '#000000', change: 0, changeTime: 16,
    drawui: false,
  };
  function retint(css, frames = 16) {
    tv.newColor = css;
    tv.change = frames;
    tv.changeTime = frames;
  }
  function mergeColor(a, b, f) {
    if (!a) a = '#000000';
    if (!b) b = '#000000';
    const pa = [1, 3, 5].map((i) => parseInt(a.length === 7 ? a.slice(i, i + 2) : 'ff', 16));
    const A = a.startsWith('rgb') ? a.match(/\d+/g).map(Number) : pa;
    const B = b.startsWith('rgb') ? b.match(/\d+/g).map(Number) : [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
    return `rgb(${A.map((v, i) => Math.round(v + (B[i] - v) * f)).join(',')})`;
  }

  /* ---------------- shifts and warps ---------------- */
  let shift = 'none';
  let moving = 0;
  let warp = null;                     // {t, warpx, warpy, playerX, playerY}
  let healthbarFlash = 0;

  function translate(dx, dy) {
    world.x += dx; world.y += dy;
    for (const arr of [solids, boatSolids, fishSolids, spawners, warps, triggers,
      colorChangers, water, waterfalls, treeSpawners, props, events, docks, candies, trees]) {
      for (const o of arr) { o.x += dx; o.y += dy; }
    }
    // The cactus and fern bodies translate here; their solids are already
    // IN `solids` and translate with them.
    for (const c of cactus) { c.x += dx; c.y += dy; }
    for (const f of ferns) { f.x += dx; f.y += dy; }
    for (const sw of switches) { sw.x += dx; sw.y += dy; }
    if (chest && chest.x !== undefined) { chest.x += dx; chest.y += dy; }
    for (const b of boats) { b.x += dx; b.y += dy; }
    if (pickup) { pickup.x += dx; pickup.y += dy; }
    if (tenna) { tenna.marker.x += dx; tenna.marker.y += dy; }
    if (tease) { tease.y += dy; for (const tr of tease.trail) { tr.x += dx; tr.y += dy; } }
    foes.translate(dx, dy);
    for (const t of trail) { t.x += dx; t.y += dy; }
    kris.x += dx; kris.y += dy;
  }

  /** Everything that happens the frame a screen becomes THE screen. */
  function arrive() {
    // ANTI-SOFTLOCK GUARD (found in play, not in the dump): a warp's
    // landing spot can overlap the warptouch that goes the other way —
    // level 1's doorway pair does — and an instant re-fire ping-pongs the
    // player between rooms forever. A warptouch Kris is standing on when a
    // warp lands stays disarmed until he steps off it.
    for (const w of warps) {
      w.rearm = (kris.x < w.x + w.w && kris.x + KRIS_SIZE > w.x
        && kris.y < w.y + w.h && kris.y + KRIS_SIZE > w.y);
    }
    trail.length = 0;                 // followers snap to Kris on arrival
    if (chest && !chest.taken) {
      chest.x = world.x + chest.rx;
      chest.y = world.y + chest.ry;
      for (let i = trees.length - 1; i >= 0; i--) {
        const t = trees[i];
        if (t.x < chest.x + 32 && t.x + 32 > chest.x && t.y < chest.y + 32 && t.y + 32 > chest.y) {
          const si = solids.indexOf(t.solid);
          if (si >= 0) solids.splice(si, 1);
          trees.splice(i, 1);
        }
      }
    }
    // obj_board_swordroute_treehelper's Step_2: any tree touching Kris is
    // destroyed — the game's own guard against landing inside the forest.
    for (let i = trees.length - 1; i >= 0; i--) {
      const t = trees[i];
      if (t.x < kris.x + KRIS_SIZE && t.x + 32 > kris.x
        && t.y < kris.y + KRIS_SIZE && t.y + 32 > kris.y) {
        const si = solids.indexOf(t.solid);
        if (si >= 0) solids.splice(si, 1);
        trees.splice(i, 1);
      }
    }
    foes.spawnVisible(spawners);
    // The colour changer standing on this screen retints the set (16
    // frames, obj_board_screenColorChanger -> gameshow colorchange).
    for (const c of colorChangers) {
      if (c.x >= 128 && c.x <= 512 && c.y >= 64 && c.y <= 320) { retint(c.color); break; }
    }
    // Tree spawners expand into their grid of trees when their region
    // touches the screen (the camera's event_user(7) + activation sweep).
    for (const ts of treeSpawners) {
      if (ts.made) continue;
      const w = ts.cols * 32, h = ts.rows * 32;
      if (ts.x < 512 && ts.x + w > 128 && ts.y < 320 && ts.y + h > 64) {
        ts.made = true;
        for (let i = 0; i < ts.cols; i++) {
          for (let j = 0; j < ts.rows; j++) {
            const tx = ts.x + i * 32, ty = ts.y + j * 32;
            // obj_board_tree's parent is obj_board_solid — every tree is a
            // wall. A tree that would spawn on top of Kris is skipped (the
            // game destroys trees touching him at spawn).
            if (tx < kris.x + KRIS_SIZE && tx + 32 > kris.x
              && ty < kris.y + KRIS_SIZE && ty + 32 > kris.y) continue;
            const solid = { x: tx, y: ty, w: 32, h: 32 };
            solids.push(solid);
            trees.push({ x: tx, y: ty, cold: ts.cold, solid,
              frame: Math.floor(Math.random() * 2) });
          }
        }
      }
    }
  }

  function startWarp(w) {
    // obj_board_warptouch -> camera shift = "warp": 10 frames of fade, the
    // rebase, then con 98 on the way back in.
    warp = { t: 0, ...w };
    kris.canfreemove = false;
    foes.clearScreen();
    snd('snd_board_escaped');
  }

  function stepWarp() {
    warp.t += warp.instawarp ? 10 : 1;
    if (warp.t >= 10 && !warp.rebased) {
      warp.rebased = true;
      // The rebase: the target screen's corner (warpx,warpy in room
      // coordinates) becomes the pane, Kris lands at playerX/playerY.
      const dx = (PANE_X - warp.warpx) - world.x;
      const dy = (PANE_Y - warp.warpy) - world.y;
      translate(dx, dy);
      kris.x = warp.playerX + world.x;
      kris.y = warp.playerY + world.y;
      if (typeof warp.facing === 'number') kris.facing = warp.facing;
      arrive();
    }
    if (warp.t >= 25) {                // timer 15 after the rebase
      warp = null;
      kris.canfreemove = true;
    }
  }

  function stepShift() {
    if (warp) { stepWarp(); return; }
    if (shift === 'none') return;
    const horizontal = shift === 'left' || shift === 'right';
    const speed = horizontal ? SHIFT_H_SPEED : SHIFT_V_SPEED;
    const total = horizontal ? PANE_W : PANE_H;
    const dx = shift === 'right' ? -speed : shift === 'left' ? speed : 0;
    const dy = shift === 'down' ? -speed : shift === 'up' ? speed : 0;
    translate(dx, dy);
    // Kris — and an engaged boat — get two pixels back each frame, against
    // the drift, landing on the opposite bound.
    const nudge = { right: [2, 0], left: [-2, 0], down: [0, 2], up: [0, -2] }[shift];
    kris.x += nudge[0]; kris.y += nudge[1];
    const raft = boats.find((b) => b.engaged);
    if (raft) { raft.x += nudge[0]; raft.y += nudge[1]; }
    moving += speed;
    if (moving >= total) {
      kris.x = Math.round(kris.x);
      kris.y = Math.round(kris.y);
      shift = 'none';
      moving = 0;
      kris.canfreemove = true;
      arrive();
    }
  }

  function beginShift(dir) {
    // A warpentrance on the boundary converts the shift into a warp — the
    // check in Kris's Step right after the edge sets `shift`:
    //   if (place_meeting(x, y, obj_board_warpentrance)) ... shift = "warp"
    const w = warps.find((o) => o.kind === 'warpentrance'
      && kris.x < o.x + o.w && kris.x + KRIS_SIZE > o.x
      && kris.y < o.y + o.h && kris.y + KRIS_SIZE > o.y);
    if (w && typeof w.warpx === 'number') {
      foes.clearScreen();
      warp = { t: 0, ...w };
      kris.canfreemove = false;
      if (w.playStairsSound) snd('snd_board_escaped');
      return;
    }
    kris.canfreemove = false;
    shift = dir;
    foes.clearScreen();               // the camera's shift-start cleanup
  }

  /* ---------------- kris movement ---------------- */
  function stepKris() {
    kris.nowx = kris.x;
    kris.nowy = kris.y;

    // atdoorway / leftdoorway, from the Step's tail: standing on the
    // boundary is "at the doorway"; the strict interior arms the enemies'
    // player-on-screen checks.
    if (shift === 'none' && !warp) {
      if (kris.x < 129 || kris.x > 479 || kris.y < 65 || kris.y > 287) kris.atdoorway = true;
      else { kris.leftdoorway = true; kris.atdoorway = false; }
    }

    if (!kris.canfreemove || kris.boat) return;

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
      for (let s = WSPEED; s > 0; s -= 1) {
        if (!pd && !meets(x + px, y - s)) { kris.y -= s; py = 0; break; }
        if (!pu && !meets(x + px, y + s)) { kris.y += s; py = 0; break; }
      }
      let ok = 0;
      if (px > 0) { for (let i = px; i >= 0; i -= 1) if (!meets(x + i, kris.y)) { px = i; ok = 1; break; } }
      else { for (let i = px; i <= 0; i += 1) if (!meets(x + i, kris.y)) { px = i; ok = 1; break; } }
      if (!ok) px = 0;
    }
    if (py !== 0 && meets(kris.x, y + py)) {
      for (let s = WSPEED; s > 0; s -= 1) {
        if (!pr && !meets(kris.x - s, y + py)) { kris.x -= s; px = 0; break; }
        if (!pl && !meets(kris.x + s, y + py)) { kris.x += s; px = 0; break; }
      }
      let ok = 0;
      if (py > 0) { for (let i = py; i >= 0; i -= 1) if (!meets(kris.x, y + i)) { py = i; ok = 1; break; } }
      else { for (let i = py; i <= 0; i += 1) if (!meets(kris.x, y + i)) { py = i; ok = 1; break; } }
      if (!ok) py = 0;
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
      if (!meets(kris.x + 32, kris.y)) { kris.facing = FACE_RIGHT; beginShift('right'); }
    }
    if (kris.x < BOUND_L) {
      kris.x = BOUND_L;
      if (!meets(kris.x - 32, kris.y)) { kris.facing = FACE_LEFT; beginShift('left'); }
    }
    if (kris.y > BOUND_D) {
      kris.y = BOUND_D;
      if (!meets(kris.x, kris.y + 32)) beginShift('down');
    }
    if (kris.y < BOUND_U) {
      kris.y = BOUND_U;
      if (!meets(kris.x, kris.y - 32)) { kris.facing = FACE_UP; beginShift('up'); }
    }
  }

  /* ---------------- the boat (level 2) ---------------- */
  function stepBoats() {
    for (const b of boats) {
      if (b.gone) continue;
      b.bob += 1;
      const engaged = b.engaged;

      if (!engaged && !kris.boat && kris.canfreemove && shift === 'none' && !warp) {
        // obj_board_boat's user event 0 — scr_interact: PRESS Z while
        // standing on a dock and the boat takes you (Kris jumps to it).
        const onDock = docks.some((d) =>
          kris.x < d.x + 32 && kris.x + KRIS_SIZE > d.x && kris.y < d.y + 32 && kris.y + KRIS_SIZE > d.y);
        const near = Math.hypot(b.x - kris.x, b.y - kris.y) < 200;
        if (onDock && near && press1) {
          press1 = false;
          b.engaged = true;
          kris.boat = true;
          kris.canfreemove = false;
          b.embark = 10;
          b.ex = kris.x; b.ey = kris.y;
          snd('snd_board_lift');
        }
      }

      if (b.embark > 0) {
        b.embark -= 1;
        const f = 1 - b.embark / 10;
        kris.x = b.ex + (b.x - b.ex) * f;
        kris.y = b.ey + (b.y - b.ey) * f - Math.sin(f * Math.PI) * 16;
        if (b.embark === 0) { kris.canfreemove = true; }
        continue;
      }

      if (engaged && b.disembark > 0) {
        // Slide the boat to the dock, jump Kris out one cell beyond.
        b.disembark -= 1;
        b.x += Math.sign(b.myx - b.x) * Math.min(2, Math.abs(b.myx - b.x));
        b.y += Math.sign(b.myy - b.y) * Math.min(2, Math.abs(b.myy - b.y));
        kris.x = b.x; kris.y = b.y;
        if (b.disembark === 0) {
          kris.boat = false;
          b.engaged = false;
          kris.x = b.dockx; kris.y = b.docky;
          kris.canfreemove = true;
          snd('snd_board_lift', { pitch: 1.4 });
        }
        continue;
      }

      if (engaged && kris.canfreemove && shift === 'none' && !warp) {
        // Drive: Kris's own movement rules against the boat solids.
        const pr = held.has('r') ? 1 : 0, pl = held.has('l') ? 1 : 0;
        const pd = held.has('d') ? 1 : 0, pu = held.has('u') ? 1 : 0;
        let px = 0, py = 0, pressdir = -1;
        if (pr) { px = WSPEED; pressdir = FACE_RIGHT; }
        if (pl) { px = -WSPEED; pressdir = FACE_LEFT; }
        if (pd) { py = WSPEED; pressdir = FACE_DOWN; }
        if (pu) { py = -WSPEED; pressdir = FACE_UP; }
        const f = b.facing;
        if (f === FACE_UP && pd) b.facing = FACE_DOWN;
        else if (f === FACE_DOWN && pu) b.facing = FACE_UP;
        else if (f === FACE_LEFT && pr) b.facing = FACE_RIGHT;
        else if (f === FACE_RIGHT && pl) b.facing = FACE_LEFT;
        else if (pressdir !== -1) b.facing = pressdir;

        if (px !== 0 && boatMeets(b.x + px, b.y)) {
          for (let s = WSPEED; s > 0; s -= 1) {
            if (!pd && !boatMeets(b.x + px, b.y - s)) { b.y -= s; py = 0; break; }
            if (!pu && !boatMeets(b.x + px, b.y + s)) { b.y += s; py = 0; break; }
          }
          let ok = false;
          const step = px > 0 ? -1 : 1;
          for (let i = px; px > 0 ? i >= 0 : i <= 0; i += step) {
            if (!boatMeets(b.x + i, b.y)) { px = i; ok = true; break; }
          }
          if (!ok) px = 0;
        }
        if (py !== 0 && boatMeets(b.x, b.y + py)) {
          for (let s = WSPEED; s > 0; s -= 1) {
            if (!pr && !boatMeets(b.x - s, b.y + py)) { b.x -= s; px = 0; break; }
            if (!pl && !boatMeets(b.x + s, b.y + py)) { b.x += s; px = 0; break; }
          }
          let ok = false;
          const step = py > 0 ? -1 : 1;
          for (let i = py; py > 0 ? i >= 0 : i <= 0; i += step) {
            if (!boatMeets(b.x, b.y + i)) { py = i; ok = true; break; }
          }
          if (!ok) py = 0;
        }
        if (px !== 0 && py !== 0 && boatMeets(b.x + px, b.y + py)) { px = 0; }
        b.x += px; b.y += py;

        // The edges, tested on the boat while riding.
        if (b.x > BOUND_R) { b.x = BOUND_R; if (!boatMeets(b.x + 32, b.y)) { b.facing = FACE_RIGHT; beginShift('right'); } }
        if (b.x < BOUND_L) { b.x = BOUND_L; if (!boatMeets(b.x - 32, b.y)) { b.facing = FACE_LEFT; beginShift('left'); } }
        if (b.y > BOUND_D) { b.y = BOUND_D; if (!boatMeets(b.x, b.y + 32)) beginShift('down'); }
        if (b.y < BOUND_U) { b.y = BOUND_U; if (!boatMeets(b.x, b.y - 32)) { b.facing = FACE_UP; beginShift('up'); } }

        // Disembark: Z while facing a dock one cell ahead.
        if (press1) {
          const cx = b.facing === FACE_RIGHT ? 32 : b.facing === FACE_LEFT ? -32 : 0;
          const cy = b.facing === FACE_DOWN ? 32 : b.facing === FACE_UP ? -32 : 0;
          const d = docks.find((dk) =>
            b.x + cx + 12 < dk.x + 32 && b.x + cx + 20 > dk.x
            && b.y + cy + 12 < dk.y + 32 && b.y + cy + 20 > dk.y);
          if (d) {
            b.disembark = 16;
            b.myx = d.x - cx; b.myy = d.y - cy;   // the boat parks beside
            b.dockx = d.x; b.docky = d.y;
            kris.canfreemove = false;
            press1 = false;
          }
        }
        kris.x = b.x; kris.y = b.y;
        kris.facing = b.facing;
      } else if (engaged) {
        kris.x = b.x; kris.y = b.y;
      }
    }
  }

  /* ---------------- the sword ---------------- */
  function stepSword() {
    if (press1 && kris.sword && kris.swordbuffer <= 0 && kris.canfreemove
      && shift === 'none' && !warp && !death && !outro && !kris.boat) {
      kris.swordbuffer = SWORDBUFFER;
      kris.swordfacing = kris.facing;
      kris.canfreemove = false;
      audio.swing();
    }
    if (kris.swordbuffer > 0) {
      kris.swordbuffer -= 1;
      const b = kris.swordbuffer;
      if (b === 7 || b === 6 || b === 5 || b === 4 || b === 0) {
        if (held.has('d')) kris.swordfacing = FACE_DOWN;
        if (held.has('u')) kris.swordfacing = FACE_UP;
        if (held.has('r')) kris.swordfacing = FACE_RIGHT;
        if (held.has('l')) kris.swordfacing = FACE_LEFT;
        if (b === 4 && kris.swordhitbox) {
          kris.swordhitbox.facing = kris.swordfacing;
          kris.swordhitbox.timer = 0;
        }
      }
      kris.facing = kris.swordfacing;
      if (b === 6) kris.swordhitbox = { facing: kris.facing, timer: 0 };
      if (b === 0) kris.canfreemove = true;
    }
    if (kris.swordhitbox) {
      const hb = kris.swordhitbox;
      const [ox, oy, w, h] = SWORD_BOXES[hb.facing];
      hb.box = { x: kris.x + ox, y: kris.y + oy, w, h };
      chopCactus(hb.box);
      chopTrees(hb.box);
      chopFerns(hb.box);
      hitFollowers(hb.box);
      if (mantle) { mantle.swordHit(hb.box); mantle.summonSwordHit(hb.box); }
      hb.timer += 1;
      if (hb.timer >= 5) kris.swordhitbox = null;
    }
    if (kris.xp >= kris.xptolevel) {
      kris.xp = 0;
      kris.swordlv = Math.min(5, kris.swordlv + 1);
      kris.xptolevel = XP_TABLE[kris.swordlv] ?? 68;
      snd('snd_board_ominous');
      // Level 2's manager: the first level-up swaps the sword music back
      // to the ocean.
      if (room.number === 2 && kris.swordlv === 2) audio.music('board_ocean');
      // Level 1's manager: swordlv 4 goes ominous-quiet into the ocean.
      if (room.number === 1 && kris.swordlv === 4) audio.music('board_ocean');
    }
  }

  function chopTrees(box) {
    // obj_board_tree's Step: a sword hit fells it only when
    // `sword.swordlv > defense` — defense 3, so the maxed blade.
    if (kris.swordlv <= 3) return;
    for (let i = trees.length - 1; i >= 0; i--) {
      const t = trees[i];
      if (box.x < t.x + 32 && box.x + box.w > t.x && box.y < t.y + 32 && box.y + box.h > t.y) {
        const si = solids.indexOf(t.solid);
        if (si >= 0) solids.splice(si, 1);
        trees.splice(i, 1);
        snd('snd_board_kill');
      }
    }
  }

  function chopFerns(box) {
    // obj_board_fern's Step: swordlv > defense (1) — one hit, splash, gone.
    if (kris.swordlv <= 1) return;
    for (let i = ferns.length - 1; i >= 0; i--) {
      const f = ferns[i];
      if (f.dead) continue;
      if (box.x < f.x + 32 && box.x + box.w > f.x && box.y < f.y + 32 && box.y + box.h > f.y) {
        const si = solids.indexOf(f.solid);
        if (si >= 0) solids.splice(si, 1);
        foes.splashAt(f.x + 16, f.y + 16);
        f.dead = true;
      }
    }
  }

  /* obj_board_caterpillarchara's Step_2 tail: ONE sword hit destroys a
     follower — defeat splash, swordlv++ with snd_board_ominous, and the
     kpause: 30 frames where everything holds while the player character
     takes it in (the overworld Kris's sideways glance is machinery this
     sim has no stage for; the pause is kept). */
  let kpause = 0;

  function hitFollowers(box) {
    for (let i = followers.length - 1; i >= 0; i--) {
      const f = followers[i];
      const t = trail[Math.min(f.delay, Math.max(0, trail.length - 1))];
      if (!t) continue;
      if (box.x < t.x + 32 && box.x + box.w > t.x && box.y < t.y + 32 && box.y + box.h > t.y) {
        foes.splashAt(t.x + 16, t.y + 16);
        kris.swordlv = Math.min(5, kris.swordlv + 1);
        snd('snd_board_ominous');
        followers.splice(i, 1);
        kpause = 30;
      }
    }
  }

  function chopCactus(box) {
    for (let i = cactus.length - 1; i >= 0; i--) {
      const c = cactus[i];
      if (c.dead || c.hitwait > 0) continue;
      if (box.x < c.x + 32 && box.x + box.w > c.x && box.y < c.y + 32 && box.y + box.h > c.y) {
        c.hp -= 1;
        c.hitwait = 10;
        snd('snd_board_damage');
        if (c.hp <= 0) {
          foes.splashAt(c.x + 16, c.y + 16);
          c.dead = true;
        }
      }
    }
  }

  /* ---------------- the pickup and candy ---------------- */
  function stepPickup() {
    if (pickup && pickup.exitAt) {
      pickup.exitAt -= 1;
      if (pickup.exitAt === 0) {
        pickup.exitAt = undefined;
        const out = {
          1: { warpx: 896, warpy: 1344, playerX: 1072, playerY: 1456 },
          2: { warpx: 1664, warpy: 3136, playerX: 1744, playerY: 3216 },
          3: { warpx: 1664, warpy: 576, playerX: 1856, playerY: 704 },
        }[room.number];
        startWarp(out);
      }
      return;
    }
    for (const sw of switches) {
      if (onScreen(sw.x, sw.y)) drawSprite('spr_board_dungeon3_switch', sw.pressed || sw.used ? 1 : 0, sw.x, sw.y);
    }
    if (chest && !chest.taken && onScreen(chest.x, chest.y)) {
      drawSprite('spr_board_chest', 0, chest.x, chest.y);
    }
    if (pickup && !pickup.taken && !kris.sword) {
      const near = kris.x < pickup.x + 32 && kris.x + KRIS_SIZE > pickup.x - 8
        && kris.y < pickup.y + 32 && kris.y + KRIS_SIZE > pickup.y - 8;
      if (near && press1) {
        press1 = false;
        pickup.taken = true;
        kris.sword = true;
        kris.canfreemove = false;
        // The pickup's Step: level music starts with the sword...
        if (room.number === 1) audio.music('board_sword_music');
        if (room.number === 2) audio.music('board_sword_music', { pitch: 0.9 });
        if (room.number === 3) audio.music('board_ocean');
        // ...and the take-sequence WARPS YOU OUT — the sword room is
        // one-way by design (the pickup's own transition + instawarp):
        //   L1 -> (896,1344) player (1072,1456)
        //   L2 -> (1664,3136) player (1744,3216)
        //   L3 -> (1664,576)  player (1856,704)
        pickup.exitAt = 40;                    // the raise-the-sword beat
      }
    }
    for (let i = candies.length - 1; i >= 0; i--) {
      const c = candies[i];
      c.t += 1;
      if (c.dropped && c.t > 150) { candies.splice(i, 1); continue; }
      if (c.t < 10) continue;              // the 10-frame grace
      const over = kris.x < c.x + 32 && kris.x + KRIS_SIZE > c.x
        && kris.y < c.y + 32 && kris.y + KRIS_SIZE > c.y;
      const sworded = kris.swordhitbox && kris.swordhitbox.box
        && kris.swordhitbox.box.x < c.x + 32 && kris.swordhitbox.box.x + kris.swordhitbox.box.w > c.x
        && kris.swordhitbox.box.y < c.y + 32 && kris.swordhitbox.box.y + kris.swordhitbox.box.h > c.y;
      if ((over || sworded) && kris.myhealth >= 1) {
        candies.splice(i, 1);
        kris.myhealth += 2;
        snd('snd_power');
      }
    }
  }

  /* ---------------- warps, triggers and endings ---------------- */
  let outro = null;                    // {kind, t}
  let treeLoops = 0;                   // global.flag[1006]

  /* ---------------- the set pieces ----------------
     obj_board_1_sword_shadowtease, obj_board_b2s_icedoor,
     obj_b2s_tennamonologue, obj_board_1_sword_b1store,
     obj_board_smallpond_sword — each translated from its own Step and
     driven here. */
  let tease = null;                    // the Mantle fleeing, then the text
  let doorSeq = null;                  // the ice door opening
  let chest = null;                    // level 1's icekey chest (after 4 loops)
  let keySeq = null;                   // the chest cinematic
  /* Level 4's switch puzzle (obj_board_dungeon3_switch): two plates on one
     screen; Kris on one, the black deer on the other, both at once — then
     CONTROL TRANSFERS TO THE DEER (obj_mainchara_board.controlled = false,
     the deer's abouttoregaincontrol = true, its hp set to 1 so one hazard
     touch hands control back). Door walls seal the screen edge while you
     are the deer. The deer's destination beyond the opened wall is staged
     by set pieces this sim does not carry — Z as the deer also returns
     control, so the mechanic cannot softlock (labelled). */
  const switches = events.filter((e) => e.obj === 'dungeon3_switch')
    .map((e) => ({ ...e, pressed: false, used: false }));
  let deerCtl = null;
  const tenna = room.number === 2
    ? { marker: { x: 3904 + moveX, y: 1440 + moveY }, con: 0, kx: 0, ky: 0 }
    : null;
  let storeShown = false;

  function stepSetPieces() {
    if (deerCtl) {
      const d = deerCtl.deer;
      if (!foes.enemies.includes(d) || d.hp <= 0) {
        // the deer fell — control returns
        deerCtl = null;
        kris.canfreemove = true;
      } else {
        // drive the deer at wspeed 2, Kris's own movement rules
        const spd = 2;
        let dx = 0, dy = 0;
        if (held.has('r')) dx = spd;
        if (held.has('l')) dx = -spd;
        if (held.has('d')) dy = spd;
        if (held.has('u')) dy = -spd;
        const free = (x, y) => !solids.some((sl) =>
          x < sl.x + sl.w && x + 32 > sl.x && y < sl.y + sl.h && y + 32 > sl.y);
        if (dx && free(d.x + dx, d.y)) d.x += dx;
        if (dy && free(d.x, d.y + dy)) d.y += dy;
        d.x = Math.min(BOUND_R, Math.max(BOUND_L, d.x));
        d.y = Math.min(BOUND_D, Math.max(BOUND_U, d.y));
        if (press1) {
          press1 = false;
          d.playerControlled = false;
          deerCtl = null;
          kris.canfreemove = true;
          beginOutro('deer');
        }
        return;
      }
    }
    if (keySeq) {
      keySeq.t += 1;
      if (keySeq.t === 30) snd('snd_noise', { volume: 0.8, pitch: 0.5 });
      if (keySeq.t === 90) retint('#ADC7EB', 5);
      if (keySeq.t === 150) retint('#1E76F0', 5);
      if (keySeq.t === 210) { retint('#000000', 5); snd('snd_link_get_key'); }
      if (keySeq.t >= 330) {
        keySeq = null;
        beginOutro('key');
      }
      return;
    }
    if (tease) {
      tease.t += 1;
      if (tease.t < 48) {
        tease.y -= 8;                          // vspeed -8
        if (tease.t % 4 === 0) tease.trail.push({ x: tease.e.x, y: tease.y, a: 1 });
      }
      for (const tr of tease.trail) tr.a -= 0.06;
      if (tease.t === 48) {
        // shopwriter.shopstring = "See you soon."; textcol = 0 (black)
        shopwriter.show('See you soon.', { color: '#000000', y: 64 + 64 + 12 });
      }
      if (tease.t >= 200) {
        // The tease is a mid-level encounter (flag 1008), not the ending —
        // the Mantle is gone, the words hang there, and control returns.
        // Level 1 truly ends at the CHEST in the tree loop.
        kris.canfreemove = true;
        tease.done = true;
      }
      if (tease.done && tease.t >= 320) {
        shopwriter.clear();
        tease = null;
      }
      return;
    }
    if (doorSeq) {
      doorSeq.t += 1;
      if (doorSeq.t === 30) {
        doorSeq.door.imageIndex = 1;           // the door opens
        snd('snd_impact', { volume: 0.8, pitch: 0.5 });
        snd('snd_impact', { volume: 0.6, pitch: 0.8 });
      }
      if (doorSeq.t === 60) {
        retint('#5AAFFF', 8);
        beginOutro('icedoor');
        doorSeq = null;
      }
      return;
    }
    if (tenna && !writer.active) {
      // obj_b2s_tennamonologue: the trigger starts the monologue; once it
      // ends, the first MOVEMENT spooks him and he makes his getaway.
      if (tenna.con === 0) {
        const t = triggers.find((tr) => tr.extflag === 'b2s_tennamonologue');
        if (t && kris.x < t.x + t.w && kris.x + KRIS_SIZE > t.x
          && kris.y < t.y + t.h && kris.y + KRIS_SIZE > t.y) {
          tenna.con = 1;
          kris.canfreemove = false;
          writer.open([
            'PHEW^1! FINALLY^1, SOME\nPEACE AND QUIET!/',
            '..^1. I WONDER...\nIF THEY EVEN \nLIKE THE GAME...?/',
            "I'M TRYING MY BEST\nTO MAKE IT FUN^1, BUT.../",
            'HERE AND THERE^1, \nSTRANGE THINGS ARE \nSHOWING THROUGH.../',
            'OH^1, WHY DID I BASE \nIT OFF THIS STUPID \nOLD THING!!/',
            "..^1. KRIS^1, OH^1, KRIS \nIF YOU COULD JUST \nSMILE..^1. LAUGH.../",
            "TELL ME I'M DOING \nSOMETHING RIGHT... \nPLEASE.../%",
          ], {
            onClose: () => {
              kris.canfreemove = true;
              tenna.kx = kris.x; tenna.ky = kris.y;
              tenna.con = 2;
            },
          });
        }
      } else if (tenna.con === 2) {
        if (kris.x !== tenna.kx || kris.y !== tenna.ky) {
          tenna.con = 3;
          kris.canfreemove = false;
          writer.open([
            'WHAT THE? I HEAR \nFOOTSTEPS!/',
            'NO GOOD\nI NEED TO MAKE \nMY GETAWAY/%',
          ], {
            onClose: () => {
              kris.canfreemove = true;
              snd('snd_board_escaped', { pitch: 1.2 });
              tenna.con = 4;                   // the marker vanishes
            },
          });
        }
      }
    }
    // The store sign: on its screen, with the sword, the sign types out —
    // "BECOME STRONGER" until swordlv 3, "BECAME STRONGER" at 3,
    // "Having fun?" (in black) past it.
    const store = events.find((e) => e.obj === '1_sword_b1store');
    if (store) {
      const on = store.x >= 128 && store.x <= 512 && store.y >= 64 && store.y <= 320;
      if (on && kris.sword && !storeShown && !tease) {
        storeShown = true;
        if (kris.swordlv < 3) shopwriter.show('BECOME STRONGER');
        else if (kris.swordlv === 3) shopwriter.show('BECAME STRONGER');
        else shopwriter.show('Having fun?', { color: '#000000' });
      }
      if (!on && storeShown) {
        storeShown = false;
        if (!tease) shopwriter.clear();
      }
    }
    // Level 5's confrontation: the two obj_board_preshadowmantle markers
    // carry the Holder's words.
    if (room.number === 5 && !writer.active) {
      for (const e of events) {
        if (e.obj !== 'preshadowmantle' || e.said) continue;
        const over = kris.x < e.x + 32 && kris.x + KRIS_SIZE > e.x - 16
          && kris.y < e.y + 64 && kris.y + KRIS_SIZE > e.y - 32;
        if (over) {
          e.said = true;
          kris.canfreemove = false;
          writer.open([
            'Kris..^1. oh..^1. Kris.../',
            'Is it fun^1, Kris?/',
            'Playing around like this.../',
            "That's why you're searching for them^1, aren't you?/",
            'The SHADOW CRYSTALs.../',
            "..^1. and the SHADOW MANTLE that I'm holding!/",
            "Do you honestly think it'll get you what you want...?/",
            "..^1. no^1, part of you is just..^1. enjoying this^1, isn't it?/%",
          ], { onClose: () => { kris.canfreemove = true; } });
          return;
        }
      }
    }
    // The spring: Z on the small pond.
    if (press1 && room.number === 1 && !writer.active && kris.canfreemove
      && shift === 'none' && !warp && !outro && !death) {
      const pond = water.find((w) => w.type === 'smallpond_sword');
      if (pond && kris.x < pond.x + 128 + 16 && kris.x + KRIS_SIZE > pond.x - 16
        && kris.y < pond.y + 64 + 16 && kris.y + KRIS_SIZE > pond.y - 16) {
        press1 = false;
        kris.canfreemove = false;
        writer.open(["IT'S A BEAUTIFUL LITTLE SPRING./%"], {
          onClose: () => { kris.canfreemove = true; },
        });
      }
    }
  }

  function stepWarps() {
    if (!kris.canfreemove || shift !== 'none' || warp || death || outro) return;
    for (const w of warps) {
      const over = kris.x < w.x + w.w && kris.x + KRIS_SIZE > w.x
        && kris.y < w.y + w.h && kris.y + KRIS_SIZE > w.y;
      if (w.rearm) { if (!over) w.rearm = false; continue; }
      if (w.kind !== 'warptouch') continue;   // entrances fire at the edge
      if (over && typeof w.warpx === 'number') { startWarp(w); return; }
    }
    for (const e of events) {
      // the event's mask is its 16px SPRITE x its scale — 32*sx doubled
      // every trigger (the stairs fired from a cell away)
      const ew = 16 * (e.sx || 1), eh = 16 * (e.sy || 1);
      const over = kris.x < e.x + ew && kris.x + KRIS_SIZE > e.x
        && kris.y < e.y + eh && kris.y + KRIS_SIZE > e.y;
      if (!over) continue;
      if (e.obj === 'b1_shadowteaseentrance') {
        // scr_quickwarp(3200, 64, 3376, 256)
        startWarp({ warpx: 3200, warpy: 64, playerX: 3376, playerY: 256 });
        return;
      }
      if (e.obj === 'b1swordentrance') {
        startWarp({ warpx: 2048, warpy: 320, playerX: 2224, playerY: 512, facing: FACE_UP });
        return;
      }
      if (e.obj === 'swordroute_treeteleportroom' && treeLoops < 4) {
        // The forest loop, from the teleportroom's Step:
        //   var plx = obj_mainchara_board.x - 128;   // SCREEN position
        //   scr_board_instawarp(1280, 1088, 1280 + plx, 1088 + ply, ...)
        // — you land on the canonical screen at the same screen position,
        // four times (global.flag[1006]), and then the forest lets you
        // through.
        treeLoops += 1;
        const plx = kris.x - PANE_X;
        const ply = kris.y - PANE_Y;
        if (treeLoops === 4 && !chest) {
          // The fourth entry spawns the CHEST on the canonical screen —
          // obj_board_swordroute_icekey at cell (choose(4,5), choose(2,3)),
          // its colour changer forced to #FF9B00.
          const tx = 4 + Math.floor(Math.random() * 2);
          const ty = 2 + Math.floor(Math.random() * 2);
          chest = { rx: 1280 + tx * 32, ry: 1088 + ty * 32, taken: false };
          retint('#FF9B00', 16);
        }
        startWarp({ warpx: 1280, warpy: 1088, playerX: 1280 + plx, playerY: 1088 + ply, instawarp: true });
        return;
      }
      if (e.obj === '1_sword_shadowtease' && !outro && !tease && !e.fled) {
        // Level 1's finale: the Mantle flees upward trailing afterimages
        // (vspeed -8, an image every 4 frames, snd_board_mantle_move),
        // leaves "See you soon." behind, and the level is done.
        tease = { t: 0, e, y: e.y, trail: [] };
        e.fled = true;
        kris.canfreemove = false;
        snd('snd_board_mantle_move');
        return;
      }
      if (e.obj === 'b2sword_boatwarp' && kris.boat) {
        // obj_board_b2sword_boatwarp: the boat sails into it, the boat is
        // destroyed, and Kris lands on foot at (4192,2240) —
        // scr_quickwarp(3968, 2112, 4192, 2240).
        const b = boats.find((x) => x.engaged);
        if (b) { b.engaged = false; b.gone = true; }
        kris.boat = false;
        snd('snd_link_secret_bad');
        startWarp({ warpx: 3968, warpy: 2112, playerX: 4192, playerY: 2240, facing: FACE_DOWN });
        return;
      }

    }
    // The ice door — an interactable: Z within reach opens its sequence
    // (obj_board_b2s_icedoor's Step, con 10..12): the "UNLOCKED WITH THE
    // ICE KEY" box (rate 6, silent, unskippable), snd_noise twice, then the
    // door opens with snd_impact and the set fades #5AAFFF down to black
    // into the dungeon.
    if (press1 && room.number === 2 && !outro && !doorSeq) {
      const door = events.find((e) => e.obj === 'b2s_icedoor');
      if (door) {
        const bx = door.x, by = door.y, bw = 96, bh = 62;
        const near = kris.x < bx + bw + 40 && kris.x + KRIS_SIZE > bx - 40
          && kris.y < by + bh + 40 && kris.y + KRIS_SIZE > by - 40;
        if (near) {
          press1 = false;
          kris.canfreemove = false;
          snd('snd_noise', { volume: 0.8, pitch: 0.5 });
          snd('snd_noise', { volume: 0.8, pitch: 0.7 });
          writer.open(['UNLOCKED WITH THE\n\\cIICE KEY\\cW'], {
            rate: 6, textsound: null, skippable: false, triangle: false, side: 1,
            autoClose: 30,
            onClose: () => { doorSeq = { t: 0, door }; },
          });
          return;
        }
      }
    }
    // Level 4's exit: obj_board_warptopreshadowmantle — Z at the shelter
    // door: "USED THE SHELTER KEY", the door creaks open in three steps,
    // and the walk begins.
    if (press1 && room.number === 4 && !outro) {
      const door = events.find((e) => e.obj === 'warptopreshadowmantle');
      if (door) {
        const near = kris.x < door.x + 64 + 40 && kris.x + KRIS_SIZE > door.x - 40
          && kris.y < door.y + 64 + 40 && kris.y + KRIS_SIZE > door.y - 40;
        if (near) {
          press1 = false;
          kris.canfreemove = false;
          writer.open(['USED THE \\cYSHELTER KEY\\cW./%'], {
            onClose: () => {
              snd('snd_board_torch_low', { pitch: 0.9 });
              snd('snd_board_door_close');
              beginOutro('shelter');
            },
          });
          return;
        }
      }
    }
    for (const t of triggers) {
      const over = kris.x < t.x + t.w && kris.x + KRIS_SIZE > t.x
        && kris.y < t.y + t.h && kris.y + KRIS_SIZE > t.y;
      if (!over || t.fired) continue;
      t.fired = true;
      if (room.number === 3 && !t.extflag) {
        beginOutro('escape');           // b3s con 999: fade and leave
        return;
      }
      // Level 7: the room's triggers line the lower-right exit corridor —
      // they hand control to obj_swordroute_event_leavescreen (the
      // leave-the-TV cutscene, reduced here to the finale outro).
      if (room.number === 7) {
        beginOutro('finale');
        return;
      }
    }
    // Level 4: the switch plates and the deer.
    if (room.number === 4 && switches.length && !switches[0].used) {
      const deer = foes.enemies.find((e) => e.kind === 'black_deer');
      for (const sw of switches) {
        const on = (o, ox, oy, ow, oh) => o && ox < sw.x + 32 && ox + ow > sw.x && oy < sw.y + 32 && oy + oh > sw.y;
        const was = sw.pressed;
        sw.pressed = on(kris, kris.x, kris.y, 32, 32) || (deer && on(deer, deer.x, deer.y, 32, 32));
        if (sw.pressed && !was) snd('snd_noise', { pitch: 1.4 });
        if (!sw.pressed && was) snd('snd_noise', { pitch: 1.1 });
      }
      if (switches.every((sw) => sw.pressed) && deer && !deerCtl) {
        for (const sw of switches) sw.used = true;
        snd('snd_impact');
        deerCtl = { deer };
        deer.playerControlled = true;
        deer.hp = 1; deer.maxhp = 1;
        kris.canfreemove = false;
      }
    }
    // Level 1's true ending: the CHEST from the tree loop. Its cinematic
    // (obj_board_swordroute_icekey's Draw): the blue flood #1E76F0, the
    // four-corner static at quarter alpha (screencolor #ADC7EB), black,
    // snd_link_get_key, flag 1055 = 1 — and in the game the TV turns off.
    // The dialogue writer inside the sequence is not reproduced (labelled).
    if (press1 && room.number === 1 && chest && !chest.taken && !keySeq) {
      const near = kris.x < chest.x + 32 + 40 && kris.x + KRIS_SIZE > chest.x - 40
        && kris.y < chest.y + 32 + 40 && kris.y + KRIS_SIZE > chest.y - 40;
      if (near) {
        press1 = false;
        chest.taken = true;
        kris.canfreemove = false;
        audio.fadeMusic(2);
        keySeq = { t: 0 };
        return;
      }
    }
    // Level 7: the chest is a GAG — Pippins guards it forever (his Step
    // skips sword damage in this room) and the chest "(won't open.)".
    // Talking to him is the MICHAEL read; the route continues elsewhere.
    if (press1 && room.number === 7 && !outro && !writer.active && kris.canfreemove) {
      const npc = events.find((e) => e.obj === 'npc');
      if (npc) {
        const near = kris.x < npc.x + 32 + 16 && kris.x + KRIS_SIZE > npc.x - 16
          && kris.y < npc.y + 32 + 16 && kris.y + KRIS_SIZE > npc.y - 16;
        if (near) {
          press1 = false;
          kris.canfreemove = false;
          writer.open(['* FOUND THE SECRET OF "MICHAEL."\n* ALL MICHAELS NOW ADDED TO INVENTORY./%'], {
            onClose: () => { kris.canfreemove = true; },
          });
          return;
        }
      }
    }
    // Level 5: reaching the end of the walk is the handoff to the fight.
    if (room.number === 5 && !outro && (kris.x - world.x) > 2200) {
      beginOutro('walk');
      return;
    }
  }

  function beginOutro(kind) {
    outro = { kind, t: 0 };
    kris.canfreemove = false;
    if (kind === 'escape') { snd('snd_board_escaped'); audio.fadeMusic(1.6); }
    if (kind === 'shadowtease') { snd('snd_board_mantle_move'); audio.fadeMusic(1.6); }
    if (kind === 'icedoor') { audio.fadeMusic(1.6); }
  }

  function stepOutro() {
    outro.t += 1;
    if (outro.t >= 90) {
      outro.done = true;
      if (opts.onComplete) opts.onComplete(room.number);
    }
  }

  /* ---------------- damage ---------------- */
  let death = null;

  // place_meeting uses SPRITE MASKS, and Kris's is
  // spr_board_spritemask_16x16_lowerhalf — bbox [0,8,15,15] at xscale 2:
  // only the LOWER 32x16 half of his cell can be hurt. Every hazard box
  // below comes from its sprite's bbox the same way (hitboxes.json dump).
  function krisHurtbox() {
    return { x: kris.x, y: kris.y + 16, w: KRIS_SIZE, h: 16 };
  }

  function cactusTouch() {
    if (!kris.canfreemove && !kris.boat) return null;
    const hb = krisHurtbox();
    for (const c of cactus) {
      if (c.dead) continue;
      // spr_board_cactus bbox [4,2,11,13] x2 -> a 16x24 box inset in the cell
      if (hb.x < c.x + 24 && hb.x + hb.w > c.x + 8
        && hb.y < c.y + 28 && hb.y + hb.h > c.y + 4) {
        return { damage: 1, px: c.x, py: c.y };
      }
    }
    return null;
  }

  function stepDamage() {
    if (kris.myhealth > kris.maxhealth) kris.myhealth = kris.maxhealth;
    if (kris.iframes > -5) kris.iframes -= 1;

    const gate = (kris.canfreemove || (!kris.canfreemove && kris.swordbuffer > 0)
      || (!kris.canfreemove && kris.boat))
      && kris.iframes <= 0 && kris.myhealth > 0 && !death && !outro;
    if (gate) {
      const hb = krisHurtbox();
      const hazard = (mantle ? mantle.touching(hb) : null) ?? foes.touching(hb) ?? cactusTouch();
      if (hazard) {
        kris.iframes = IFRAMES;
        kris.blend = 'red';
        kris.myhealth -= hazard.damage ?? CONTACT_DAMAGE;
        healthbarFlash = 2;
        // `if (sword == true) { crt_glitch = 6; crt_glitchstrength = 10; }`
        if (kris.sword && crt) { crt.state.glitch = 6; crt.state.glitchStrength = 10; }
        snd('snd_board_playerhurt');
        snd('snd_hurt1');
        foes.stun(kris);

        kris.hurttimer = HURTTIMER;
        if (!kris.boat) kris.canfreemove = false;
        kris.hitmove = HITMOVE;
        kris.hitcon = 1;
        kris.hitx = 0;
        kris.hity = 0;
        const dir = pointDirection(kris.x, kris.y, hazard.px ?? hazard.x, hazard.py ?? hazard.y);
        const free = (dx, dy) => !meets(kris.x + dx, kris.y + dy);
        if (dir >= 135 && dir < 225) {
          if (free(16, 0)) kris.hitx += HITMOVESPEED;
          else if ((hazard.py ?? 0) > kris.y && free(0, -16)) kris.hity -= HITMOVESPEED;
          else if (free(0, 16)) kris.hity += HITMOVESPEED;
        }
        if (dir >= 315 || dir < 45) {
          if (free(-16, 0)) kris.hitx -= HITMOVESPEED;
          else if ((hazard.py ?? 0) > kris.y && free(0, -16)) kris.hity -= HITMOVESPEED;
          else if (free(0, 16)) kris.hity += HITMOVESPEED;
        }
        if (dir >= 45 && dir < 135) {
          if (free(0, 16)) kris.hity += HITMOVESPEED;
          else if ((hazard.px ?? 0) < kris.x && free(-16, 0)) kris.hitx -= HITMOVESPEED;
          else if (free(16, 0)) kris.hitx += HITMOVESPEED;
        }
        if (dir >= 225 && dir < 315) {
          if (free(0, -16)) kris.hity -= HITMOVESPEED;
          else if ((hazard.px ?? 0) < kris.x && free(-16, 0)) kris.hitx -= HITMOVESPEED;
          else if (free(16, 0)) kris.hitx += HITMOVESPEED;
        }
      }
    }

    if (kris.hitcon === 1) {
      if (kris.hitmove > 0) {
        kris.hitmove -= HITMOVESPEED;
        if (!meets(kris.x + kris.hitx, kris.y + kris.hity)) {
          kris.x += kris.hitx;
          kris.y += kris.hity;
        }
      } else {
        kris.blend = 'white';
        if (kris.myhealth <= 0) {
          kris.myhealth = 0;
          kris.hitcon = 99;
          startDeath();
        } else {
          kris.hitcon = 0;
        }
      }
    }

    if (kris.hurttimer === 1) kris.canfreemove = true;
    if (kris.hurttimer > 0) {
      kris.hurttimer -= 1;
      kris.x = Math.min(BOUND_R, Math.max(BOUND_L, kris.x));
      kris.y = Math.min(BOUND_D, Math.max(BOUND_U, kris.y));
    }

    if (kris.iframes > 0) {
      if (kris.iframes % 2 === 0) kris.blend = kris.blend === 'white' ? 'red' : 'white';
    } else {
      kris.blend = 'white';
    }
    for (const c of cactus) if (c.hitwait > 0) c.hitwait -= 1;
  }

  function startDeath() {
    death = { timer: 0, facing: FACE_DOWN, css: DEATH_REDS[0].css };
    foes.clearScreen();
    audio.stopMusic();
    snd('snd_fall');
  }

  function stepDeath() {
    death.timer += 1;
    const t = death.timer;
    if (t < 48 && t % 4 === 0) death.facing = (death.facing + 3) % 4;
    for (const r of DEATH_REDS) if (t >= r.t) death.css = r.css;
  }

  /* ---------------- the intro ----------------
     obj_board_squaretransition, special = "heart": seven full-width black
     bars over board rows 1..7, the top of the stack clearing every 15
     frames (`if (timer % 15 == 0) baramount--`), with the little heart
     (obj_board_squaretransition_heart, two halves at (312,182) and
     (312,192), scale 1) riding bars 4 and 3. Behind it the manager fades
     screencolor black -> the level colour over 60 frames. */
  let intro = { t: 0 };
  retint('#000000', 1);
  tv.color = '#000000';

  function stepIntro() {
    intro.t += 1;
    if (kris.myhealth > kris.maxhealth) kris.myhealth = kris.maxhealth;
    if (intro.t === 1) retint(INTRO_COLOR[room.number], 60);
    if (7 - Math.floor(intro.t / 15) <= 0) {
      intro = null;
      tv.drawui = true;
      // level music: the walk plays glacier, the fight nightmare_nes,
      // everything else the ocean.
      if (room.number === 5) audio.music('glacier', { volume: 0.7 });
      else if (room.number === 6) audio.music('nightmare_nes');
      else audio.music('board_ocean');
    }
  }

  function drawIntro() {
    const bars = 7 - Math.floor(intro.t / 15);
    g.fillStyle = '#000';
    for (let i = 0; i < bars; i++) {
      g.fillRect(PANE_X, PANE_Y + (7 - i) * 32, PANE_W, 32);
      if (i === 4) { const h = S.frame('obj_board_squaretransition_heart', 0); if (h) g.drawImage(h, 312, 182); }
      if (i === 3) { const h = S.frame('obj_board_squaretransition_heart', 1); if (h) g.drawImage(h, 312, 192); }
    }
  }

  /* ---------------- restart ---------------- */
  function restart() {
    translate(moveX - world.x, moveY - world.y);
    kris.x = room.kris.x + moveX;
    kris.y = room.kris.y + moveY;
    kris.facing = FACE_DOWN;
    kris.imageIndex = 0;
    kris.walkbuffer = 0;
    kris.canfreemove = true;
    kris.myhealth = MAXHEALTH;
    kris.iframes = 0; kris.hurttimer = 0; kris.hitcon = 0; kris.hitmove = 0;
    kris.hitx = 0; kris.hity = 0;
    kris.blend = 'white';
    kris.swordbuffer = 0; kris.swordhitbox = null;
    // level-entry state comes back exactly as on first entry — a death in
    // the mantle rooms must NOT strip the sword (that made level 6
    // unwinnable after one death)
    kris.xp = 0;
    kris.swordlv = room.number === 4 ? 3 : room.number >= 5 ? 5 : 1;
    kris.xptolevel = room.number === 2 ? 10 : room.number === 4 ? 68 : 3;
    kris.sword = opts.sword ?? room.number >= 4;
    // the fight starts over clean — a stale mantle kept its old phase and
    // a boss mid-flight after death
    if (room.number === 6) mantle = makeMantle();
    kris.boat = false;
    kris.atdoorway = false; kris.leftdoorway = false;
    kris.monstersdefeated = 0;
    if (pickup) pickup.taken = false;
    for (const b of boats) { b.engaged = false; b.embark = 0; b.disembark = 0; b.gone = false; }
    for (const t of triggers) t.fired = false;
    candies.length = 0;
    for (const t of trees) {
      const si = solids.indexOf(t.solid);
      if (si >= 0) solids.splice(si, 1);
    }
    trees.length = 0;
    for (const ts of treeSpawners) ts.made = false;
    treeLoops = 0;
    chest = null; keySeq = null;
    shift = 'none'; moving = 0; warp = null;
    healthbarFlash = 0;
    death = null; outro = null; kpause = 0;
    if (pickup) pickup.exitAt = undefined;
    for (const f of ferns) {
      if (f.dead) { f.dead = false; solids.push(f.solid); }
    }
    for (const c of cactus) {
      if (c.dead) { c.dead = false; c.hp = 3; }
    }
    followers.length = 0;
    if (room.number === 3) followers.push({ name: 'susie', delay: 12 }, { name: 'ralsei', delay: 24 });
    tease = null; doorSeq = null; storeShown = false;
    if (tenna) { tenna.con = 0; tenna.marker.x = 3904 + moveX; tenna.marker.y = 1440 + moveY; }
    shopwriter.clear();
    foes.reset();
    intro = { t: 0 };
    tv.color = '#000000'; tv.drawui = false;
    arrive();
    if (opts.onRestart) opts.onRestart();
  }

  function stepTrail() {
    // The history advances only while Kris MOVES — when he stops, the
    // party holds its spacing behind him instead of converging under him.
    const moving = kris.x !== kris.nowx || kris.y !== kris.nowy;
    if (!moving && trail.length) { trail[0].moving = false; return; }
    trail.unshift({ x: kris.x, y: kris.y, facing: kris.facing, moving });
    if (trail.length > 80) trail.pop();
  }

  function stepAnim() {
    if (kris.x !== kris.nowx || kris.y !== kris.nowy) kris.walkbuffer = 6;
    if (kris.walkbuffer > 3) kris.imageIndex += 0.125;
    if (kris.walkbuffer <= 0) kris.imageIndex = 0;
    kris.walkbuffer -= 0.75;
  }

  /* ---------------- drawing ---------------- */
  const { tileW, tileH, cols, border } = room.tileset;
  let animClock = 0;

  function drawTiles() {
    const x0 = Math.floor((PANE_X - world.x) / tileW);
    const y0 = Math.floor((PANE_Y - world.y) / tileH);
    const x1 = Math.ceil((PANE_X + PANE_W - world.x) / tileW);
    const y1 = Math.ceil((PANE_Y + PANE_H - world.y) / tileH);
    for (let ty = Math.max(0, y0); ty < Math.min(room.tilesY, y1); ty++) {
      const rowT = room.grid[ty];
      if (!rowT) continue;
      for (let tx = Math.max(0, x0); tx < Math.min(room.tilesX, x1); tx++) {
        const raw = rowT[tx];
        const id = raw & 0x7ffff;
        if (!id) continue;
        const sx = (id % cols) * (tileW + border * 2) + border;
        const sy = Math.floor(id / cols) * (tileH + border * 2) + border;
        const dx = world.x + tx * tileW, dy = world.y + ty * tileH;
        // GM tile flags: bit 28 mirror (x), bit 29 flip (y), bit 30
        // rotate 90° — dropping these is what mirrored the walls wrong.
        if (raw & 0x70000000) {
          g.save();
          g.translate(dx + tileW / 2, dy + tileH / 2);
          if (raw & 0x40000000) g.rotate(Math.PI / 2);
          g.scale(raw & 0x10000000 ? -1 : 1, raw & 0x20000000 ? -1 : 1);
          g.drawImage(tileset, sx, sy, tileW, tileH,
            -tileW / 2, -tileH / 2, tileW, tileH);
          g.restore();
        } else {
          g.drawImage(tileset, sx, sy, tileW, tileH, dx, dy, tileW, tileH);
        }
      }
    }
  }

  const onScreen = (x, y, w = 32, h = 32) =>
    x < PANE_X + PANE_W + 64 && x + w > PANE_X - 64 && y < PANE_Y + PANE_H + 64 && y + h > PANE_Y - 64;

  function drawSprite(name, index, x, y, { flipX = false, tint = null, alpha = 1 } = {}) {
    const meta = S.meta(name);
    if (!meta) return;
    let img = S.frame(name, Math.floor(index) % meta.frames);
    if (!img) return;
    if (tint) img = S.tinted(img, tint);
    g.save();
    if (alpha !== 1) g.globalAlpha = alpha;
    if (flipX) {
      g.translate(Math.round(x) + img.width * 2, Math.round(y));
      g.scale(-1, 1);
      g.drawImage(img, -meta.ox * 2, -meta.oy * 2, img.width * 2, img.height * 2);
    } else {
      g.drawImage(img, Math.round(x) - meta.ox * 2, Math.round(y) - meta.oy * 2,
        img.width * 2, img.height * 2);
    }
    g.restore();
  }

  function drawWorld() {
    g.fillStyle = room.bgColor;
    g.fillRect(PANE_X, PANE_Y, PANE_W, PANE_H);
    drawTiles();

    // Water regions (animated 32px cells), then falls, then floor props.
    for (const w of water) {
      if (w.type === 'shallow') {
        for (let i = 0; i < w.cols; i++) {
          for (let j = 0; j < w.rows; j++) {
            if (onScreen(w.x + i * 32, w.y + j * 32)) {
              drawSprite('spr_board_shallowwater', animClock * 0.125, w.x + i * 32, w.y + j * 32);
            }
          }
        }
      } else if (onScreen(w.x, w.y, 128, 128)) {
        // The ponds draw their own water then a border sprite.
        const dims = { oasis_sword: [4, 2], smallpond_sword: [4, 2], lancermoat_sword: [7, 1], b1powerpond: [2, 1] };
        const [cw, ch] = dims[w.type] ?? [2, 1];
        for (let i = 0; i < cw; i++) {
          for (let j = 0; j < ch; j++) {
            drawSprite('spr_board_shallowwater', animClock * 0.125, w.x + i * 32, w.y + j * 32);
          }
        }
        if (w.sprite && w.type !== 'b1powerpond') drawSprite(w.sprite, 0, w.x, w.y);
      }
    }
    for (const wf of waterfalls) {
      for (let i = 0; i < wf.cols; i++) {
        for (let j = 0; j < wf.rows; j++) {
          if (onScreen(wf.x + i * 32, wf.y + j * 32)) {
            drawSprite('spr_board_waterfall', animClock * 0.125, wf.x + i * 32, wf.y + j * 32);
          }
        }
      }
    }
    for (const p of props) {
      if (!onScreen(p.x, p.y)) continue;
      if (p.flip === undefined && p.sprite === 'spr_board_fern') {
        p.flip = Math.random() < 0.5;      // dir = choose(0, 1), per instance
      }
      drawSprite(p.sprite, p.imageIndex, p.x, p.y, { tint: p.color ?? null, flipX: !!p.flip });
    }
    for (const e of events) {
      // The visible set pieces; markers (spr_board_event etc.) stay unseen.
      if (e.fled) continue;                     // the tease, gone
      const visible = {
        sword_fakeentrance: 'spr_board_sword_fakeentrance',
        b1swordentrance: 'spr_board_downstairs',
        b2s_icedoor: 'spr_board_b2s_icedoor_outside',
        b2_bridgeoverlay: 'spr_board_b2_bridgeoverlay',
        ladder: 'spr_board_ladder',
        b3s_stanchion: 'spr_board_b3s_stanchion',
        dungeon3_tenna: 'spr_board_npc_tenna_back',
        '1_sword_shadowtease': 'spr_shadow_mantle_idle',
        treasure_room: 'spr_treasurebox',
        npc: 'spr_board_npc_pippins',
        doorAny: 'spr_doorAny',
      }[e.obj];
      if (visible && onScreen(e.x, e.y)) {
        const fixedFrame = ['b2s_icedoor', 'b3s_stanchion', 'treasure_room', 'doorAny'].includes(e.obj);
        drawSprite(visible, fixedFrame ? (e.imageIndex ?? 0) : animClock * 0.1, e.x, e.y);
      }
    }
    // Tenna, waiting with his back turned — until he makes his getaway.
    if (tenna && tenna.con < 4 && onScreen(tenna.marker.x, tenna.marker.y)) {
      drawSprite('spr_board_npc_tenna_back', 0, tenna.marker.x, tenna.marker.y);
    }
    // The Mantle fleeing upward, afterimages trailing.
    if (tease) {
      for (const tr of tease.trail) {
        if (tr.a > 0) drawSprite('spr_shadow_mantle_idle', animClock * 0.1, tr.x, tr.y, { alpha: Math.max(0, tr.a) * 0.5 });
      }
      if (tease.t < 60) drawSprite('spr_shadow_mantle_idle', animClock * 0.1, tease.e.x, tease.y);
    }
    for (const t of trees) {
      if (onScreen(t.x, t.y)) {
        drawSprite(t.cold ? 'spr_board_tree_cold' : 'spr_board_b1tree_left', t.cold ? t.frame : 0, t.x, t.y);
      }
    }
    for (const f of ferns) {
      if (f.dead || !onScreen(f.x, f.y)) continue;
      if (f.flip === undefined) f.flip = Math.random() < 0.5;   // dir = choose(0,1)
      drawSprite('spr_board_fern', f.imageIndex, f.x, f.y, { flipX: !!f.flip });
    }
    for (const c of cactus) {
      if (c.dead) continue;
      if (!onScreen(c.x, c.y)) continue;
      drawSprite(c.cc && c.cc.cold ? 'spr_board_cactus_cold' : 'spr_board_cactus', c.frame, c.x, c.y);
      const pulse = Math.abs(Math.sin(Math.floor(animClock / 6) / 3)) / 2;
      drawSprite('spr_board_cactus_spines', c.frame, c.x, c.y,
        { tint: pulse > 0.35 ? '#ffffff' : '#CBC83D' });
    }
    for (const d of docks) {
      if (onScreen(d.x, d.y)) drawSprite('spr_board_dock', 0, d.x, d.y);
    }
    for (const c of candies) {
      if (c.dropped && c.t > 120 && Math.floor(c.t / 4) % 2) continue;   // the blink
      drawSprite('spr_board_candy', 0, c.x, c.y);
    }
    for (const sw of switches) {
      if (onScreen(sw.x, sw.y)) drawSprite('spr_board_dungeon3_switch', sw.pressed || sw.used ? 1 : 0, sw.x, sw.y);
    }
    if (chest && !chest.taken && onScreen(chest.x, chest.y)) {
      drawSprite('spr_board_chest', 0, chest.x, chest.y);
    }
    if (pickup && !pickup.taken && !kris.sword) {
      // obj_board_pickup's Step: `if (type == "sword") sprite_index =
      // spr_board_sword` — all three levels' pickups carry type "sword" in
      // their creation code; the key art was the object's default sprite.
      if ((room.pickup.cc ?? {}).type === 'sword') {
        drawSprite('spr_board_sword', 0, pickup.x, pickup.y);
      } else {
        drawSprite('spr_board_key', Math.floor(animClock * 0.2) % 7, pickup.x, pickup.y);
      }
    }
    for (const b of boats) {
      if (b.gone) continue;
      const bobY = Math.abs(Math.sin(b.bob / 15) * 2);
      drawSprite('spr_board_raft', 0, b.x, b.y + bobY);
    }

    // The party, trailing behind (drawn under Kris, depth parent+5).
    for (let fi = followers.length - 1; fi >= 0; fi--) {
      const f = followers[fi];
      const t = trail[Math.min(f.delay, Math.max(0, trail.length - 1))];
      if (!t) continue;
      const name = `spr_board_${f.name}_walk_${FACE_NAME[t.facing]}`;
      const meta = S.meta(name);
      if (!meta) continue;
      const frame = t.moving ? Math.floor(animClock * 0.125) % meta.frames : 0;
      drawSprite(name, frame, t.x, t.y);
    }

    if (mantle) mantle.draw(g);
    // The walk's spotlight follows Kris (obj_board_shadowspotlight).
    if (room.number === 5 && !outro) {
      drawSprite('spr_board_shadow_spotlight', 0, kris.x - 16, kris.y - 16);
    }
    foes.draw(g, S);

    // Kris — on the raft, mid-swing, or walking.
    let frame, dx = 0, dy = 0;
    let name;
    if (kris.swordbuffer > 0) {
      name = `kris_strike_${FACE_NAME[kris.facing]}`;
      const idx = STRIKE_FRAME[kris.swordbuffer] ?? 0;
      const meta = S.meta(`spr_board_kris_strike_${FACE_NAME[kris.facing]}`);
      let img = S.frame(`spr_board_kris_strike_${FACE_NAME[kris.facing]}`, idx);
      if (img) {
        if (kris.blend === 'red') img = S.tinted(img, '#ff0000');
        [dx, dy] = STRIKE_OFFSET[kris.facing];
        g.drawImage(img, Math.round(kris.x) + dx, Math.round(kris.y) + dy,
          img.width * 2, img.height * 2);
        return;
      }
    }
    const walkName = `spr_board_kris_walk_${FACE_NAME[kris.facing]}`;
    let img = S.frame(walkName, Math.floor(kris.imageIndex) % 2);
    if (img) {
      if (kris.blend === 'red') img = S.tinted(img, '#ff0000');
      const bobY = kris.boat ? Math.abs(Math.sin(animClock / 15) * 2) - 6 : 0;
      g.drawImage(img, Math.round(kris.x), Math.round(kris.y) + bobY, KRIS_SIZE, KRIS_SIZE);
    }
  }

  /* The TV set: obj_gameshow_swordroute + obj_board_controller's Draw. */
  function drawTV() {
    // The colorchange merge, from the gameshow's Draw.
    if (tv.change > 0) {
      tv.color = mergeColor(tv.newColor, tv.color, tv.change / tv.changeTime);
      tv.change -= 1;
    }
    // The set art (330x250 at origin (5,5), scale 2 -> drawn at (-10,-10)).
    drawSprite('spr_gameshow_swordroutebg', 0, 0, 0);
    // The glow below the screen: additive, tinted screencolor, alpha 0.5.
    const glow = S.frame('spr_gameshow_swordroute_tvglow', 0);
    if (glow) {
      g.save();
      g.globalCompositeOperation = 'lighter';
      g.globalAlpha = 0.5;
      g.drawImage(S.tinted(glow, tv.color), 0, 320, glow.width * 2, glow.height * 2);
      g.restore();
    }
    // The Draw's black floor under everything past y 380.
    g.fillStyle = '#000';
    g.fillRect(0, 380, VIEW_W, VIEW_H - 380);
  }

  /* The HUD strip — event_user(0), gated on drawui. */
  function drawHUD() {
    g.fillStyle = '#000';
    g.fillRect(128, 32, 384, 32);
    if (!tv.drawui) return;
    font.draw(g, 'HP', 132, 40);
    const absolutemax = 32;
    const maxbar = 110 + 30 * (kris.swordlv - 1);
    const hp = Math.max(0, Math.min(kris.myhealth, kris.maxhealth));
    g.fillStyle = healthbarFlash > 0 ? 'rgba(255,0,0,1)' : 'rgba(255,255,255,0.25)';
    g.fillRect(166, 40, (kris.maxhealth / absolutemax) * maxbar, 14);
    g.fillStyle = healthbarFlash > 0 ? '#ff0000' : '#ffffff';
    g.fillRect(166, 40, (hp / absolutemax) * maxbar, 14);
    // The key icon, by the route counter: carried in level 2, spent in 3.
    if (room.number === 2) drawSprite('spr_board_ui_icekey', 0, 412, 38);
    if (room.number === 3) drawSprite('spr_board_ui_icekey', 1, 412, 38);
    if (kris.sword) {
      if (kris.swordlv < 4) {
        font.draw(g, 'L', 280, 40);
        font.draw(g, 'V', 294, 40);
        font.draw(g, String(kris.swordlv), 310, 40);
      } else {
        font.draw(g, 'MAX', 278, 40);
      }
      const maxxp = 66;
      let bar = Math.round(((kris.xp / kris.xptolevel) * maxxp) / 2) * 2;
      if (kris.swordlv >= 4) bar = maxxp;
      bar = Math.max(0, Math.min(maxxp, bar));
      g.fillStyle = 'rgba(255,255,255,0.25)';
      g.fillRect(328, 40, maxxp, 14);
      g.fillStyle = '#ffffff';
      g.fillRect(328, 40, bar, 14);
      for (let i = 0; i < Math.min(kris.swordlv, 4); i++) {
        drawSprite('spr_board_ui_sword', 0, 492 - 20 * i, 38);
      }
    }
  }

  function draw() {
    animClock += 1;
    g.fillStyle = '#000';
    g.fillRect(0, 0, VIEW_W, VIEW_H);

    g.save();
    g.beginPath();
    g.rect(PANE_X, PANE_Y, PANE_W, PANE_H);
    g.clip();
    drawWorld();
    // The warp fade covers the pane both ways.
    if (warp) {
      const a = warp.t < 10 ? warp.t / 10 : Math.max(0, 1 - (warp.t - 10) / 15);
      g.fillStyle = `rgba(0,0,0,${a})`;
      g.fillRect(PANE_X, PANE_Y, PANE_W, PANE_H);
    }
    if (intro) drawIntro();
    if (outro) {
      const a = Math.min(1, outro.t / 50);
      g.fillStyle = `rgba(0,0,0,${a})`;
      g.fillRect(PANE_X, PANE_Y, PANE_W, PANE_H);
    }
    if (keySeq) {
      // the icekey Draw's floods and the four-corner static
      const t = keySeq.t;
      if (t >= 90 && t < 150) {
        g.fillStyle = '#000';
        g.fillRect(PANE_X, PANE_Y - 32, PANE_W, PANE_H + 32);
        for (const [sx, sy] of [[64 + 64, 32 + 32], [64 + 64, 288], [320, 32 + 32], [320, 288]]) {
          const img = S.frame('spr_static_effect', Math.floor(t / 2) % (S.meta('spr_static_effect')?.frames ?? 1));
          if (img) { g.save(); g.globalAlpha = 0.25; g.drawImage(img, sx, sy, img.width * 2, img.height * 2); g.restore(); }
        }
      } else if (t >= 150 && t < 210) {
        g.fillStyle = '#1E76F0';
        g.fillRect(PANE_X, PANE_Y - 32, PANE_W, PANE_H + 32);
      } else if (t >= 210) {
        g.fillStyle = '#000';
        g.fillRect(PANE_X, PANE_Y - 32, PANE_W, PANE_H + 32);
      }
    }
    shopwriter.draw(g);
    writer.draw(g);
    g.restore();

    drawTV();
    drawHUD();
    if (crt) crt.apply(g, canvas);

    if (outro && outro.t > 60) {
      g.fillStyle = '#000';
      g.fillRect(0, 0, VIEW_W, VIEW_H);
      const label = {
        escape: 'ESCAPED', shelter: 'THE SHELTER OPENS', walk: 'THE HOLDER',
        mantle: 'THE MANTLE IS YOURS', finale: 'THE ROUTE IS COMPLETE',
        key: 'THE ICE KEY', deer: 'THE WAY OPENS',
      }[outro.kind] ?? 'LEVEL COMPLETE';
      font.draw(g, label, 320, 220, { align: 'center', scale: 2 });
    }

    if (death) {
      g.fillStyle = death.css;
      g.fillRect(0, 0, VIEW_W, VIEW_H);
      if (death.timer < 61) {
        const img = S.frame(`spr_board_kris_walk_${FACE_NAME[death.facing]}`, 0);
        if (img) g.drawImage(S.tinted(img, '#000000'), Math.round(kris.x), Math.round(kris.y), KRIS_SIZE, KRIS_SIZE);
      }
    }
  }

  /* ---------------- the clock ---------------- */
  let raf = 0, acc = 0, last = performance.now();
  function frame(now) {
    acc += now - last;
    last = now;
    let guard = 0;
    while (acc >= MS_PER_FRAME && guard++ < 8) {
      acc -= MS_PER_FRAME;
      if (death) {
        stepDeath();
        press1 = false;
        if (death.timer >= DEATH_END) restart();
        continue;
      }
      if (intro) { stepIntro(); press1 = false; continue; }
      if (outro) {
        // The end card holds; the loop stays alive so the page can move on.
        if (!outro.done) stepOutro();
        press1 = false;
        continue;
      }
      shopwriter.step();
      if (kpause > 0) {
        kpause -= 1;
        press1 = false;
        continue;
      }
      if (writer.active) {
        // global.interact = 1: the board halts around the text box; the
        // enemies keep wandering, exactly as in the game.
        writer.step(kris, press1);
        press1 = false;
        foes.step(kris);
        stepSetPieces();
        if (healthbarFlash > 0) healthbarFlash -= 1;
        continue;
      }
      stepShift();
      stepKris();
      stepBoats();
      stepTrail();
      stepAnim();
      // The interacts run BEFORE the swing — obj_mainchara_board's Step
      // gates the swing on `interacted == 0`, so Z at a door, chest, dock
      // or pond talks instead of swinging.
      stepPickup();
      stepWarps();
      stepSetPieces();
      stepSword();
      foes.step(kris);
      if (mantle) mantle.step();
      stepDamage();
      if (healthbarFlash > 0) healthbarFlash -= 1;
      press1 = false;
    }
    draw();
    raf = requestAnimationFrame(frame);
  }
  arrive();
  raf = requestAnimationFrame(frame);

  window.__board = {
    get kris() { return kris; },
    get shift() { return shift; },
    get warp() { return warp; },
    get world() { return world; },
    get health() { return kris.myhealth; },
    get sword() { return kris.sword; },
    set sword(v) { kris.sword = !!v; },
    get swordlv() { return kris.swordlv; },
    set swordlv(v) { kris.swordlv = v; },
    get xp() { return kris.xp; },
    get dying() { return death !== null; },
    get outro() { return outro; },
    get intro() { return intro; },
    get tv() { return tv; },
    get pickup() { return pickup; },
    get mantle() { return mantle; },
    get boats() { return boats; },
    get candies() { return candies; },
    get treeLoops() { return treeLoops; },
    solids,
    get foes() { return foes; },
    get violence() { return foes.violence; },
    set violence(v) { foes.violence = v; },
    audio,
    get crt() { return crt ? crt.state.enabled : false; },
    set crt(v) {
      if (crt) {
        crt.state.enabled = !!v;
        localStorage.setItem('eramsim.crt', v ? '1' : '0');
      }
    },
    swing() { press1 = true; },
    writer,   // debug: probe text-box behaviour (wrapping, pacing)
    /** Debug: jump to a screen. Same code path as a real warptouch. */
    warpTo(warpx, warpy, playerX, playerY) { startWarp({ warpx, warpy, playerX, playerY }); },
    skipIntro() { if (intro) { intro = null; tv.drawui = true; retint(INTRO_COLOR[room.number], 1); } },
    restart,
    press: (k, on = true) => { if (on) held.add(k); else held.delete(k); },
    stop() {
      cancelAnimationFrame(raf);
      audio.stopMusic();
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('keyup', onKeyUp);
    },
  };
  return window.__board;
}
