


import { spawn, destroy } from '../entity.js';
import { BATTLEBG_MASK, HEART_RECT } from '../masks.js';
import { KNIGHT_AT } from '../knight.js';
import { soul } from '../soul.js';
import { SOUL_START, PARTY } from '../actors.js';
import { boxsplitterAttack } from '../attacks/boxsplitter-attack.js';
import { pointingCone } from '../attacks/pointing-cone.js';
import { starsController } from '../attacks/stars-controller.js';
import { spawnRotatingSlash } from '../attacks/rotating-slash.js';
import { swordTunnelManager } from '../attacks/sword-tunnel.js';
import { swordVortexManager } from '../attacks/sword-vortex.js';
import { trackingSwordsManager } from '../attacks/tracking-swords.js';
import { diagonalBulletManager } from '../attacks/diagonal-bullets.js';
import { knightStream } from '../attacks/knight-stream.js';
import { knightSwordfall } from '../attacks/swordfall.js';
import { launchUnderbox } from '../attacks/underbox.js';
import { launchKnightlines } from '../attacks/knightlines.js';
import { launchSwordslash } from '../attacks/swordslash.js';
import { launchCombination } from '../attacks/combination.js';
import { launchSwordTunnelRevised } from '../attacks/sword-tunnel-revised.js';
import { roaring2 } from '../attacks/roaring.js';
import { gmlIrandom, gmlCreate, gmlChoose, gmlRandom } from '../rng.js';
import { KNIGHT } from '../actors.js';



export const FIGHT_TABLE = {
  1: [
    { ac: 1, difficulty: 0, name: 'Stars' },
    { ac: 11, difficulty: 0, name: 'Tracking Swords' },
    { ac: 2, difficulty: 0, name: 'Flurry' },
    { ac: 13, difficulty: 0, name: 'Sword Tunnel' },
    { ac: 5, difficulty: 0, name: 'Rotating Slash' },
  ],
  2: [
    { ac: 1, difficulty: 1, name: 'Stars' },
    { ac: 2, difficulty: 1, name: 'Flurry' },
    { ac: 13, difficulty: 3, name: 'Sword Tunnel' },
    { ac: 15, difficulty: 0, name: 'Sword Vortex' },
    { ac: 5, difficulty: 1, name: 'Rotating Slash' },
  ],
  3: [
    { ac: 1, difficulty: 2, name: 'Stars' },
    { ac: 2, difficulty: 3, name: 'Flurry' },
    { ac: 14, difficulty: 0, name: 'Tracking Swords' },
    { ac: 13, difficulty: 4, name: 'Sword Tunnel' },
    { ac: 5, difficulty: 2, name: 'Rotating Slash' },
  ],

  4: [
    { ac: 5, difficulty: 2, name: 'Rotating Slash' },
    { ac: -1, difficulty: 1, name: 'Charge-up' },
    { ac: 9, difficulty: 0, name: 'ROARING' },
  ],
};



export function turnLength(ac, difficulty) {

  if (ac === 5 || ac === 9) return 999999;

  if (ac === 16) return 999999;

  if (ac === -1) return 0;

  if (ac === 20) return 0;

  if (ac === 7) return 999999;

  if (ac === 3) return 999999;
  if (ac === 0) return 300;
  if (ac === 2) return 350;
  if (ac === 11) return difficulty === 0 ? 292 : 300;
  if (ac === 13) return difficulty === 3 ? 360 : 330;
  if (ac === 14 || ac === 15 || ac === 12) return 300;
  return 240;
}


function invcFor(ac) {
  if (ac === 1 || ac === 5 || ac === 9) return 1;
  if (ac === 13) return 0.14;
  return 0.4;
}



function arenaFor(ac) {

  if (ac === 0) return { x: 168, y: 170, xscale: 0.5, yscale: 2 };
  if (ac === 4) return { x: 320, y: 170, xscale: 3.5, yscale: 3.5 };
  if (ac === 11) return { x: 320, y: 190, xscale: 2, yscale: 2 };
  if (ac === 13) return { x: 300, y: 190, xscale: 3, yscale: 2 };
  if (ac === 1) return { x: 320, y: 170, xscale: 2.25, yscale: 1.75 };
  return { x: 320, y: 170, xscale: 2, yscale: 2 };
}


const CONE_POS = { x: 425, y: 78.56589 };





export function openArena(state, entry) {

  state.currentAc = entry.ac;

  if (entry.ac === -1) return;
  const arena = arenaFor(entry.ac);
  const gt = state.entities.find((e) => e.alive && e.type.name === 'obj_growtangle');
  if (!gt) return;
  gt.x = state.view.x + arena.x;
  gt.y = state.view.y + arena.y;
  gt.xstart = gt.x;
  gt.ystart = gt.y;
  gt.maxxscale = arena.xscale;
  gt.maxyscale = arena.yscale;

  gt.init = false;
  gt.mask = BATTLEBG_MASK;
  gt.growcon = 1;
  gt.timer = 0;
  gt.image_xscale = 0;
  gt.image_yscale = 0;
  gt.image_angle = 180;
  gt.visible = true;
}



