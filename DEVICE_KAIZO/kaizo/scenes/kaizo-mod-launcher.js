

import { spawn } from '../../sim/entity.js';
import { BATTLEBG_MASK } from '../../sim/masks.js';
import { KNIGHT } from '../../sim/actors.js';
import { gmlEq } from '../../sim/gml.js';

import { boxsplitterAttack } from '../attacks/flurry-boxsplitter-attack.js';
import { launchKaizoStars } from '../attacks/stars-controller.js';
import { spawnRotatingSlash } from '../attacks/rotating-slash.js';
import { swordVortexManager, kaizoVortexendFreeze } from '../attacks/sword-vortex.js';
import { trackingSwordsManager } from '../attacks/tracking-swords.js';
import { knightStream } from '../attacks/knight-stream.js';
import { launchUnderbox } from '../attacks/underbox.js';
import { knightSwordfall } from '../attacks/swordfall.js';
import { launchKnightlines } from '../attacks/knightlines.js';
import { launchSwordTunnel } from '../attacks/sword-tunnel.js';
import { launchSwordTunnelRevised } from '../attacks/sword-tunnel-revised.js';
import { diagonalBulletManager } from '../attacks/diagonal-bullets.js';
import { spawnQuickslash1001, spawnQuickslashTrue } from '../attacks/quickslash.js';
import { roaring2 } from '../attacks/roaring-final.js';
import { launchKaizoSwordslash } from '../attacks/crescent-slash.js';
import {
  launchKaizoCombination, kaizoComboOrderFor, kaizoChainNext,
} from '../attacks/combination.js';
import { gmlCreate, gmlIrandom } from '../../sim/rng.js';
import { scrBulletInherit } from '../../sim/bullets/regularbullet.js';
import { VC_KNIGHT } from '../versions/vc-script.js';

const VC_BASE_DAMAGE = VC_KNIGHT.at * 5;

const CONE_POS = { x: 425, y: 78.56589 };

const SUPPORTED = {

  98: [0, 1, 2, 3, 3.1, 3.2, 3.3],
  99: [0, 1, 2, 3, 5],
  101: [0],
  103: [0],
  104: [0, 1, 2, 8, 10],
  106: [0],
  107: [0],
  108: [0, 1, 5, 10, 11],
  151: [0, 2, 3, 3.1, 4, 5, 6, 6.1, 7, 7.1, 7.2, 8, 10, 11],
  153: [0, 3, 4, 4.1, 10, 11],
  154: [0, 3, 3.1],
  1001: [0],
  97.1: [0],
  102: [0],

  152: [0],

  109: [0, 1],

  105: [0],
};

const VANILLA_BODIES = {

};

const PINNERS = new Set([102, 104, 105, 106, 107, 1001]);

function resolveDifficulty(type, d) {
  const sup = SUPPORTED[type];
  if (!sup) return { use: 0, approx: true };

  if (sup.some((s) => gmlEq(s, d))) return { use: d, approx: false };

  const fl = Math.floor(d);
  let best = sup[0];
  for (const s of sup) if (s <= fl && s > best) best = s;
  if (sup.some((s) => gmlEq(s, fl))) best = fl;
  return { use: best, approx: true };
}

function ledger(state, entry) {
  (state.kaizo.approx ??= []).push(entry);
}

function reanchorForController(state) {
  reanchorRng(state);
  if (state.gmlRng) gmlIrandom(state.gmlRng, 360);
}

function reanchorRng(state) {
  state.spawnn = state.spawnn ?? 0;
  state.gmlRng = gmlCreate((state.seed + state.spawnn * 1000) >>> 0);
  state.spawnn += 1;
}

function knightPos(state) {
  const knight = state.entities.find((e) => e.alive && e.type.name === 'obj_knight_enemy');
  return {
    knight,
    kx: knight ? knight.x : KNIGHT.x,
    ky: knight ? knight.y : KNIGHT.ystart,
  };
}

const KNIGHT_MYTARGET = 4;
function dcInheritable(opts) {
  return {
    damage: opts.damage ?? -1,
    grazepoints: -1,
    timepoints: -1,
    inv: -1,
    target: KNIGHT_MYTARGET,
    grazed: -1,
    grazetimer: -1,
    element: 'none',
  };
}

