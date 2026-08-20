// THE BOARD'S ENEMIES — every kind the three sword levels place, at the
// game's own cadence.
//
// One spawner object carries the whole roster: `obj_board_enemy_spawner`'s
// user event 0 is a 21-branch dispatch on its own image_index, resolved
// into the level data by tools/build-levels.py. The sword levels place
// indices 0 (monster), 2 (yellow spear monster), 4 (flower), 6 (bluefish),
// 10 (lizard) and 13 (bluebird).
//
// LIFETIME — this is the part that was wrong before and is now read from
// obj_board_camera's Step directly: THE MOMENT A SHIFT BEGINS, EVERY ENEMY
// AND PROJECTILE IS DESTROYED (`with (obj_board_enemy_parent)
// instance_destroy()`, plus the long per-projectile list). At con 98 — the
// frame the shift lands — every spawner still alive that stands inside the
// PLAYER's bounds (128..480, 64..288) fires again. Enemies are strictly
// per-screen; only a KILLED spawner stays gone (the death handler destroys
// it with its enemy).
//
// CADENCE. Monster, bluefish and lizard run at HALF RATE: their Steps open
//
//     updatetimer++;
//     if (updatetimer == 2) { updatetimer = 0; exit; }
//
// so they act on every other frame — and everything inside (delay, timers,
// pixel-walks) counts acting frames, not real ones. The bluebird has the
// same gate with inverted polarity. THE FLOWER HAS NO GATE and runs every
// frame. Projectiles move only every third frame (their own
// `updatetimer == 3` pattern) at spd 8 (pellet) / 20 (spear).
//
// WHO CAN HURT YOU is three separate rules, none of them "violence" alone:
//   monster  — aggressive starts as obj_board_controller.violence, and the
//              monster's own Step forces `aggressive = true` (and, in level
//              1, active_hitbox = true, spd 3, image_speed 0.2) whenever
//              swordlv > 1. Type-0 monsters NEVER show the angry sprite:
//              the angry art is the spear telegraph (bulletimer >
//              shoot_wait_time), and only type 1 increments bulletimer.
//   flower   — level 1: armed only while swordlv > 1. Level 2: armed the
//              moment Kris HAS the sword, and sword_immunity_lv drops to 0.
//   bluefish — aggressive = violence at spawn (level 2: also once Kris has
//              the sword). In level 1 nothing ever arms the pond fish: they
//              dash, and the dash cannot hurt. That is the game's code.
//   lizard   — aggressive = violence; `if (!aggressive) dontmove = true` —
//              a docile lizard does not act at all.
//   bluebird — aggressive = violence, never overridden: in level 1 it is a
//              flying decoration you can (barely) kill.
//
// The contact hitbox is spr_hitbox_10px_center at per-kind scale, centred:
// monster/lizard/bluebird 20x20, bluefish 10x10, flower 2.5x2.5 (the
// flower's threat is its pellets, not its body).
//
// Constants cited inline; nothing tuned.

export const CELL = 32;
const AGGRO = 90;                 // distance_to_become_aggressive
const DEAGGRO = AGGRO - 20;       // the chase re-check gives up at 70
const SIZE = 32;                  // 16x16 art at scale 2

/** Enemy bounds from the tail of scr_board_enemy_hurt_state — applied on
 *  EVERY acting frame, and tighter than the player's own 128..480/64..288. */
const BOUNDS = { x1: 160, x2: 448, y1: 96, y2: 256 };

/** The player's bounds — the rect the spawn test uses. */
export const SPAWN_BOUNDS = { x1: 128, x2: 480, y1: 64, y2: 288 };

/** obj_board_enemy_contact_hitbox's Create. */
export const CONTACT_DAMAGE = 2;

const HITBOX = { monster: 20, lizard: 20, bluebird: 20, bluefish: 10, flower: 2.5,
  silentcat: 20, singingcat: 20, black_deer: 20, firebar: 0 };

// hitdir/movedir compass, matching the game: 0=right,1=up,2=left,3=down for
// enemy movedir; kris.facing is 0=down,1=right,2=up,3=left for knockback.
const MOVE = [[1, 0], [0, -1], [-1, 0], [0, 1]];
const FACE = [[0, 1], [1, 0], [0, -1], [-1, 0]];