const moveheart = {
  name: 'obj_moveheart',
  create(e) {

    e.image_alpha = 0;
    e.image_speed = 0;
    e.flytime = 8;
    e.sprite_index = 'spr_dodgeheart';
  },


  step(e) {
    e.image_alpha = Math.min(1, (e.image_alpha ?? 0) + 0.334);
  },
  alarm: {
    0(e, state) {
      e.x = e.distx;
      e.y = e.disty;
      if (!state.soul) {
        state.soul = spawn(state, soul, { x: e.distx, y: e.disty });

        state.soul.mask = HEART_RECT;
      }
      e.alive = false;
    },
  },
};



export function deliverHeart(state, gt, ac) {

  state.invTimer = 0;
  const kris = PARTY[0];
  const mh = spawn(state, moveheart, { x: kris.x + 10, y: kris.y + 40 });

  state.heartBurst = { x: kris.x + 10, y: kris.y + 40, burst: 0 };

  if (gt && ac === 13) {
    mh.distx = gt.x - 40;
    mh.disty = gt.y - 8;
  } else {
    mh.distx = (gt ? gt.x : state.view.x + 320) - 10;
    mh.disty = (gt ? gt.y : state.view.y + 170) - 10;
  }
  const dist = Math.hypot(mh.distx - mh.x, mh.disty - mh.y);
  mh.builtinMotion = true;
  mh.speed = dist / 8;
  mh.direction = (Math.atan2(-(mh.disty - mh.y), mh.distx - mh.x) * 180) / Math.PI;
  mh.alarm[0] = 8;
}



const CONTROLLER_DAMAGE = KNIGHT_AT * 5;



function reanchorRng(state) {
  if (globalThis.process?.env?.KNIGHT_ANCHOR_DEBUG) {
    console.error(`[anchor] f=${globalThis.__simFrame} n=${state.spawnn}`);
  }
  state.spawnn = state.spawnn ?? 0;
  state.gmlRng = gmlCreate((state.seed + state.spawnn * 1000) >>> 0);
  state.spawnn += 1;
}