const DC_INHERIT_TYPES = new Set([99, 101, 102, 103, 104, 105, 106, 107, 108, 151, 152, 153, 154]);

function spawnControllerByType(state, type, opts = {}) {
  const mg = spawnControllerByTypeInner(state, type, opts);

  if (mg && typeof mg === 'object' && DC_INHERIT_TYPES.has(type)) {
    scrBulletInherit(dcInheritable(opts), mg);
  }
  return mg;
}

function spawnControllerByTypeInner(state, type, opts = {}) {
  const { knight, kx, ky } = knightPos(state);
  const gt = state.entities.find((e) => e.alive && e.type.name === 'obj_growtangle');
  const gx = gt ? gt.x : state.view.x + 320;

  const res = resolveDifficulty(type, opts.difficulty ?? 0);

  const body = VANILLA_BODIES[type];
  if (body) {
    ledger(state, {
      row: opts.rowId, type, asked: `type ${type} body`,
      used: `vanilla ${body.module}`, why: body.why,
    });
  }
  if (res.approx) {
    ledger(state, {
      row: opts.rowId, type, asked: opts.difficulty ?? 0, used: res.use,
      why: 'difficulty branch not translated yet',
    });
  }
  const difficulty = res.use;

  if (!opts.prearmed) {
    reanchorForController(state);
    state.kaizo?.hooks?.afterLaunchReseed?.(state);
  }

  if (knight) knight.difficulty = difficulty;

  switch (type) {
    case 98:

      return launchKaizoStars(state, difficulty);
    case 99: {
      const mg = spawn(state, boxsplitterAttack, { x: kx, y: ky });
      mg.difficulty = difficulty;
      if (knight) knight.image_alpha = 0;
      return mg;
    }
    case 101:
      return launchKnightlines(state, kx, ky);
    case 102:
      return launchSwordTunnelRevised(state);
    case 103: {

      if (knight) knight.image_alpha = 0;
      return spawn(state, knightStream, { x: kx, y: ky });
    }
    case 104:

      state.turntimer = 999999;
      return spawnRotatingSlash(state, kx, ky, { difficulty });
    case 105: {

      state.kaizo = state.kaizo ?? {};
      state.kaizo.hooks = state.kaizo.hooks ?? {};

      state.kaizo.hooks.comboChainNext ??= kaizoChainNext;

      return launchKaizoCombination(state, kaizoComboOrderFor(state.currentAc));
    }
    case 106: {
      state.turntimer = 999999;

      return launchUnderbox(state, kx, ky, { dcDamage: opts.damage });
    }
    case 107:

      state.turntimer = 999999;

      return spawn(state, roaring2, { x: kx, y: ky });
    case 108: {

      state.turntimer = 600;
      const mg = spawn(state, knightSwordfall, { x: kx, y: ky });

      mg.target = 3;
      mg.difficulty = difficulty;
      knightSwordfall.init(mg, state);
      if (opts.damage !== undefined) mg.damage = opts.damage;
      return mg;
    }
    case 109:
      return launchKaizoSwordslash(state, difficulty);
    case 151: {
      const mg = spawn(state, trackingSwordsManager, { x: gx, y: state.view.y });
      mg.variant = difficulty;
      mg.damage = opts.damage ?? VC_BASE_DAMAGE;
      trackingSwordsManager.init(mg, state, opts.chainedType);
      return mg;
    }
    case 152: {
      const mg = spawn(state, diagonalBulletManager, { x: gx, y: state.view.y });
      mg.damage = opts.damage ?? VC_BASE_DAMAGE;
      return mg;
    }
    case 153:

      return launchSwordTunnel(state, {
        difficulty,
        damage: opts.damage ?? VC_BASE_DAMAGE,
      });
    case 154: {
      const mg = spawn(state, swordVortexManager, { x: gx, y: state.view.y });
      mg.damage = opts.damage ?? VC_BASE_DAMAGE;
      return mg;
    }

    case 1001:
      return spawnQuickslash1001(state, { damage: opts.damage });

    case 97.1:
      return spawnQuickslashTrue(state, { damage: opts.damage, difficulty });
    default:
      ledger(state, { row: opts.rowId, type, asked: type, used: 'nothing', why: 'unknown type' });
      return null;
  }
}