export function createEnemies(level, opts = {}) {
  const solids = opts.solids ?? [];
  const fishSolids = opts.fishSolids ?? [];
  const rng = opts.rng ?? Math.random;
  const swordlv = opts.swordlv ?? (() => 1);
  const hasSword = opts.hasSword ?? (() => false);
  const onKill = opts.onKill ?? (() => {});
  const onCandy = opts.onCandy ?? (() => {});
  const snd = opts.snd ?? (() => {});
  let violence = opts.violence ?? false;
  // obj_board_controller.violence is LIVE state, not a spawn-time
  // snapshot: level 2's manager flips it on once Kris has the sword, and
  // every later per-screen spawn reads the new value.
  const violent = () => violence || (level.number === 2 && hasSword());

  const enemies = [];
  const projectiles = [];
  const fx = [];                       // defeat splashes
  const killedSpawners = new Set();

  const boxHits = (set, x, y, w = SIZE, h = SIZE) => set.some((s) =>
    x < s.x + s.w && x + w > s.x && y < s.y + s.h && y + h > s.y);

  /** GameMaker's distance_to_object: gap between bounding boxes, 0 on overlap. */
  function bboxDist(e, kris) {
    const dx = Math.max(0, Math.max(e.x - (kris.x + SIZE), kris.x - (e.x + SIZE)));
    const dy = Math.max(0, Math.max(e.y - (kris.y + SIZE), kris.y - (e.y + SIZE)));
    return Math.hypot(dx, dy);
  }

  /* ---------------- spawning ---------------- */

  function spawnVisible(spawners) {
    for (let i = 0; i < spawners.length; i++) {
      const sp = spawners[i];
      if (killedSpawners.has(i) || !sp.kind) continue;
      if (sp.x < SPAWN_BOUNDS.x1 || sp.x > SPAWN_BOUNDS.x2
        || sp.y < SPAWN_BOUNDS.y1 || sp.y > SPAWN_BOUNDS.y2) continue;
      if (!(sp.kind in HITBOX)) continue;      // cats/deer never placed here
      const e = {
        kind: sp.kind, variant: sp.variant ?? 0,
        spawnerIndex: i,
        x: sp.x, y: sp.y, px: sp.x, py: sp.y,
        hp: sp.hp ?? 1, maxhp: sp.hp ?? 1,
        immunity: sp.immunity ?? 1,
        blend: sp.blend ?? null,
        silverfish: sp.silverfish ?? false,   // spawner 7: the armored fish
        dontmove: sp.dontmove ?? false,       // spawner cc type 1: turret lizard
        damage: CONTACT_DAMAGE,
        ut: 0,                     // updatetimer
        state: 'move',
        movecon: 0, movetimer: 0, moveType: 0, movedir: Math.floor(rng() * 4),
        isMovingTimer: 0, path: null, pathI: 0,
        delay: 0, hurttimer: 0, hitdir: -1,
        aggressive: violent(),
        activeHitbox: violent(),
        spd: sp.spd ?? 3,
        imageIndex: 0, imageSpeed: 0.1,
        bulletimer: 0, bubbletimer: 0,
      };
      if (e.kind === 'monster') {
        // monster Create: bulletimer = choose(0,-10,10); level-1 slowdown.
        e.bulletimer = [0, -10, 10][Math.floor(rng() * 3)];
        if (level.number === 1 && e.variant === 0) e.spd = swordlv() > 1 ? 3 : 2;
      }
      if (e.kind === 'flower') {
        e.bubbletimer = -10 + Math.floor(rng() * 21);
        e.imageSpeed = 0.05;
        e.telegraph = 0;           // 0 idle, >0 telegraph frames left
      }
      if (e.kind === 'bluefish') {
        e.dashcon = 0; e.dashtimer = 0; e.spd = 3;
      }
      if (e.kind === 'lizard') {
        e.spd = sp.spd ?? 5;
        e.lastattack = 4; e.jumpedRecently = 0;
        e.bulletimer = [-30, -20, 10][Math.floor(rng() * 3)];
        e.jump = null;             // {startx,starty,tx,ty,t} while airborne
      }
      if (e.kind === 'silentcat') {
        // Dormant until both singing cats are dead (killedacatbefore == 2),
        // then wakes one-by-one and HOMES with accelerating velocity.
        e.aggressive = false; e.activeHitbox = false;
        e.hspd = 0; e.vspd = 0; e.homing = 0; e.wake = false; e.waketimer = 0;
        e.xstart = e.x;
      }
      if (e.kind === 'singingcat') {
        e.spd = 2; e.noteDir = 0; e.bubbletimer = 0;
        e.aggressive = true; e.activeHitbox = true;   // sings regardless
      }
      if (e.kind === 'black_deer') {
        e.spd = 1; e.activeHitbox = false;            // hp 999, harmless walker
      }
      if (e.kind === 'firebar') {
        // obj_fire_bar_base: five flames at len 0/20/40/60/80 spinning at
        // 12 deg per acting frame (its pieces rotate every 5th frame at
        // place_speed 12 — the composite cadence is kept).
        e.place = 0; e.activeHitbox = false;
      }
      if (e.kind === 'bluebird') {
        e.movetimer = -1; e.movespd = 1; e.con = 0; e.yoffset = -10;
        e.destx = e.x; e.desty = e.y; e.startx = e.x; e.starty = e.y;
        e.distance = 0; e.randprev = 0; e.ut = 1;   // inverted polarity
        e.imageSpeed = 0;
      }
      enemies.push(e);
    }
  }

  /** The camera's shift-start cleanup: everything dies, spawners persist. */
  function clearScreen() {
    enemies.length = 0;
    projectiles.length = 0;
    fx.length = 0;
  }

  function translate(dx, dy) {
    for (const e of enemies) { e.x += dx; e.y += dy; }
    for (const p of projectiles) { p.x += dx; p.y += dy; }
    for (const f of fx) { f.x += dx; f.y += dy; }
  }

  /* ---------------- pathfinding (mp_grid_path stand-in) ----------------
     A* over the same 32px cells, 4-directional, blocked where a Kris-solid
     covers the cell. Labelled approximation: the route has the same shape
     as mp_grid_path's, not necessarily the identical tie-break. */
  function cellBlocked(cx, cy) {
    const x = cx * CELL, y = cy * CELL;
    return boxHits(solids, x + 1, y + 1, CELL - 2, CELL - 2);
  }

  function findPath(x0, y0, x1, y1) {
    const key = (x, y) => `${x},${y}`;
    const open = [{ x: x0, y: y0, g: 0, f: Math.abs(x1 - x0) + Math.abs(y1 - y0) }];
    const came = new Map();
    const gs = new Map([[key(x0, y0), 0]]);
    const seen = new Set();
    let guard = 0;
    while (open.length && guard++ < 900) {
      open.sort((a, b) => a.f - b.f);
      const c = open.shift();
      const ck = key(c.x, c.y);
      if (seen.has(ck)) continue;
      seen.add(ck);
      if (c.x === x1 && c.y === y1) {
        const path = [];
        let k = ck;
        while (k) { const [px, py] = k.split(',').map(Number); path.unshift({ x: px, y: py }); k = came.get(k); }
        return path;
      }
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = c.x + dx, ny = c.y + dy;
        if (cellBlocked(nx, ny)) continue;
        const nk = key(nx, ny);
        const g = c.g + 1;
        if (g < (gs.get(nk) ?? Infinity)) {
          gs.set(nk, g);
          came.set(nk, ck);
          open.push({ x: nx, y: ny, g, f: g + Math.abs(x1 - nx) + Math.abs(y1 - ny) });
        }
      }
    }
    return null;
  }

  /* ---------------- shared: sword collision + hurt state ---------------- */

  /** scr_board_enemy_sword_collision, called on the enemy's acting frame. */
  function swordCollide(e, kris) {
    const hb = kris.swordhitbox;
    if (!hb || !hb.box || e.hurttimer !== 0) return;
    const b = hb.box;
    if (!(b.x < e.x + SIZE && b.x + b.w > e.x && b.y < e.y + SIZE && b.y + b.h > e.y)) return;
    const lv = swordlv();
    if (lv < e.immunity || e.blend === 'gray') {
      // The blade rings off: hurttimer only, no knockback, no damage.
      snd('snd_board_sword_metal');
      e.hitdir = -1;
      e.hurttimer = 10;
      return;
    }
    e.path = null; e.isMoving = false;
    e.hurttimer = 10;
    snd('snd_board_damage');
    e.activeHitbox = false;
    e.hitdir = kris.facing;
    e.angry = false;
    if (e.hp !== 999) e.hp -= 1;
  }

  /** scr_board_enemy_hurt_state, on the enemy's acting frame.
      Returns true if the enemy died and was removed. */
  function hurtState(e, kris, idx) {
    if (e.hurttimer > 0) {
      e.hurttimer -= 1;
      e.activeHitbox = false;
      if (e.hurttimer === 0 && e.hp !== e.maxhp) e.activeHitbox = true;
      if (e.hurttimer === 9 && e.hp <= 0) {
        fx.push({ x: e.x + 16, y: e.y + 16, t: 0, candy: rollCandy(kris) });
        snd('snd_board_kill');
        onKill(e);                       // kris.xp += xp_given (1)
        killedSpawners.add(e.spawnerIndex);
        enemies.splice(idx, 1);
        return true;
      }
      // Knocked back up to 20px per acting frame while hurttimer > 6,
      // one pixel at a time, stopping at the first wall.
      if (e.hurttimer > 6 && e.hitdir >= 0 && !(e.kind === 'lizard' && e.jump)) {
        const [kx, ky] = FACE[e.hitdir];
        for (let n = 0; n < 20; n++) {
          if (boxHits(e.wallSet ?? solids, e.x + kx, e.y + ky)) break;
          e.x += kx; e.y += ky;
        }
      }
    }
    // The clamp runs every call, hurt or not.
    e.x = Math.min(BOUNDS.x2, Math.max(BOUNDS.x1, e.x));
    e.y = Math.min(BOUNDS.y2, Math.max(BOUNDS.y1, e.y));
    return false;
  }

  /** The candy roll, verbatim from scr_board_enemy_hurt_state. */
  function rollCandy(kris) {
    let rate = 5;
    if (kris.myhealth < 8) rate += 20;
    if (kris.myhealth < 3) rate += 30;
    if (kris.myhealth === kris.maxhealth) rate = 0;
    const roll = Math.floor(rng() * 101) < rate;
    if (roll || (kris.monstersdefeated >= 6 && rate > 0)
      || (kris.monstersdefeated >= 3 && kris.myhealth < 3 && rate > 0)) {
      kris.monstersdefeated = 0;
      return true;
    }
    kris.monstersdefeated += 1;
    return false;
  }

  /* ---------------- the monster ---------------- */

  function stepMonster(e, kris, i) {
    e.ut += 1;
    if (e.ut === 2) { e.ut = 0; return false; }

    // room_board_1_sword rederives all of this every frame — for EVERY
    // monster, no variant gate (the game's room block has none; gating on
    // variant 0 left the spear monsters without a hitbox post-sword).
    if (level.number === 1) {
      if (swordlv() > 1) { e.imageSpeed = 0.2; e.spd = 3; e.activeHitbox = true; }
      else { e.imageSpeed = 0.1; e.spd = 2; }
    }
    if (swordlv() > 1) e.aggressive = true;
    let chase = true;
    if (!e.aggressive) { e.activeHitbox = false; chase = false; }

    if (e.delay > 0) {
      e.delay -= 1;
      e.movetimer = 0; e.movecon = 0;
      e.imageIndex += e.imageSpeed;
      return false;
    }

    const telegraphing = e.variant === 1 && e.bulletimer > 22;

    if (e.state === 'move' && e.hurttimer === 0) {
      if (e.movecon === 0) {
        if (kris.atdoorway || !chase) e.moveType = 0;
        if (e.moveType === 1) {
          // mp_grid_path to Kris's cell (his y biased +18, per the source).
          const tx = Math.floor(kris.x / CELL), ty = Math.floor((kris.y + 18) / CELL);
          const fx0 = Math.floor((e.x + 16) / CELL), fy0 = Math.floor((e.y + 16) / CELL);
          const p = findPath(fx0, fy0, tx, ty);
          if (p && p.length > 1) { e.path = p; e.pathI = 1; e.movecon = 1; }
          else e.moveType = 0;
        }
        if (e.moveType === 0) {
          e.movedir = Math.floor(rng() * 4);
          // the repeat(4) blocked-direction rotation
          for (let r = 0; r < 4; r++) {
            if (e.movedir === 0 && boxHits(solids, e.x + 32, e.y)) e.movedir = 1;
            if (e.movedir === 1 && boxHits(solids, e.x, e.y - 32)) e.movedir = 2;
            if (e.movedir === 2 && boxHits(solids, e.x - 32, e.y)) e.movedir = 3;
            if (e.movedir === 3 && boxHits(solids, e.x, e.y + 32)) e.movedir = 0;
          }
          e.movecon = 1;
        }
      }
      if (e.movecon === 1) {
        e.movetimer += 1;
        if (e.moveType === 0 && !telegraphing) {
          // The wander: spd 1px steps, bounce off walls and the enemy
          // bounds, stop on the next cell boundary and re-check aggro.
          let stop = false;
          for (let n = 0; n < e.spd && !stop; n++) {
            const [mx, my] = MOVE[e.movedir];
            e.x += mx; e.y += my;
            if (boxHits(solids, e.x, e.y)
              || e.x < BOUNDS.x1 || e.x > BOUNDS.x2 || e.y < BOUNDS.y1 || e.y > BOUNDS.y2) {
              e.x -= mx; e.y -= my;
              e.movedir = e.movedir === 0 ? 2 : e.movedir === 1 ? 3 : e.movedir === 2 ? 0 : 1;
            }
            const onCell = (e.movedir === 0 || e.movedir === 2) ? e.x % 32 === 0 : e.y % 32 === 0;
            if (onCell) {
              e.movecon = 0; e.movetimer = 0; stop = true;
              if (bboxDist(e, kris) < AGGRO && chase) e.moveType = 1;
            }
          }
        } else if (e.moveType === 1) {
          // The chase: walk the path at spd, re-path on the spd-keyed
          // timer, give up at DEAGGRO.
          e.isMovingTimer += 1;
          if (telegraphing || e.delay > 0) e.isMovingTimer -= 1;
          else if (e.path) {
            let left = e.spd;
            while (left > 0 && e.pathI < e.path.length) {
              const t = e.path[e.pathI];
              const txp = t.x * CELL, typ = t.y * CELL;
              const ddx = Math.sign(txp - e.x), ddy = Math.sign(typ - e.y);
              if (ddx === 0 && ddy === 0) { e.pathI += 1; continue; }
              e.x += ddx; e.y += ddy;
              left -= 1;
            }
          }
          const limit = e.spd === 2 ? 16 : e.spd === 3 ? 12 : e.spd === 4 ? 9 : 5;
          if (e.isMovingTimer >= limit) {
            e.x = Math.floor((e.x + 16) / CELL) * CELL;
            e.y = Math.floor((e.y + 16) / CELL) * CELL;
            e.movecon = 0; e.movetimer = 0; e.isMovingTimer = 0;
            e.path = null;
            if (bboxDist(e, kris) >= DEAGGRO) e.moveType = 0;
          }
        }
      }
    }

    swordCollide(e, kris);
    if (hurtState(e, kris, i)) return true;

    // The spear, type 1 only (obj_board_enemy_monster Step's bullet block).
    if (e.variant === 1 && e.movecon === 1 && e.hurttimer === 0 && kris.leftdoorway && chase) {
      e.bulletimer += 1;
      if (e.bulletimer >= 30) {
        e.bulletimer = [-20, -10, 0][Math.floor(rng() * 3)];
        // The probe rectangles, in source order — the LAST that contains
        // Kris wins: down, left, right, up.
        let dir = e.movedir;
        const k = kris;
        const inRect = (x1, y1, x2, y2) =>
          k.x + SIZE > Math.min(x1, x2) && k.x < Math.max(x1, x2)
          && k.y + SIZE > Math.min(y1, y2) && k.y < Math.max(y1, y2);
        if (inRect(e.x - 40, e.y, e.x + 72, e.y + 500)) dir = 3;
        if (inRect(e.x + 32, e.y - 40, e.x - 500, e.y + 72)) dir = 2;
        if (inRect(e.x, e.y - 40, e.x + 500, e.y + 72)) dir = 0;
        if (inRect(e.x - 40, e.y + 32, e.x + 72, e.y - 500)) dir = 1;
        const at = {
          3: [e.x + 16, e.y + 48, 270], 2: [e.x - 22, e.y + 16, 180],
          0: [e.x + 42, e.y + 16, 0], 1: [e.x + 16, e.y - 16, 90],
        }[dir];
        projectiles.push({
          kind: 'spear', x: at[0], y: at[1], px: at[0], py: at[1],
          angle: at[2], spd: 20, t: 0, ut: 0, damage: 1, active: true,
          destroyOnHit: false,
        });
        snd('snd_board_splash');
      }
    }

    e.imageIndex += e.imageSpeed;
    return false;
  }

  /* ---------------- the flower (no updatetimer — full rate) ---------------- */

  function stepFlower(e, kris, i) {
    // Arming, per room.
    if (level.number === 2) {
      e.immunity = 0;
      if (!e.activeHitbox && hasSword()) { e.activeHitbox = true; e.aggressive = true; }
      if (!hasSword()) e.activeHitbox = false;
    } else if (swordlv() === 1) {
      e.activeHitbox = false;
    } else {
      e.activeHitbox = true; e.aggressive = true;
    }

    const animate = level.number !== 1 || swordlv() > 1;
    if (animate) e.imageIndex += e.telegraph > 0 ? 1 / 3 : (Math.floor(rng() * 4) / 20);

    if (kris.leftdoorway && e.aggressive) {
      e.bubbletimer += 1;
      if (e.bubbletimer === 16) e.telegraph = 14;             // telegraph art
      if (e.telegraph > 0) e.telegraph -= 1;
      if (e.hurttimer === 0 && e.bubbletimer >= 30) {
        e.bubbletimer = [-30, -16, -60][Math.floor(rng() * 3)];
        const cx = e.x + 16, cy = e.y + 16;
        const ang = Math.atan2(-((kris.y + 16) - cy), (kris.x + 16) - cx) * 180 / Math.PI;
        projectiles.push({
          kind: 'pellet', x: cx, y: cy, px: cx, py: cy,
          angle: ang, spd: 8, t: 0, ut: 0, damage: 1, active: false,
          destroyOnHit: true,
        });
      }
    }

    swordCollide(e, kris);
    return hurtState(e, kris, i);
  }

  /* ---------------- the bluefish ---------------- */

  function stepBluefish(e, kris, i) {
    e.ut += 1;
    if (e.ut === 2) { e.ut = 0; return false; }
    e.wallSet = fishSolids.length ? fishSolids : solids;

    if (level.number === 2 && !e.aggressive && hasSword()) e.aggressive = true;

    const myCellY = Math.floor((e.y + 16) / CELL), krisCellY = Math.floor((kris.y + 16) / CELL);
    const myCellX = Math.floor((e.x + 16) / CELL), krisCellX = Math.floor((kris.x + 16) / CELL);

    if (e.state === 'move' && e.hurttimer === 0) {
      if (e.movecon === 0) {
        if (e.dashcon === 1) {
          // Recovery after a dash: ~15 acting frames.
          e.dashtimer += 1;
          if (e.dashtimer === 8) e.imageIndex = 0;
          if (e.dashtimer > 15) { e.dashcon = 0; e.dashtimer = 0; }
        } else {
          if (e.moveType === 0) {
            e.spd = 3;
            let dashing = false;
            // Row-aligned: needs aggressive. Column-aligned: needs
            // swordlv > 1. The line test resolves to obj_nothing in the
            // sword rooms — alignment alone is enough.
            if (myCellY === krisCellY && !kris.atdoorway && e.aggressive) {
              e.movedir = e.x < kris.x ? 0 : 2;
              dashing = true;
            } else if (myCellX === krisCellX && !kris.atdoorway && swordlv() > 1) {
              e.movedir = e.y < kris.y ? 3 : 1;
              dashing = true;
            }
            if (dashing) {
              e.moveType = 1; e.spd = 15; e.imageIndex = 1;
              snd('snd_wallclaw');
            } else {
              e.movedir = Math.floor(rng() * 4);
              for (let r = 0; r < 4; r++) {
                if (e.movedir === 0 && boxHits(e.wallSet, e.x + 32, e.y)) e.movedir = 1;
                if (e.movedir === 1 && boxHits(e.wallSet, e.x, e.y - 32)) e.movedir = 2;
                if (e.movedir === 2 && boxHits(e.wallSet, e.x - 32, e.y)) e.movedir = 3;
                if (e.movedir === 3 && boxHits(e.wallSet, e.x, e.y + 32)) e.movedir = 0;
              }
            }
          }
          e.movecon = 1;
        }
      }
      if (e.movecon === 1) {
        let stop = false;
        for (let n = 0; n < e.spd && !stop; n++) {
          const [mx, my] = MOVE[e.movedir];
          e.x += mx; e.y += my;
          if (boxHits(e.wallSet, e.x, e.y)
            || e.x < BOUNDS.x1 || e.x > BOUNDS.x2 || e.y < BOUNDS.y1 || e.y > BOUNDS.y2) {
            if (e.moveType === 1) {
              // A dash ends on the wall: snap to the cell and recover.
              e.x -= mx; e.y -= my;
              e.x = Math.round(e.x / 32) * 32; e.y = Math.round(e.y / 32) * 32;
              e.movecon = 0; e.moveType = 0; e.dashcon = 1;
              stop = true; break;
            }
            e.x -= mx; e.y -= my;
            e.movedir = e.movedir === 0 ? 2 : e.movedir === 1 ? 3 : e.movedir === 2 ? 0 : 1;
          }
          const onCell = (e.movedir === 0 || e.movedir === 2) ? e.x % 32 === 0 : e.y % 32 === 0;
          if (onCell) { e.movecon = 0; stop = true; }
        }
      }
    }

    swordCollide(e, kris);
    return hurtState(e, kris, i);
  }

  /* ---------------- the lizard ---------------- */

  function stepLizard(e, kris, i) {
    e.ut += 1;
    if (e.ut === 2) { e.ut = 0; return false; }
    if (e.jumpedRecently > 0) e.jumpedRecently -= 1;
    if (!e.aggressive && level.number === 2 && hasSword()) { e.aggressive = true; e.activeHitbox = true; }
    const dontmove = !e.aggressive || e.dontmove;

    if (e.state === 'move' && !dontmove) {
      if (e.movecon === 0 && e.hurttimer === 0) {
        let rand;
        if (e.lastattack === 4) rand = 1;
        else if (e.lastattack === 1) rand = [1, 2, 3][Math.floor(rng() * 3)];
        else if (e.lastattack === 2) rand = [1, 3][Math.floor(rng() * 2)];
        else rand = [1, 2][Math.floor(rng() * 2)];
        if (e.jumpedRecently > 0) rand = [1, 2][Math.floor(rng() * 2)];
        if (!kris.leftdoorway && rand === 3) rand = 2;
        if (rand === 3 && enemies.some((o) => o.kind === 'lizard' && o.movecon === 3)) rand = 1;
        if (rand === 1) {
          e.movedir = Math.floor(rng() * 4);
          for (let r = 0; r < 4; r++) {
            if (e.movedir === 0 && boxHits(solids, e.x + 32, e.y)) e.movedir = 1;
            if (e.movedir === 1 && boxHits(solids, e.x, e.y - 32)) e.movedir = 2;
            if (e.movedir === 2 && boxHits(solids, e.x - 32, e.y)) e.movedir = 3;
            if (e.movedir === 3 && boxHits(solids, e.x, e.y + 32)) e.movedir = 0;
          }
        }
        if (rand === 3) {
          // The jump: pick a free cell in the 11x3 grid at (128,128), red
          // reticle, arc over ~32 acting frames.
          const cells = [];
          for (let cx = 0; cx < 11; cx++) {
            for (let cy = 0; cy < 3; cy++) {
              const wx = 128 + cx * 32, wy = 128 + cy * 32;
              if (!boxHits(solids, wx, wy, 1, 1)) cells.push([wx, wy]);
            }
          }
          if (cells.length) {
            const [tx, ty] = cells[Math.floor(rng() * cells.length)];
            e.jump = { sx: e.x, sy: e.y, tx, ty, t: 0 };
            for (const o of enemies) if (o.kind === 'lizard') o.jumpedRecently = 50;
            snd('snd_board_throw');
          } else rand = 1;
        }
        e.movecon = rand;
        e.lastattack = rand;
        e.movetimer = 0;
      }
      if (e.movecon === 1 && e.hurttimer === 0) {
        e.movetimer += 1;
        let stop = false;
        for (let n = 0; n < e.spd && !stop; n++) {
          const [mx, my] = MOVE[e.movedir];
          e.x += mx; e.y += my;
          if (e.movedir === 0) e.faceRight = true;
          if (e.movedir === 2) e.faceRight = false;
          if (boxHits(solids, e.x, e.y)
            || e.x < BOUNDS.x1 || e.x > BOUNDS.x2 || e.y < BOUNDS.y1 || e.y > BOUNDS.y2) {
            e.x -= mx; e.y -= my;
            e.movedir = e.movedir === 0 ? 2 : e.movedir === 1 ? 3 : e.movedir === 2 ? 0 : 1;
          }
          const onCell = (e.movedir === 0 || e.movedir === 2) ? e.x % 32 === 0 : e.y % 32 === 0;
          if (onCell) { e.movecon = 0; e.movetimer = 0; stop = true; }
        }
      }
      if (e.movecon === 2 && e.hurttimer === 0) {
        // The idle shuffle: face-flips for 15 acting frames.
        e.movetimer += 1;
        if (e.movetimer % 6 === 0) e.faceRight = rng() < 0.5;
        if (e.movetimer === 15) { e.movecon = 0; e.movetimer = 0; }
      }
      if (e.movecon === 3 && e.jump) {
        e.jump.t += 2;
        const t = e.jump.t;
        e.faceRight = e.jump.sx < e.jump.tx;
        if (t <= 60) {
          const f = t / 64;
          e.x = e.jump.sx + (e.jump.tx - e.jump.sx) * f;
          e.y = e.jump.sy + (e.jump.ty - e.jump.sy) * f
            + (-15 + Math.sin(t / 19) * 50 * -1);
        }
        if (t >= 62) {
          snd('snd_bump');
          e.x = e.jump.tx; e.y = e.jump.ty;
          e.jump = null; e.movecon = 0; e.movetimer = 0;
          for (const o of enemies) if (o.kind === 'lizard') o.jumpedRecently = 50;
        }
      }
    }

    swordCollide(e, kris);
    if (hurtState(e, kris, i)) return true;

    // A hit knocks it out of whatever it was doing (except mid-jump).
    if (e.hurttimer > 0 && e.movecon !== 0 && e.movecon !== 3) {
      e.movetimer = 0; e.movecon = 0; e.jump = null;
    }

    // The pellet: type 0, at rest, player on screen. A dontmove lizard
    // still FIRES — the game's own gate is `bulletimer >= 28 && !dontmove
    // || bulletimer >= 50 && dontmove` (a slower turret, not a statue).
    if (e.hurttimer === 0 && e.movecon !== 3 && e.variant === 0 && kris.leftdoorway) {
      e.bulletimer += 1;
      if (e.bulletimer >= (dontmove ? 50 : 28)) {
        e.faceRight = e.x < kris.x;
        const bx = e.faceRight ? e.x + 24 : e.x + 8, by = e.y + 7;
        const ang = Math.atan2(-((kris.y + 16) - by), (kris.x + 16) - bx) * 180 / Math.PI;
        projectiles.push({
          kind: 'pellet', x: bx, y: by, px: bx, py: by,
          angle: ang, spd: 8, t: 0, ut: 0, damage: 1, active: false,
          destroyOnHit: true,
        });
        e.bulletimer = [-50, -25, 0][Math.floor(rng() * 3)];
      }
    } else if (!(e.hurttimer === 0 && e.movecon !== 3)) {
      e.bulletimer = 0;
    }

    e.imageIndex += 0.1;
    return false;
  }

  /* ---------------- the bluebird ---------------- */

  const BIRD_SPOTS = [[448, 256], [160, 256], [160, 96], [448, 96], [256, 160], [352, 192]];

  function stepBluebird(e, kris, i) {
    e.ut += 1;
    if (e.ut === 2) e.ut = 0;
    else return false;                    // inverted: acts every 2nd frame

    // Only hittable near the ground (yoffset > -15).
    if (e.yoffset > -15) swordCollide(e, kris);
    if (hurtState(e, kris, i)) return true;

    if (e.movetimer < 0) {
      // Grounded: crouch, hop, and pick the next spot at -1.
      const t = e.movetimer;
      if (t > -50 && t < -30) { e.imageIndex += (t + 30) / -20 * 0.2 + 0.2; e.yoffset = Math.round(((t + 30) / -20) * -24 / 2) * 2; }
      if (t >= -30 && t < -20) e.imageIndex = 1;
      if (t > -20 && t < 0) e.imageIndex += 0.3;
      if (t > -10 && t < 0) e.yoffset = Math.round(((t / -10) * -24) / 2) * 2 * -1 - 24 || 0;
      if (t >= -10) e.yoffset = Math.round((-24 * (t / -10)) / 2) * 2;
      if (t === -1) {
        e.startx = e.x; e.starty = e.y;
        let rand = Math.floor(rng() * 6);
        if (rand === e.randprev) rand = (rand + 1) % 6;
        e.randprev = rand;
        [e.destx, e.desty] = BIRD_SPOTS[rand];
        e.distance = Math.hypot(e.destx - e.startx, e.desty - e.starty) / 5.3;
        e.con = 0; e.movespd = 0;
      }
      e.movetimer += 1;
    } else {
      if (e.con === 0 && e.movespd < 2) e.movespd += 0.1;
      if (e.con === 1 && e.movespd > 0.3) e.movespd -= 0.1;
      if (e.movetimer >= e.distance - 11 * e.movespd) e.con = 1;
      e.movetimer += e.movespd;
      e.imageIndex += 1;
      e.yoffset = -24;
      if (e.movetimer > e.distance) e.movetimer = e.distance;
      const f = e.distance > 0 ? e.movetimer / e.distance : 1;
      e.x = e.startx + (e.destx - e.startx) * f;
      e.y = e.starty + (e.desty - e.starty) * f;
      if (e.movetimer >= e.distance) {
        e.movetimer = -50; e.con = 0; e.movespd = 0; e.imageIndex = 0; e.yoffset = 0;
      }
    }
    return false;
  }

  /* ---------------- the cats, the deer, the fire bar ---------------- */

  let killedCats = 0;                    // obj_board_controller.killedacatbefore

  function stepSilentcat(e, kris, i) {
    swordCollide(e, kris);               // only bites while aggressive in-game;
    if (hurtState(e, kris, i)) { killedCats += 0; return true; }
    e.ut += 1;
    if (e.ut === 2) e.ut = 0; else return false;
    e.x += e.hspd; e.y += e.vspd;
    if (kris.leftdoorway) {
      const singing = enemies.some((o) => o.kind === 'singingcat');
      if ((killedCats >= 2 || e.justgo) && !e.aggressive && !e.wake && !singing) {
        e.wake = true;
        for (const o of enemies) if (o.kind === 'silentcat' && o !== e) o.wakeDelay = 22;
      }
      if (e.wakeDelay > 0) { e.wakeDelay -= 1; e.wake = false; }
      if (e.wake) {
        e.waketimer += 1;
        if (e.waketimer === 7) snd('snd_wing', { pitch: 1.2 });
        e.x = e.xstart + (e.waketimer % 2 === 0 ? 2 : -2);
        if (e.waketimer === 8) { e.wake = false; e.aggressive = true; e.activeHitbox = true; }
      }
      if (e.aggressive) {
        const dir = Math.atan2(-((kris.y + 16) - (e.y + 16)), (kris.x + 16) - (e.x + 16));
        e.vspd += -Math.sin(dir) * e.homing;
        e.hspd += Math.cos(dir) * e.homing;
        if (e.vspd > 10) e.vspd = 10;
        if (e.hspd > 10) e.hspd = 10;
        e.homing = Math.min(2.4, e.homing + 0.4);
        e.imageIndex = 1;
      }
    }
    return false;
  }

  function stepSingingcat(e, kris, i) {
    e.ut += 1;
    if (e.ut === 2) { e.ut = 0; return false; }
    // wanders like a monster at spd 2
    if (e.hurttimer === 0) {
      if (e.movecon === 0) {
        e.movedir = Math.floor(rng() * 4);
        for (let r = 0; r < 4; r++) {
          if (e.movedir === 0 && boxHits(solids, e.x + 32, e.y)) e.movedir = 1;
          if (e.movedir === 1 && boxHits(solids, e.x, e.y - 32)) e.movedir = 2;
          if (e.movedir === 2 && boxHits(solids, e.x - 32, e.y)) e.movedir = 3;
          if (e.movedir === 3 && boxHits(solids, e.x, e.y + 32)) e.movedir = 0;
        }
        e.movecon = 1;
      }
      if (e.movecon === 1) {
        let stop = false;
        for (let n = 0; n < e.spd && !stop; n++) {
          const [mx, my] = MOVE[e.movedir];
          e.x += mx; e.y += my;
          if (boxHits(solids, e.x, e.y)
            || e.x < BOUNDS.x1 || e.x > BOUNDS.x2 || e.y < BOUNDS.y1 || e.y > BOUNDS.y2) {
            e.x -= mx; e.y -= my;
            e.movedir = e.movedir === 0 ? 2 : e.movedir === 1 ? 3 : e.movedir === 2 ? 0 : 1;
          }
          const onCell = (e.movedir === 0 || e.movedir === 2) ? e.x % 32 === 0 : e.y % 32 === 0;
          if (onCell) { e.movecon = 0; stop = true; }
        }
      }
    }
    swordCollide(e, kris);
    const wasAlive = enemies.includes(e);
    if (hurtState(e, kris, i)) {
      // killedacatbefore++, and the silent cats stir
      killedCats += 1;
      for (const o of enemies) if (o.kind === 'silentcat') { o.justgo = true; }
      return true;
    }
    // the song: a rotating note every 5 acting frames
    e.bubbletimer += 1;
    if (e.bubbletimer >= 5 && kris.leftdoorway && e.hurttimer === 0) {
      e.bubbletimer = 0;
      projectiles.push({
        kind: 'note', x: e.x + 16, y: e.y + 20, px: e.x + 16, py: e.y + 20,
        savex: e.x + 16, savey: e.y + 20,
        angle: e.noteDir, spd: 0, len: 20, lenSpeed: 5,
        t: 0, ut: 0, damage: 1, active: false, destroyOnHit: false,
      });
      e.noteDir += 30;
    }
    e.imageIndex += 0.1;
    return false;
  }

  function stepBlackDeer(e, kris, i) {
    if (e.playerControlled) {
      // the host drives it; hazards still land (hp 1 hands control back)
      if (hurtState(e, kris, i)) return true;
      return false;
    }
    e.ut += 1;
    if (e.ut === 2) { e.ut = 0; return false; }
    swordCollide(e, kris);               // hp 999: the blade only stuns it
    if (hurtState(e, kris, i)) return true;
    // A slow wanderer (its full switch-pushing puzzle is not reproduced;
    // labelled in the docs).
    if (e.movecon === 0) { e.movedir = Math.floor(rng() * 4); e.movecon = 1; e.movetimer = 0; }
    if (e.movecon === 1) {
      const [mx, my] = MOVE[e.movedir];
      if (!boxHits(solids, e.x + mx * e.spd, e.y + my * e.spd)
        && e.x >= BOUNDS.x1 && e.x <= BOUNDS.x2 && e.y >= BOUNDS.y1 && e.y <= BOUNDS.y2) {
        e.x += mx * e.spd; e.y += my * e.spd;
      }
      e.movetimer += 1;
      if (e.movetimer > 32) e.movecon = 0;
    }
    e.imageIndex += 0.1;
    return false;
  }

  function stepFirebar(e) {
    // pieces rotate every 5th frame at 12 degrees — composite: 2.4/frame
    e.place += 2.4;
  }

  /* ---------------- projectiles ---------------- */

  function stepProjectiles() {
    for (let i = projectiles.length - 1; i >= 0; i--) {
      const p = projectiles[i];
      p.t += 1;
      if ((p.kind === 'pellet' || p.kind === 'note') && p.t === 5) p.active = true;
      if ((p.kind === 'pellet' && p.t >= 160) || (p.kind === 'spear' && p.t >= 30)
        || (p.kind === 'note' && p.t >= 120)) {
        projectiles.splice(i, 1); continue;
      }
      p.ut += 1;
      if (p.ut === 3) p.ut = 0;
      else continue;                     // moves every third frame
      p.px = p.x; p.py = p.y;
      if (p.kind === 'note') {
        // the spiral: x = savex + lengthdir(len, place); len += len_speed
        const rad = p.angle * Math.PI / 180;
        p.x = p.savex + Math.cos(rad) * p.len;
        p.y = p.savey - Math.sin(rad) * p.len;
        p.len += p.lenSpeed;
        continue;
      }
      const rad = p.angle * Math.PI / 180;
      p.x += Math.cos(rad) * p.spd;
      p.y -= Math.sin(rad) * p.spd;      // GM y is inverted in lengthdir
    }
  }

  /* ---------------- the public surface ---------------- */

  function step(kris) {
    for (let i = enemies.length - 1; i >= 0; i--) {
      const e = enemies[i];
      e.px = e.x; e.py = e.y;
      if (e.kind === 'monster') stepMonster(e, kris, i);
      else if (e.kind === 'flower') stepFlower(e, kris, i);
      else if (e.kind === 'bluefish') stepBluefish(e, kris, i);
      else if (e.kind === 'lizard') stepLizard(e, kris, i);
      else if (e.kind === 'bluebird') stepBluebird(e, kris, i);
      else if (e.kind === 'silentcat') stepSilentcat(e, kris, i);
      else if (e.kind === 'singingcat') stepSingingcat(e, kris, i);
      else if (e.kind === 'black_deer') stepBlackDeer(e, kris, i);
      else if (e.kind === 'firebar') stepFirebar(e);
    }
    stepProjectiles();
    for (let i = fx.length - 1; i >= 0; i--) {
      const f = fx[i];
      f.t += 0.3;
      if (f.t >= 3) {
        if (f.candy) onCandy(f.x - 16, f.y - 16);
        fx.splice(i, 1);
      }
    }
  }

  /** The hazard Kris is touching, if any: enemy contact boxes first, then
   *  live projectiles. Returns {damage, px, py, projectile?} or null. */
  // `hb` is Kris's HURTBOX (his lower-half mask, built by the board), not
  // his full cell. Every hazard box is its sprite's bbox at xscale 2.
  function touching(hb) {
    const hbR = hb.x + (hb.w ?? SIZE), hbB = hb.y + (hb.h ?? SIZE);
    for (const e of enemies) {
      if (e.kind === 'firebar') {
        // five flames at len 0..80, damage 1.
        // spr_board_fire bbox [4,8,9,12] origin (7,7) x2 -> low-riding 12x10
        for (let n = 0; n < 5; n++) {
          const len = n * 20;
          const fx0 = e.x + Math.cos(e.place * Math.PI / 180) * len;
          const fy0 = e.y - Math.sin(e.place * Math.PI / 180) * len;
          if (hb.x < fx0 + 6 && hbR > fx0 - 6
            && hb.y < fy0 + 12 && hbB > fy0 + 2) {
            return { damage: 1, px: fx0, py: fy0 };
          }
        }
        continue;
      }
      if (!e.activeHitbox || e.hurttimer > 0) continue;
      if (e.kind === 'bluebird' && e.yoffset <= -15) continue;
      const half = (HITBOX[e.kind] ?? 20) / 2;
      const hx = e.x + 16 - half, hy = e.y + 16 - half, hs = half * 2;
      if (hb.x < hx + hs && hbR > hx && hb.y < hy + hs && hbB > hy) return e;
    }
    for (let i = projectiles.length - 1; i >= 0; i--) {
      const p = projectiles[i];
      if (!p.active) continue;
      // spear [3,6,12,9] o(8,8) -> 20x8; note [10,10,12,12] o(12,12) at
      // xscale 1 -> 3x3; smallbullet (pellets) [3,3,4,4] o(4,4) -> 4x4
      const [pw, ph] = p.kind === 'spear' ? [10, 4] : p.kind === 'note' ? [1.5, 1.5] : [2, 2];
      if (hb.x < p.x + pw && hbR > p.x - pw
        && hb.y < p.y + ph && hbB > p.y - ph) {
        if (p.destroyOnHit) projectiles.splice(i, 1);
        return p;
      }
    }
    return null;
  }

  /** The post-hit stun: the game stuns the monster NEAREST Kris. */
  function stun(kris) {
    let best = null, bestd = Infinity;
    for (const e of enemies) {
      if (e.kind !== 'monster') continue;
      const d = Math.hypot((kris.x + 16) - (e.x + 16), (kris.y + 16) - (e.y + 16));
      if (d < bestd) { bestd = d; best = e; }
    }
    if (best) { best.delay = best.variant === 2 ? 30 : 10; best.movetimer = 0; best.movecon = 0; }
  }

  function reset() {
    clearScreen();
    killedSpawners.clear();
  }

  /* ---------------- drawing ---------------- */

  function draw(g, S) {
    // S = the sprite atlas: S.frame(name, index) -> canvas/image or null.
    for (const p of projectiles) {
      const name = p.kind === 'spear' ? 'spr_board_spear'
        : p.kind === 'note' ? 'spr_musical_notes' : 'spr_board_smallbullet';
      const f = S.frame(name, Math.floor(p.t / 3) % 2);
      if (!f) continue;
      // notes are image_xscale 1 in their Create (24px art drawn as-is);
      // everything else on the board is the usual x2
      const scale = p.kind === 'note' ? 1 : 2;
      g.save();
      g.translate(Math.round(p.x), Math.round(p.y));
      if (p.kind === 'spear') g.rotate(-p.angle * Math.PI / 180);
      g.drawImage(f, -f.width * scale / 2, -f.height * scale / 2, f.width * scale, f.height * scale);
      g.restore();
    }
    for (const e of enemies) {
      let name, flip = false, tint = null;
      if (e.kind === 'monster') {
        // The angry art is the spear telegraph, not the chase.
        const angry = e.variant === 1 && e.bulletimer > 22;
        name = angry ? 'spr_board_monster_angery_outline_docile' : 'spr_board_monster_outline_docile';
        if (e.blend === 'yellow') tint = '#ffff00';
        if (e.blend === 'orange') tint = '#ffa500';
        if (e.blend === 'gray') tint = '#808080';
      } else if (e.kind === 'flower') {
        name = e.telegraph > 0 ? 'spr_board_flower_telegraph_alt' : 'spr_board_flower_alt';
        if (level.number === 2) name = e.telegraph > 0 ? 'spr_board_flower_telegraph' : 'spr_board_flower';
      } else if (e.kind === 'bluefish') {
        // spawner 7's fish is the SILVERFISH — its own armored sprite set
        const pre = e.silverfish ? 'spr_board_silverfish_' : 'spr_board_bluefish_';
        name = [pre + 'r', pre + 'u', pre + 'l', pre + 'd'][e.movedir];
      } else if (e.kind === 'lizard') {
        name = e.faceRight ? 'spr_board_lizard_r' : 'spr_board_lizard_l';
      } else if (e.kind === 'silentcat') {
        name = 'spr_board_cat_silent';
      } else if (e.kind === 'singingcat') {
        name = 'spr_board_cat_singing';
      } else if (e.kind === 'black_deer') {
        name = 'spr_board_deer_r_black';
      } else if (e.kind === 'firebar') {
        for (let n = 0; n < 5; n++) {
          const len = n * 20;
          const fx0 = e.x + Math.cos(e.place * Math.PI / 180) * len;
          const fy0 = e.y - Math.sin(e.place * Math.PI / 180) * len;
          const img = S.frame('spr_shadow_mantle_fire', Math.floor(e.imageIndex + n) % 2);
          if (img) g.drawImage(img, Math.round(fx0) - 14, Math.round(fy0) - 14, img.width * 2, img.height * 2);
        }
        e.imageIndex += 0.25;
        continue;
      } else if (e.kind === 'bluebird') {
        const sh = S.frame('spr_bluebird_shadow', 0);
        if (sh) g.drawImage(sh, Math.round(e.x), Math.round(e.y) + 24, sh.width * 2, sh.height * 2);
        name = 'spr_board_blue_bird';
      }
      const meta = S.meta(name);
      const frames = meta ? meta.frames : 2;
      let img = S.frame(name, Math.floor(e.imageIndex) % frames);
      if (!img) continue;
      if (tint) img = S.tinted(img, tint);
      const dy = e.kind === 'bluebird' ? e.yoffset : 0;
      g.drawImage(img, Math.round(e.x) - (meta ? meta.ox * 2 : 0),
        Math.round(e.y) + dy - (meta ? meta.oy * 2 : 0),
        img.width * 2, img.height * 2);
      // The hurt overlay: hurt_sprite every second hurt frame.
      if (e.hurttimer > 0 && e.hurttimer % 2 === 0) {
        const hurtName = {
          monster: 'spr_board_monster_hurt', flower: 'spr_board_flower_hurt',
          bluefish: 'spr_board_monster_hurt',
          lizard: e.faceRight ? 'spr_board_lizard_r_hurt' : 'spr_board_lizard_l_hurt',
          bluebird: 'spr_board_blue_bird_hurt',
          silentcat: 'spr_board_flower_hurt', singingcat: 'spr_board_cat_singing_hurt',
          black_deer: 'spr_board_monster_hurt',
        }[e.kind];
        const hf = S.frame(hurtName, Math.floor(e.imageIndex) % 2);
        if (hf) g.drawImage(hf, Math.round(e.x), Math.round(e.y) + dy, hf.width * 2, hf.height * 2);
      }
    }
    for (const f of fx) {
      const img = S.frame('spr_board_enemydefeatsplash', Math.floor(f.t));
      if (img) g.drawImage(img, Math.round(f.x) - 16, Math.round(f.y) - 16, 32, 32);
    }
  }

  /** The defeat splash, for anything outside the roster that dies to the
   *  sword (trees, ferns, the party). */
  function splashAt(x, y) {
    fx.push({ x, y, t: 0, candy: false });
    snd('snd_board_kill');
  }

  return {
    enemies, projectiles,
    spawnVisible, clearScreen, translate, step, touching, stun, draw, reset, splashAt,
    get violence() { return violence; },
    set violence(v) { violence = !!v; },
    get count() { return enemies.length; },
  };
}