export function launchAttack(state, entry) {
  const { ac, difficulty } = entry;

  state.currentAc = ac;


  if (ac === -1) {
    state.knight.chargeupcon = 1;
    return null;
  }

  const arena = arenaFor(ac);
  const gt = state.entities.find((e) => e.alive && e.type.name === 'obj_growtangle');

  if (gt && gt.arenaOpened !== ac) {
    gt.x = state.view.x + arena.x;
    gt.y = state.view.y + arena.y;
    gt.xstart = gt.x;
    gt.ystart = gt.y;

    gt.maxxscale = arena.xscale;
    gt.maxyscale = arena.yscale;

    gt.init = false;
    gt.mask = BATTLEBG_MASK;
    gt.growcon = 1;
    gt.timer = 0;
    gt.image_xscale = 0;
    gt.image_yscale = 0;
    gt.image_angle = 180;
    gt.visible = true;
  }
  if (gt) gt.arenaOpened = null;




  state.flurrySoftened = ac === 2 && (difficulty === 1 || difficulty === 3);

  state.invc = invcFor(ac);

  if (!state.turntimerArmed) {
    if (state.turntimer < 90) state.turntimer = 90;
    const tl = turnLength(ac, difficulty);
    if (tl > 0 && state.turntimer < tl) state.turntimer = tl - 1;
  }
  state.turntimerArmed = false;

  const knight = state.entities.find((e) => e.alive && e.type.name === 'obj_knight_enemy');
  const kx = knight ? knight.x : KNIGHT.x;
  const ky = knight ? knight.y : KNIGHT.ystart;


  if (knight) knight.difficulty = difficulty;

  reanchorRng(state);

  if (state.gmlRng) gmlIrandom(state.gmlRng, 360);


  const _k = state.knight;

  const _ct = _k ? _k.chargeuptimer - 1 : 0;
  if (_k && _k.chargeupcon === 1 && _ct % 4 === 0 && _ct > 10 && state.gmlRng) {
    gmlRandom(state.gmlRng, 360);
    state.chargeupDrawTaken = true;
  }

  switch (ac) {
    case 1: {

      const endtimer = difficulty >= 2 ? 210 : 120;
      const dc = spawn(state, starsController, { ...CONE_POS });
      dc.difficulty = difficulty;
      dc.endtimer = endtimer;
      const cone = spawn(state, pointingCone, { ...CONE_POS });
      cone.difficulty = difficulty;
      cone.con = 1;
      cone.endtimer = endtimer;

      if (difficulty === 0 && state.gmlRng) {
        dc.side = gmlChoose(state.gmlRng, [-1, 1]);
      }

      return dc;
    }

    case 2: {

      const mg = spawn(state, boxsplitterAttack, { x: kx, y: ky });
      mg.difficulty = difficulty;
      if (knight) knight.image_alpha = 0;
      return mg;
    }

    case 5:
      return spawnRotatingSlash(state, kx, ky, { difficulty });

    case 9: {

      return spawn(state, roaring2, { x: state.view.x + 320, y: state.view.y + 88 });
    }

    case 11:
    case 14: {
      const mg = spawn(state, trackingSwordsManager, { x: arena.x, y: state.view.y });

      mg.variant = ac === 14 ? 3 : 0;

      mg.damage = 206;
      trackingSwordsManager.init(mg, state);
      return mg;
    }



    case 4: {

      if (knight) knight.image_alpha = 0;
      const mg = spawn(state, knightStream, { x: kx, y: ky });
      return mg;
    }

    case 6: {

      state.turntimer = 999999;
      return launchUnderbox(state, kx, ky);
    }

    case 3: {

      return launchSwordTunnelRevised(state);
    }

    case 7: {

      return launchCombination(state);
    }

    case 0: {

      return launchSwordslash(state, difficulty);
    }

    case 20: {

      return launchKnightlines(state, kx, ky);
    }

    case 10: {

      const mg = spawn(state, knightSwordfall, { x: kx, y: ky });
      mg.difficulty = difficulty;
      knightSwordfall.init(mg, state);
      return mg;
    }

    case 12: {

      const mg = spawn(state, diagonalBulletManager, { x: arena.x, y: state.view.y });
      mg.damage = CONTROLLER_DAMAGE;
      return mg;
    }

    case 16: {

      const mg = spawnRotatingSlash(state, kx, ky, { difficulty: 0 });
      reanchorRng(state);

      if (state.gmlRng) gmlIrandom(state.gmlRng, 360);
      const tr = spawn(state, trackingSwordsManager, { x: arena.x, y: state.view.y });
      tr.variant = 0;
      tr.damage = 206;

      trackingSwordsManager.init(tr, state, 104);
      return mg;
    }

    case 17: {

      const mg = spawn(state, trackingSwordsManager, { x: arena.x, y: state.view.y });
      mg.variant = 2;
      mg.damage = 206;
      trackingSwordsManager.init(mg, state);
      return mg;
    }

    case 13: {

      const mg = spawn(state, swordTunnelManager, { x: arena.x, y: state.view.y });
      mg.difficulty = difficulty;
      mg.knightDifficulty = difficulty;

      mg.damage = 62;
      swordTunnelManager.init(mg, state);
      return mg;
    }

    case 15: {

      const mg = spawn(state, swordVortexManager, { x: arena.x, y: state.view.y });
      mg.damage = CONTROLLER_DAMAGE;

      reanchorRng(state);

      if (state.gmlRng) gmlIrandom(state.gmlRng, 360);
      const tr = spawn(state, trackingSwordsManager, { x: arena.x, y: state.view.y });
      tr.variant = 0;
      tr.damage = CONTROLLER_DAMAGE;

      trackingSwordsManager.init(tr, state, 154);
      return mg;
    }

    default:
      return null;
  }
}



const SURVIVES_TURN = new Set([

  'obj_tracking_sword_slash_extra_graze',
  'obj_heart',
  'obj_growtangle',
  'obj_knight_enemy',
  'actor_party',
  'fight_director',
  'practice_director',

  'turn_clock',
]);



export function clearTurn(state) {
  state.currentAc = undefined;

  const dying = state.entities
    .filter((e) => e.alive && !SURVIVES_TURN.has(e.type.name))
    .sort((a, b) => b.seq - a.seq);
  for (const e of dying) destroy(e, state);


  if (state.soul && !state.soul.alive) state.soul = null;
  state.view.x = 0;
  state.view.y = 0;
  const knight = state.entities.find((e) => e.alive && e.type.name === 'obj_knight_enemy');
  if (knight) {

    knight.image_alpha = 1;
    knight.visible = true;
  }
}



export function nextTurn(phase, turn) {
  const list = FIGHT_TABLE[phase];
  if (turn + 1 < list.length) return { phase, turn: turn + 1 };

  if (phase === 3) return { phase: 3, turn: 0 };

  if (phase === 4) return { phase: 3, turn: 0 };
  return { phase: phase + 1, turn: 0 };
}



export function phase4Entry(rotatingslash3used) {
  return rotatingslash3used ? 1 : 0;
}