function normalArm(row, vars) {
  const ac = row.ac;
  const phase = row.phase;
  const d = row.difficulty;
  switch (ac) {
    case 0: return [{ spawn: { type: 109, d } }, { invc: 1 },
      { spawn: { type: 151, d: 6, damage: 153 } }, { invc: 1 }];
    case 1:
      if (phase === 1 && !vars.firststarsused) {
        vars.firststarsused = true;
        return [{ spawn: { type: 98, d: 1 } }, { invc: 1 }];
      }
      if (phase === 2) return [{ spawn: { type: 98, d: 3 } }, { invc: 1 }];
      if (phase === 3) return [{ spawn: { type: 98, d: 3.1 } }, { invc: 1 }];
      return [];
    case 2:
      if (phase === 1) {
        return [{ spawn: { type: 108, d: 0 } }, { invc: 0.4 },
          { spawn: { type: 154, d: 3, damage: 120 } }];
      }
      return [{ spawn: { type: 99, d: 2 } }, { invc: 0.4 }];
    case 3: return [{ spawn: { type: 106, damage: 87 } }, { invc: 0.4 }];
    case 4: return [{ spawn: { type: 106, damage: 103 } }, { invc: 1 },
      { spawn: { type: 108, d, damage: 103 } }, { invc: 1 }];
    case 5: return [{ spawn: { type: 104, d } }, { invc: 1 },
      { spawn: { type: 104, d } }, { invc: 1 }];
    case 6: return [{ spawn: { type: 101, damage: 103 } }, { invc: 1 }];
    case 7: return [{ pre: { first: 4, second: 2, third: 3 } },
      { spawn: { type: 105 } }, { invc: 0.4 }];
    case 9: return [{ spawn: { type: 107 } }, { invc: 1 }];
    case 10: return [{ spawn: { type: 108, d } }, { invc: 0.4 },
      { spawn: { type: 104, d: 0 } }, { invc: 1 },
      { spawn: { type: 104, d: 0 } }, { invc: 1 }];
    case 11: return [{ spawn: { type: 151, d: 0, damage: 206 } }, { invc: 0.4 }];
    case 12: return [{ spawn: { type: 152, d } }, { invc: 1 },
      { spawn: { type: 151, d: 7, damage: 135, chainedType: 152 } }, { invc: 0.4 }];
    case 13:
      if (phase === 1) {
        return [{ spawn: { type: 153, d: 4, damage: 62 } }, { invc: 0.14 },
          { spawn: { type: 151, d: 4, damage: 206, chainedType: 153 } }, { invc: 0.4 }];
      }
      if (phase === 2) {
        return [{ spawn: { type: 104, d: 1 } },
          { spawn: { type: 154, d: 3, damage: 206 } }];
      }
      return [{ spawn: { type: 104, d: 0 } }, { spawn: { type: 104, d: 0 } },
        { spawn: { type: 151, d: 0, damage: 206, chainedType: 104 } }, { invc: 0.4 }];
    case 14: return [{ spawn: { type: 151, d: 10, damage: 100 } }, { invc: 0.8 },
      { spawn: { type: 151, d: 10, damage: 100 } }, { invc: 0.8 }];
    case 15.1: return [{ spawn: { type: 153, d: 4.1, damage: 62 } }, { invc: 0.14 },
      { spawn: { type: 153, d: 11, damage: 62 } }, { invc: 0.14 }, { turntimer: 450 }];
    case 15: return [{ spawn: { type: 102 } }, { invc: 0.4 },
      { spawn: { type: 151, d: 7, damage: 135, chainedType: 102 } }, { invc: 0.4 }];
    case 16: return [{ spawn: { type: 104, d: 0 } },
      { spawn: { type: 151, d: 0, damage: 206, chainedType: 104 } }, { invc: 0.4 },
      { spawn: { type: 151, d: 0, damage: 206, chainedType: 104 } }, { invc: 0.4 }];
    case 17: return [{ spawn: { type: 151, d: 3, damage: 206 } }, { invc: 0.4 }];
    case -1: return [{ chargeup: true }];
    case 20: return [{ spawn: { type: 98, d: 3.3 } }, { invc: 1 },
      { spawn: { type: 154, d: 3.1, damage: 120 } }];
    case 101: return [{ spawn: { type: 106, damage: 103 } }, { invc: 1 },
      { spawn: { type: 153, d: 10, damage: 62 } }, { turntimer: 240 }];
    case 102: return [{ spawn: { type: 106, damage: 103 } },
      { spawn: { type: 108, d: 10, damage: 103 } }, { invc: 0.66 },
      { turntimer: 270 }, { swordfallTurnTime: 40 }];
    case 103: return [{ spawn: { type: 108, d: 11 } }, { invc: 0.4 },
      { spawn: { type: 104, d: 10 } }, { invc: 1 },
      { spawn: { type: 104, d: 10 } }, { invc: 1 }, { turntimer: 240 }];
    case 104: return [{ spawn: { type: 107 } }, { invc: 0.5 }];
    case 105: return [{ spawn: { type: 1001, damage: 80 } }, { invc: 0.4 }, { turntimer: 9999 }];
    case 105.1: return [{ spawn: { type: 97.1, damage: 80 } }, { invc: 0.4 }, { turntimer: 9999 }];
    case 106: return [{ pre: { first: 1, second: 2, third: 5 } },
      { spawn: { type: 105, damage: 80 } }, { invc: 0.4 }, { turntimer: 480 }];
    case 107: return [{ spawn: { type: 103, damage: 206 } }, { invc: 0.4 }, { turntimer: 240 }];
    case 108: return [{ spawn: { type: 99, d: 5 } }, { invc: 0.4 }, { turntimer: 530 }];
    case 109: return [{ spawn: { type: 99, d: 3 } }, { invc: 0.4 }, { turntimer: 350 }];
    case 110: return [{ spawn: { type: 101, damage: 103 } }, { invc: 0.4 }];
    case 111: return [{ spawn: { type: 154, d: 3, damage: 120 } },
      { spawn: { type: 104, d: 8, chainedType: 154 } }];
    default: return [];
  }
}

function normalTurntimerFloor(row) {
  const ac = row.ac;
  const d = row.difficulty;
  if (ac >= 100) return 0;
  if (ac === 7) return 270;
  if (ac === 2) return 350;
  if (ac === 0 && d === 0) return 300;
  if (ac === 0 && d === 1) return 300;
  if (ac === 11 && d === 0) return 292;
  if (ac === 11) return 300;
  if (ac === 12) return 340;
  if (ac === 13 && d === 3) return 360;
  if (ac === 13 && row.phase === 1) return 450;
  if (ac === 13) return 330;
  if (ac === 14) return 420;
  if (ac === 15) return 360;
  return 240;
}

function sidebArm(row, vars) {
  const ac = row.ac;
  const phase = row.phase;
  const d = row.difficulty;

  const lead = [{ turntimer: 240 }];
  switch (ac) {
    case 0: return [...lead, { spawn: { type: 109, d } },
      { spawn: { type: 151, d: 6.1, damage: 153 } }, { invc: 1 }, { turntimer: 300 }];
    case 1:
      if (phase === 1 && !vars.firststarsused) {
        vars.firststarsused = true;
        return [...lead, { spawn: { type: 98, d: 1 } }, { invc: 1 }];
      }
      if (phase === 2) return [...lead, { spawn: { type: 98, d: 3 } }, { invc: 1 }];
      if (phase === 3) return [...lead, { spawn: { type: 98, d: 3.1 } }, { invc: 1 }];
      return lead;
    case 2:
      if (phase === 1) {
        return [...lead, { turntimer: 350 }, { spawn: { type: 108, d: 1 } }, { invc: 0.4 },
          { spawn: { type: 154, d: 3, damage: 120 } }];
      }
      return [...lead, { turntimer: 350 }, { spawn: { type: 99, d: 2 } }, { invc: 0.4 }];
    case 3:
      if (phase === 1) {
        return [...lead, { spawn: { type: 106, damage: 103 } }, { invc: 1 },
          { spawn: { type: 153, d: 10, damage: 62 } }, { turntimer: 240 }];
      }
      return [...lead, { spawn: { type: 106, damage: 87 } }, { invc: 0.4 }];
    case 4: return [...lead, { spawn: { type: 106, damage: 103 } }, { invc: 1 },
      { spawn: { type: 108, d, damage: 103 } }, { invc: 1 }];
    case 5: return [...lead, { spawn: { type: 104, d } }, { invc: 1 },
      { spawn: { type: 104, d } }, { invc: 1 }];
    case 6: return [...lead, { spawn: { type: 101, damage: 103 } }, { invc: 1 }];
    case 7: return [...lead, { pre: { first: 4, second: 2, third: 3 } },
      { spawn: { type: 105 } }, { invc: 0.4 }, { turntimer: 270 }];
    case 9: return [...lead, { spawn: { type: 107 } }, { invc: 1 }];
    case 10: return [...lead, { spawn: { type: 108, d } }, { invc: 0.4 },
      { spawn: { type: 104, d: 0 } }, { invc: 1 },
      { spawn: { type: 104, d: 0 } }, { invc: 1 }];
    case 11: return [...lead, { spawn: { type: 151, d: 0, damage: 206 } }, { invc: 0.4 },
      { turntimer: 300 }];
    case 12: return [...lead, { spawn: { type: 152, d } }, { invc: 1 },
      { spawn: { type: 151, d: 7, damage: 135, chainedType: 152 } }, { invc: 0.4 },
      { turntimer: 340 }];
    case 13:
      if (phase === 1) {
        return [...lead, { spawn: { type: 153, d: 4, damage: 62 } }, { invc: 0.14 },
          { spawn: { type: 151, d: 4, damage: 206, chainedType: 153 } }, { invc: 0.4 },
          { turntimer: 470 }];
      }
      if (phase === 2) {
        return [...lead, { spawn: { type: 104, d: 2 } },
          { spawn: { type: 154, d: 3, damage: 206 } }, { turntimer: 360 }];
      }
      return [...lead, { spawn: { type: 104, d: 0 } }, { spawn: { type: 104, d: 0 } },
        { spawn: { type: 151, d: 0, damage: 206, chainedType: 104 } }, { invc: 0.4 },
        { turntimer: 330 }];
    case 14: return [...lead, { spawn: { type: 151, d: 10, damage: 100 } }, { invc: 0.8 },
      { spawn: { type: 151, d: 10, damage: 100 } }, { invc: 0.8 }, { turntimer: 420 }];
    case 15.1: return [...lead, { spawn: { type: 153, d: 4.1, damage: 62 } }, { invc: 0.14 },
      { spawn: { type: 153, d: 11, damage: 62 } }, { invc: 0.14 }, { turntimer: 450 }];
    case 15: return [...lead, { spawn: { type: 102 } }, { invc: 0.4 },
      { spawn: { type: 151, d: 7, damage: 135, chainedType: 102 } }, { invc: 0.4 },
      { turntimer: 360 }];
    case 16: return [...lead, { spawn: { type: 104, d: 1 } },
      { spawn: { type: 151, d: 0, damage: 206, chainedType: 104 } }, { invc: 0.4 },
      { spawn: { type: 151, d: 0, damage: 206, chainedType: 104 } }, { invc: 0.4 }];
    case 17: return [...lead, { spawn: { type: 151, d: 3.1, damage: 206 } }, { invc: 0.4 }];
    case -1: return [...lead, { chargeup: true }];
    case 20: return [...lead, { spawn: { type: 98, d: 3.3 } }, { invc: 1 },
      { spawn: { type: 154, d: 3.1, damage: 120 } }];
    case 101: return [...lead, { spawn: { type: 106, damage: 103 } }, { invc: 1 },
      { spawn: { type: 153, d: 10, damage: 62 } }, { turntimer: 240 }];
    case 102: return [...lead, { spawn: { type: 106, damage: 103 } },
      { spawn: { type: 108, d: 10, damage: 103 } }, { invc: 0.66 },
      { turntimer: 270 }, { swordfallTurnTime: 40 }];
    case 103: return [...lead, { spawn: { type: 108, d: 11 } }, { invc: 0.4 },
      { spawn: { type: 104, d: 10 } }, { invc: 1 },
      { spawn: { type: 104, d: 10 } }, { invc: 1 }, { turntimer: 240 }];
    case 104: return [...lead, { spawn: { type: 107 } }, { invc: 0.5 }];
    case 105: return [...lead, { spawn: { type: 1001, damage: 80 } }, { invc: 0.4 }, { turntimer: 9999 }];
    case 105.1: return [...lead, { spawn: { type: 97.1, damage: 80 } }, { invc: 0.4 }, { turntimer: 9999 }];
    case 106: return [...lead, { pre: { first: 1, second: 2, third: 5 } },
      { spawn: { type: 105, damage: 80 } }, { invc: 0.4 }, { turntimer: 480 }];
    case 107: return [...lead, { spawn: { type: 103, damage: 206 } }, { invc: 0.4 }, { turntimer: 240 }];
    case 108: return [...lead, { spawn: { type: 99, d: 5 } }, { invc: 0.4 }, { turntimer: 530 }];
    case 109: return [...lead, { spawn: { type: 99, d: 3 } }, { invc: 0.4 }, { turntimer: 350 }];
    case 110: return [...lead, { spawn: { type: 101, damage: 103 } }, { invc: 0.4 }];
    case 111: return [...lead, { spawn: { type: 154, d: 3, damage: 120 } },
      { spawn: { type: 104, d: 8, chainedType: 154 } }];
    case 112: return [...lead, { spawn: { type: 151, d: 11, damage: 206 } }, { invc: 0.4 },
      { turntimer: 460 }];
    default: return lead;
  }
}

function armFor(row, vars, sideb) {
  return sideb ? sidebArm(row, vars) : normalArm(row, vars);
}

export function vcSelfEnding(row, { sideb = false } = {}) {
  if (row.ac === -1) return false;
  const vars = { firststarsused: true };
  return armFor(row, vars, sideb).some((op) => op.spawn && PINNERS.has(op.spawn.type));
}

export function vcTurnLength(row, { sideb = false } = {}) {
  if (row.ac === -1) {

    return 240;
  }
  const vars = { firststarsused: true };
  const ops = armFor(row, vars, sideb);

  let floor = sideb ? 240 : normalTurntimerFloor(row);
  for (const op of ops) {
    if (op.turntimer) floor = Math.max(floor, op.turntimer);
  }
  return floor;
}

export function launchVCAttack(state, row, { sideb = false } = {}) {
  state.currentAc = row.ac;

  const armedByDriver = state.turntimerArmed === true;
  state.turntimerArmed = false;
  const vars = (state.kaizo.vars ??= {});

  if (row.ac === -1) {
    state.knight.chargeupcon = 1;
    return null;
  }

  const ops = armFor(row, vars, sideb);
  let owner = null;

  for (const op of ops) {
    if (op.spawn) reanchorForController(state);
  }

  state.kaizo?.hooks?.afterLaunchReseed?.(state);
  for (const op of ops) {
    if (op.spawn) {
      const mg = spawnControllerByType(state, op.spawn.type, {
        difficulty: op.spawn.d ?? 0,
        damage: op.spawn.damage,
        chainedType: op.spawn.chainedType,
        rowId: row.id,
        prearmed: true,
      });
      owner = owner ?? mg;
    } else if (op.invc !== undefined) {
      state.invc = op.invc;
    } else if (op.turntimer !== undefined) {

      if (!armedByDriver && state.turntimer < op.turntimer) state.turntimer = op.turntimer;
    } else if (op.pre) {

    } else if (op.swordfallTurnTime !== undefined) {

    } else if (op.chargeup) {
      state.knight.chargeupcon = 1;
    }
  }

  if (sideb && state.invc > 0.7) state.invc = 0.7;

  return owner;
}

export function arenaGeom(row, sideb) {
  const ac = row.ac;
  const phase = row.phase;

  let x = 320;
  let y = 170;
  if (ac === 0) { x = 300 - 152; y = 170; }
  else if (ac === 11) { x = 320; y = 190; }
  else if (ac === 13 && phase !== 2) { x = 300; y = 190; }
  const g = { x, y, xscale: 2, yscale: 2, keep: false, megakeep: false, dx: 0, dy: 0 };
  const set = (xs, ys) => { if (xs !== null) g.xscale = xs; if (ys !== null) g.yscale = ys; };
  if (!sideb) {
    if (ac === 0) { set(0.8, null); g.keep = true; g.megakeep = true; }
    if (ac === 1) set(2.25, 1.75);
    if (ac === 4) set(3.5, 3.5);
    if (ac === 10) set(3.5, 1.75);
    if (ac === 11) set(1.5, 1.5);
    if (ac === 12) set(2.5, null);
    if (ac === 13 && phase !== 2) set(3, null);
    if (ac === 14) set(1.75, 1.75);
    if (ac === 15) set(2.5, null);
    if (ac === 17) set(1, 1);
    if (ac === 20) set(2.25, 1.75);
    if (ac === 101) { set(3, 1.5); g.dy = -64; g.ystartKnight = true; }
    if (ac === 102) { set(3.25, 3); g.dy = 32; }
    if (ac === 103) set(3.5, 1.75);
    if (ac === 107) set(3.5, 3.5);
    if (ac === 110) { set(1.5, 2.5); g.dx = -110; g.xstartKnight = true; }
    if (ac === 111) set(3, null);
  } else {
    if (ac === 0) { set(0.6, null); g.keep = true; g.megakeep = true; }
    if (ac === 1) set(2.25, 1.5);
    if (ac === 4) set(3.5, 3.5);
    if (ac === 10) set(3.5, 1.75);
    if (ac === 11) set(1.5, 1.5);
    if (ac === 12) set(2.5, 1.4);
    if (ac === 13 && phase !== 2) set(3, null);
    if (ac === 14) set(1.5, 1.5);
    if (ac === 15) set(2.5, null);
    if (ac === 17) set(0.8, 0.8);
    if (ac === 20) set(2.25, 1.75);
    if (ac === 101) { set(3, 1.5); g.dy = -56; g.ystartKnight = true; g.keep = true; g.megakeep = true; }
    if (ac === 102) { set(3.25, 3); g.dy = 32; }
    if (ac === 103) set(3.5, 1.75);
    if (ac === 107) set(3.5, 3.5);
    if (ac === 110) { set(1.5, 2.5); g.dx = -110; g.xstartKnight = true; }
    if (ac === 111) set(3, null);
    if (ac === 112) set(2.5, 2.5);
  }
  return g;
}

export function openVCArena(state, row, { sideb = false } = {}) {
  state.currentAc = row.ac;
  if (row.ac === -1) return;
  const g = arenaGeom(row, sideb);
  const gt = state.entities.find((e) => e.alive && e.type.name === 'obj_growtangle');
  if (!gt) return;
  const { knight } = knightPos(state);
  gt.x = state.view.x + g.x + g.dx;
  gt.y = state.view.y + g.y + g.dy;
  gt.xstart = gt.x;
  gt.ystart = gt.y;

  if (g.xstartKnight && knight) gt.xstart = knight.x;
  if (g.ystartKnight && knight) gt.ystart = knight.y;
  gt.maxxscale = g.xscale;
  gt.maxyscale = g.yscale;

  gt.keep = g.keep ? 1 : 0;
  gt.megakeep = g.megakeep ? 1 : 0;
  gt.init = false;

  gt.customBox = false;
  gt.customBoxFromSplit = false;
  gt.mask = BATTLEBG_MASK;
  gt.growcon = 1;
  gt.timer = 0;
  gt.image_xscale = 0;
  gt.image_yscale = 0;
  gt.image_angle = 180;
  gt.visible = true;
}

export function vcMoveheartDest(row, gt, view) {
  const gx = gt ? gt.x : view.x + 320;
  const gy = gt ? gt.y : view.y + 170;
  if (row.ac === 13 && row.phase !== 2) return { x: gx - 40, y: gy - 8 };
  if (row.ac === 15) return { x: gx - 40, y: gy - 8 };
  if (row.ac === 101) return { x: gx - 10, y: gy + 20 };
  return { x: gx - 10, y: gy - 10 };
}
