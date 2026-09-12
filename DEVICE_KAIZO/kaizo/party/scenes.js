

import { spawn, destroy } from '../../sim/entity.js';
import { gmlRandom, gmlRandomRange, gmlChoose } from '../../sim/rng.js';
import { lerp, lengthdirX, lengthdirY, pointDirection, gmlRound } from '../../sim/gml.js';
import { cue, cueStop } from '../../sim/audio.js';
import { scrLerpvar } from '../../sim/lerpvar.js';
import { scrShakescreen } from '../../sim/shake.js';
import { KNIGHT } from '../../sim/actors.js';
import { PARTY as SIM_PARTY } from '../../sim/damage.js';
import { getSwordcolor } from '../attacks/kaizo-colors.js';
import { stepSnowgraveFreeze, ensureFreezeState } from './freeze.js';
import { kaizoTensionClampActive, kaizoTpscene } from './tensionbar.js';
import {
  writerAnchor, charIdOf, rosterSize, slotDepth, havechar, slotOf, memberAt,
} from './roster.js';
import { scrPicktargetWeighted, scrDead } from './damage.js';

export const HP_CEILINGS = [0, 200, 230, 180, 180];

export const TP_ARM_PREVATK = 'atk_Frenzy1';

export const TP_ARM_PREVATK_NAME = 'Frenzy 1';

export const NH_ARM_TURNS = 7;

export const SNOW_SCATTER = 56;

export const KNIGHT_SPRITE_HEIGHT = 115;

export const SG_SPELLDELAY_STALL = 999999;
export const SG_SPELLDELAY_RELEASE = 1;

export const SNOWGRAVE_SPELLDELAY = 140;

export const NH_KILL_HP = -999999999999999999;

export const NH_DAMAGE_TEXT = '999999999999999999';

export const SCENE_HIJACK_KEYS = ['specialCon', 'mnfight', 'myfight', 'charturn'];

export function ensureScenes(state) {
  const k = (state.kaizo ??= {});
  if (typeof k.tpscene !== 'number') k.tpscene = 0;
  if (typeof k.sgscene !== 'number') k.sgscene = 0;
  if (typeof k.nhscene !== 'number') k.nhscene = 0;

  if (typeof k.hpscene !== 'number') k.hpscene = 0;
  if (typeof k.specialCon !== 'number') k.specialCon = 0;
  if (k.scenes) return k.scenes;

  k.scenes = {

    knight: {
      x: KNIGHT.x,
      y: KNIGHT.ystart,
      ystart: KNIGHT.ystart,
      xstart: KNIGHT.x,
      spriteHeight: KNIGHT_SPRITE_HEIGHT,

      knightState: 0,
      sceneFloat: 0,
      yoff: 0,
      siner2: 1,
      spriteIndex: 'spr_roaringknight_idle',
      imageIndex: 0,
      imageSpeed: 0,
      depth: 88,
      remdepth: 88,
    },

    hp: {
      mark: null, cut: null, armedBy: null, hpSceneTypo: 0,
      runs: Object.create(null), minishakes: 0, handback: null,
    },
    tp: { deadtp: null, nospellsaw: 0 },

    sg: {
      target: 0, num: 0, vol: 0, pit: 0.7, cyc: 0, caster: 0, spell: null,
      ticks: 0, peakVol: 0,
    },
    nh: { star: null, siner: 0 },

    lerps: [],
    msgs: [],
    writers: [],

    log: [],
    draws: {
      hp: 0, tp: 0, sg: 0, nh: 0, flakes: 0,
    },

    onMnendturn: null,
  };
  ensureFreezeState(state);
  return k.scenes;
}

export function sceneDraws(state) {
  return { ...ensureScenes(state).draws };
}

export function sceneHijacksTurn(state) {
  return (state.kaizo?.specialCon ?? 0) > 0;
}

export function sceneStallsSpellphase(state) {
  return (state.kaizo?.spelldelay ?? 0) >= SG_SPELLDELAY_STALL;
}

export function sceneActive(state) {
  const k = state.kaizo ?? {};
  return (k.hpscene ?? 0) > 0 || (k.tpscene ?? 0) > 0
    || (k.sgscene ?? 0) > 0 || (k.nhscene ?? 0) > 0;
}

function draw(state, who, n = 1) {
  ensureScenes(state).draws[who] += n;
}

function msg(state, text) {
  ensureScenes(state).msgs.push({ frame: state.frame, text });
}

function noteLerp(state, name, from, to, frames, opts = {}) {
  const { easetype, easeinout, knight = false } = opts;
  const sc = ensureScenes(state);
  sc.lerps.push({ frame: state.frame, name, from, to, frames, easetype, easeinout });
  if (knight && sc.live?.alive) {
    scrLerpvar(state, spawn, sc.live, name, from, to, frames, easetype, easeinout);
  }
}

const L = 2;
const kl = (easeinout) => ({ easetype: L, easeinout, knight: true });

function logTransition(state, scene, from, to) {
  ensureScenes(state).log.push({ frame: state.frame, scene, from, to });
}

function setScene(state, scene, value) {
  const k = state.kaizo;
  const key = `${scene}scene`;
  const from = k[key];
  if (from === value) return;
  k[key] = value;
  logTransition(state, scene, from, value);
}

function knightAnchor(state) {
  const sc = ensureScenes(state);
  const live = state.entities?.find(
    (e) => e.alive && e.type?.name === 'obj_knight_enemy',
  );
  if (live) {
    return {
      x: live.x,
      y: live.y,
      spriteHeight: sc.knight.spriteHeight,
    };
  }
  return { x: sc.knight.x, y: sc.knight.y, spriteHeight: sc.knight.spriteHeight };
}

export function attachSceneKnight(state) {
  const sc = ensureScenes(state);
  const ent = state.entities?.find(
    (e) => e.alive && e.type?.name === 'obj_knight_enemy',
  );
  if (!ent) { sc.live = null; return sc.knight; }
  if (sc.live === ent) return sc.knight;

  const shadow = sc.knight;
  const kb = (state.knight ??= {});

  if (ent.k_scenefloat === undefined) ent.k_scenefloat = shadow.sceneFloat ?? 0;
  if (ent.k_yoff === undefined) ent.k_yoff = shadow.yoff ?? 0;
  if (ent.remdepth === undefined) ent.remdepth = ent.depth;

  const bind = (obj, key) => ({
    get: () => obj[key],
    set: (v) => { obj[key] = v; },
    enumerable: true,
    configurable: true,
  });
  const live = { spriteHeight: shadow.spriteHeight };
  Object.defineProperties(live, {
    x: bind(ent, 'x'),
    y: bind(ent, 'y'),
    xstart: bind(ent, 'xstart'),
    ystart: bind(ent, 'ystart'),
    siner2: bind(ent, 'siner2'),
    depth: bind(ent, 'depth'),
    remdepth: bind(ent, 'remdepth'),
    spriteIndex: bind(ent, 'sprite_index'),
    imageIndex: bind(ent, 'image_index'),
    imageSpeed: bind(ent, 'image_speed'),
    sceneFloat: bind(ent, 'k_scenefloat'),
    yoff: bind(ent, 'k_yoff'),

    knightState: bind(kb, 'animState'),
  });
  sc.knight = live;
  sc.live = ent;
  return live;
}

function reparentAfterimages(state, depth) {
  for (const e of state.entities ?? []) {
    if (e.alive && e.type?.name === 'obj_afterimage' && e.hspeed === 2) {
      e.depth = depth + 1;
    }
  }
}

export const scriptDelayedVar = {
  name: 'obj_script_delayed',
  create(e) {
    e.visible = false;

    e.varName ??= null;
    e.varValue ??= 0;
  },
  alarm: {
    0(e, state) {

      if (e.varName) setScene(state, e.varName, e.varValue);

      destroy(e);
    },
  },
};

export function scrDelayVar(state, scene, value, frames) {
  ensureScenes(state);
  return spawn(state, scriptDelayedVar, {
    alarm: (() => {
      const a = new Array(12).fill(-1);
      a[0] = frames;
      return a;
    })(),
    varName: scene,
    varValue: value,
  });
}

export function pendingDelays(state) {
  return (state.entities ?? [])
    .filter((e) => e.alive && e.type === scriptDelayedVar)
    .map((e) => ({ scene: e.varName, value: e.varValue, frames: e.alarm[0] }));
}

export function destroyPendingDelays(state) {
  let n = 0;
  for (const e of state.entities ?? []) {
    if (e.alive && e.type === scriptDelayedVar) { destroy(e); n += 1; }
  }
  return n;
}

function hijackTurn(state) {
  const k = state.kaizo;
  k.specialCon = 1;
  k.myfight = 99;
  k.mnfight = 99;
  k.charturn = -1;
}

function prevAtkIsFrenzy1(state) {
  const k = state.kaizo ?? {};
  if (typeof k.prevatk === 'string') return k.prevatk === TP_ARM_PREVATK;
  const last = Array.isArray(k.launched) && k.launched.length
    ? k.launched[k.launched.length - 1]
    : null;
  return !!last && last.name === TP_ARM_PREVATK_NAME;
}

export function armTpscene(state) {
  ensureScenes(state);
  const kn = state.knight ?? {};
  if ((state.kaizo.tpscene ?? 0) !== 0) return false;
  if (!prevAtkIsFrenzy1(state)) return false;
  if (kn.haveusedroaring) return false;
  setScene(state, 'tp', 1);
  hijackTurn(state);
  return true;
}

export function armNhscene(state) {
  ensureScenes(state);
  const kn = state.knight ?? {};
  if ((state.kaizo.nhscene ?? 0) !== 0) return false;
  if (!kn.progamer) return false;
  if (kn.turnsafternohit !== NH_ARM_TURNS) return false;
  setScene(state, 'nh', 1);
  hijackTurn(state);
  return true;
}

export function scrMnendturnScenes(state) {
  ensureScenes(state);
  const kn = state.knight ?? {};
  if (!state.kaizo.sideb || kn.practicemode) return { tp: false, nh: false };
  const tp = armTpscene(state);
  const nh = armNhscene(state);
  return { tp, nh };
}

export const sceneMarker = { name: 'obj_marker' };

export function scrMarker(state, x, y, sprite) {
  const m = spawn(state, sceneMarker, { x, y });
  m.sprite_index = sprite;
  m.image_speed = 0;
  return m;
}

export const shakeObjTarget = {
  name: 'obj_shakeobj',
  create(e) {
    e.visible = false;
    e.active = 0;
    e.target = null;
    e.shakeamt = 10;
    e.shakereduct = 2;
    e.shakespeed = 1;
    e.nowx = 0;
    e.nowy = 0;
    e.on = 1;
    e.timer = 0;
  },
  step(e, state) {

    if (e.active === 0) { destroy(e); return; }
    if (e.active === 1) {
      if (!e.target || !e.target.alive) { destroy(e); return; }
      e.shakeamt -= e.shakereduct;
      e.on *= -1;
      e.target.x = e.nowx + (e.shakeamt * e.on);
      if (e.shakeamt <= 0) destroy(e);
    }
  },
};

export function scrMinishakeobj(state, target) {
  if (!target || !target.alive) return null;
  const sh = spawn(state, shakeObjTarget, { x: target.x, y: target.y });
  sh.target = target;
  sh.shakeamt = 4;
  sh.shakereduct = 1;

  sh.active = 1;
  sh.nowx = target.x;
  sh.nowy = target.y;
  ensureScenes(state).hp.minishakes += 1;
  return sh;
}

function hpsceneMaxhp(state, charId) {
  const slot = slotOf(state, charId);
  if (slot < 0) return 0;
  const arr = state.partyMaxhp;
  if (Array.isArray(arr) && typeof arr[slot] === 'number') return arr[slot];
  const m = memberAt(state, slot);
  if (m && typeof m.maxhp === 'number') return m.maxhp;
  return SIM_PARTY[slot]?.maxhp ?? 0;
}

function hpsceneHp(state, charId) {
  const slot = slotOf(state, charId);
  if (slot < 0) return 0;
  return state.partyHp?.[slot] ?? 0;
}

function hpsceneSetMaxhp(state, charId, value) {
  const slot = slotOf(state, charId);
  if (slot < 0) return;
  if (!Array.isArray(state.partyMaxhp)) {
    state.partyMaxhp = [0, 1, 2].map((s) => hpsceneMaxhp(state, charIdOf(state, s)));
  }
  state.partyMaxhp[slot] = value;
  const m = memberAt(state, slot);
  if (m) m.maxhp = value;
}

function hpsceneSetHp(state, charId, value) {
  const slot = slotOf(state, charId);
  if (slot < 0 || !state.partyHp) return;
  state.partyHp[slot] = value;
}

export function armHpscene(state) {
  const kn = state.knight ?? {};

  if (kn.practicemode || kn.nohitmode) return false;

  const over = (read) => {
    for (let c = 1; c <= 4; c++) {
      if (read(state, c) > HP_CEILINGS[c] && havechar(state, c)) return c;
    }
    return 0;
  };

  const byMaxhp = over(hpsceneMaxhp);
  const byHp = over(hpsceneHp);
  if (!byMaxhp && !byHp) return false;

  const sc = ensureScenes(state);
  setScene(state, 'hp', 1);
  sc.hp.armedBy = { maxhp: byMaxhp || null, hp: byHp || null };
  return true;
}

export const HP_SCENE_STATES = [
  { at: 1, wait: 1.1, delay: [2, 20], draws: 0 },
  { at: 2, wait: 2.1, delay: [3, 16], draws: 0 },
  { at: 3, wait: 3.1, delay: [4, 13], draws: 1 },
  { at: 4, wait: 4.1, delay: [5, 9], draws: 0 },
  { at: 5, wait: 5, delay: [6, 2], draws: 0, bug: 'hp_scene = 5.1' },
  { at: 6, wait: 6.1, delay: [7, 20], draws: 0 },
  { at: 7, wait: 7.1, delay: [7.2, 12], draws: 0 },
  { at: 7.2, wait: 7.1, delay: [8, 14], draws: 0 },
  { at: 8, wait: -1, delay: null, draws: 0 },
];

export const HP_CUT_AT = 6;

function battlecontrollerDepth(state) {
  return state.kaizo?.battlecontrollerDepth ?? 0;
}

const C_WHITE = [255, 255, 255];

export function stepHpscene(state) {
  const k = state.kaizo;
  const s = k.hpscene ?? 0;
  if (s <= 0) return false;
  const sc = ensureScenes(state);
  const kt = sc.knight;
  const vx = state.view?.x ?? 0;
  const vy = state.view?.y ?? 0;

  k.specialCon = 1;

  sc.hp.runs[s] = (sc.hp.runs[s] ?? 0) + 1;

  if (s === 1) {

    kt.sceneFloat = 1;
    k.charturn = -1;
    k.mnfight = 99;
    k.myfight = 99;
    kt.knightState = 10;

    kt.spriteIndex = sc.live?.idlesprite ?? 'spr_roaringknight_idle';
    kt.y = kt.ystart + Math.cos(kt.siner2 / 8) * 8;
    setScene(state, 'hp', 1.1);
    scrDelayVar(state, 'hp', 2, 20);
  } else if (s === 2) {

    kt.x += 26;

    kt.y += -44;
    kt.yoff = -44;
    kt.spriteIndex = 'spr_roaringknight_flurry_prepare';
    cue(state, 'snd_knight_puff');

    if (sc.live?.alive) scrMinishakeobj(state, sc.live);
    setScene(state, 'hp', 2.1);
    scrDelayVar(state, 'hp', 3, 16);
  } else if (s === 3) {

    kt.sceneFloat = 0;

    cue(state, 'snd_knight_beam', 0.1, 0.75);
    kt.remdepth = kt.depth;
    kt.depth = battlecontrollerDepth(state) - 10;
    reparentAfterimages(state, kt.depth);

    const mark = state.entities ? scrMarker(
      state, vx + 320, vy + 339, 'spr_roaringknight_finalslash_mask',
    ) : null;

    const angle = state.gmlRng ? gmlChoose(state.gmlRng, [20, -20]) : 20;
    draw(state, 'hp', 1);
    if (mark) {
      mark.image_xscale = 120;
      mark.image_yscale = 11;
      mark.image_alpha = 0;
      mark.image_angle = angle;

      mark.image_blend = getSwordcolor(state);
      mark.depth = kt.depth + 5;

      scrLerpvar(state, spawn, mark, 'y', vy + 350, vy + 339, 19, L, 'inout');
      scrLerpvar(state, spawn, mark, 'image_angle', mark.image_angle, 0, 21, L, 'inout');
      scrLerpvar(state, spawn, mark, 'image_alpha', -0.15, 0.75, 19);
      scrLerpvar(state, spawn, mark, 'image_yscale', 11, 0.5, 21, L, 'inout');
    }
    sc.hp.mark = mark;

    kt.depth = battlecontrollerDepth(state) - 10;
    kt.x -= 12;
    kt.y += 44;
    kt.spriteIndex = 'spr_roaringknight_attack_ol';
    kt.imageSpeed = 0;
    kt.imageIndex = 1;
    setScene(state, 'hp', 3.1);
    scrDelayVar(state, 'hp', 4, 13);

    noteLerp(state, 'x', kt.x, kt.x + 30, 19, kl('inout'));
    noteLerp(state, 'y', kt.y, kt.y + 120, 19, kl('inout'));
  } else if (s === 4) {

    kt.imageIndex = 2;
    setScene(state, 'hp', 4.1);
    scrDelayVar(state, 'hp', 5, 9);
  } else if (s === 5) {

    cueStop(state, 'snd_knight_beam');

    cue(state, 'snd_knight_cut', 1, 0.8);
    cue(state, 'snd_knight_cut', 0.5, 0.6);

    sc.hp.hpSceneTypo += 1;
    kt.imageIndex = 3;

    noteLerp(state, 'image_index', 3, 5, 2, { knight: true });
    scrDelayVar(state, 'hp', 6, 2);

    scrShakescreen(state, { shakex: 10, shakespeed: 1 });

    const mark = sc.hp.mark;
    if (mark?.alive) {
      mark.image_blend = C_WHITE;
      mark.image_alpha = 1;
      mark.image_yscale = 1;
      mark.image_angle = 0;
      scrLerpvar(state, spawn, mark, 'image_alpha', 1.5, 0, 8);
      scrLerpvar(state, spawn, mark, 'image_yscale', 1, 10, 8);
    }
  } else if (s === 6) {

    const cut = { maxhp: {}, hp: {} };
    for (let c = 1; c <= 4; c++) {
      const before = hpsceneMaxhp(state, c);
      const after = Math.min(before, HP_CEILINGS[c]);
      if (slotOf(state, c) >= 0) {
        hpsceneSetMaxhp(state, c, after);
        cut.maxhp[c] = { before, after };
      }
    }
    for (let c = 1; c <= 4; c++) {
      if (slotOf(state, c) < 0) continue;
      const before = hpsceneHp(state, c);
      const after = Math.min(before, hpsceneMaxhp(state, c));
      hpsceneSetHp(state, c, after);
      cut.hp[c] = { before, after };
    }

    if (!sc.hp.cut) sc.hp.cut = cut;
    setScene(state, 'hp', 6.1);
    scrDelayVar(state, 'hp', 7, 20);
  } else if (s === 7) {

    kt.siner2 = 0;
    setScene(state, 'hp', 7.1);
    scrDelayVar(state, 'hp', 7.2, 12);
    noteLerp(state, 'x', kt.x, kt.xstart, 25, kl('inout'));
    noteLerp(state, 'y', kt.y, kt.ystart + Math.cos(kt.siner2 / 8) * 8, 25, kl('inout'));
  } else if (s === 7.2) {

    kt.depth = kt.remdepth;
    reparentAfterimages(state, kt.depth);
    kt.spriteIndex = 'spr_roaringknight_idle';
    setScene(state, 'hp', 7.1);
    scrDelayVar(state, 'hp', 8, 14);
  } else if (s === 8) {

    kt.sceneFloat = 1;
    msg(state, '\\ck* Not so fast.');
    kt.siner2 = 0;

    k.mnfight = 0;
    k.myfight = 0;

    if (hpsceneHp(state, 1) > 0) k.charturn = 0;
    else if (hpsceneHp(state, 2) > 0) k.charturn = 1;
    else k.charturn = 2;
    if (state.menu) state.menu.charturn = k.charturn;

    sc.hp.handback = { frame: state.frame, charturn: k.charturn, applied: false };
    setScene(state, 'hp', -1);
    k.specialCon = 0;
    kt.knightState = 0;
    kt.yoff = 0;

    if (sc.hp.mark?.alive) destroy(sc.hp.mark);
    sc.hp.mark = null;
  }

  floatKnight(state);
  return true;
}

export function applySceneHandbackCharturn(state) {
  const hb = state.kaizo?.scenes?.hp?.handback;
  if (!hb || hb.applied) return null;
  hb.applied = true;
  if (state.menu) state.menu.charturn = hb.charturn;
  return hb.charturn;
}

export const TP_SCENE_STATES = [
  { at: 1, wait: 1.1, delay: [2, 8], draws: 0 },
  { at: 2, wait: 2.1, delay: [3, 8], draws: 0 },
  { at: 3, wait: 3.1, delay: [4, 7], draws: 0 },
  { at: 4, wait: 4.1, delay: [5, 1], draws: 0 },
  { at: 5, wait: 10, delay: [11, 24], draws: 3 },
  { at: 11, wait: 11.1, delay: [11.2, 12], draws: 0 },
  { at: 11.2, wait: 11.1, delay: [12, 14], draws: 0 },
  { at: 12, wait: -1, delay: null, draws: 0 },
];

export const TP_CLAMP_ARMED_AT = 5;

export function stepTpscene(state) {
  const k = state.kaizo;
  const s = k.tpscene ?? 0;
  if (s <= 0) return false;
  const sc = ensureScenes(state);
  const kt = sc.knight;

  if (s === 1) {
    cue(state, 'snd_knight_jump_quick');
    k.charturn = -1;
    k.mnfight = 99;
    k.myfight = 99;
    kt.knightState = 10;
    kt.sceneFloat = 0;
    setScene(state, 'tp', 1.1);
    kt.spriteIndex = 'spr_roaringknight_attack_ol';
    kt.imageSpeed = 0;
    kt.imageIndex = 0;
    scrDelayVar(state, 'tp', 2, 8);
    noteLerp(state, 'x', kt.x, kt.x + 32, 8, kl('inout'));
    noteLerp(state, 'y', kt.y, kt.y - 40, 8, kl('inout'));
  } else if (s === 2) {
    setScene(state, 'tp', 2.1);
    kt.imageIndex = 1;
    scrDelayVar(state, 'tp', 3, 8);

    const vx = state.view?.x ?? 0;
    const vy = state.view?.y ?? 0;
    noteLerp(state, 'x', kt.x, vx + 320, 8, kl('in'));
    noteLerp(state, 'y', kt.y, vy + 24, 8, kl('in'));
  } else if (s === 3) {
    setScene(state, 'tp', 3.1);
    kt.imageIndex = 2;
    scrDelayVar(state, 'tp', 4, 7);
    const vx = state.view?.x ?? 0;
    const vy = state.view?.y ?? 0;
    noteLerp(state, 'x', kt.x, vx + 48, 7, kl('out'));
    noteLerp(state, 'y', kt.y, vy + 64, 7, kl('out'));
  } else if (s === 4) {

    kt.remdepth = kt.depth;
    kt.depth = (state.kaizo.tensionbarDepth ?? 0) - 1;
    reparentAfterimages(state, kt.depth);
    setScene(state, 'tp', 4.1);
    scrDelayVar(state, 'tp', 5, 1);
    cue(state, 'snd_knight_cut');

    noteLerp(state, 'image_index', 3, 5, 3, { knight: true });
    noteLerp(state, 'x', kt.x, kt.x - 64, 8, kl('out'));
  } else if (s === 5) {

    setScene(state, 'tp', 10);
    scrDelayVar(state, 'tp', 11, 24);
    cue(state, 'snd_impact');
    cue(state, 'snd_glassbreak', 0.8, 1);
    cue(state, 'snd_glassbreak', 1, 0.9);

    const rng = state.gmlRng;
    const imageAngle = rng ? gmlRandomRange(rng, 1, 10) : 0;
    const hspeed = rng ? gmlRandomRange(rng, -5, -7) : 0;
    const vspeed = rng ? gmlRandomRange(rng, -2, -5) : 0;
    draw(state, 'tp', 3);
    sc.tp.deadtp = {
      sprite: 'spr_tensionbar_sliced_top',
      imageAngle, hspeed, vspeed, gravity: 0.25,
      spawnedFrame: state.frame,
    };

    sc.shake = { shakex: 8, shakespeed: 1, frame: state.frame };
    scrShakescreen(state, { shakex: 8, shakespeed: 1 });
  } else if (s === 11) {
    kt.depth = kt.remdepth;
    reparentAfterimages(state, kt.depth);

    kt.siner2 = 0;
    setScene(state, 'tp', 11.1);
    scrDelayVar(state, 'tp', 11.2, 12);
    noteLerp(state, 'x', kt.x, kt.xstart, 25, kl('inout'));
    noteLerp(state, 'y', kt.y, kt.ystart + Math.cos(kt.siner2 / 8) * 8, 25, kl('inout'));
  } else if (s === 11.2) {
    kt.spriteIndex = 'spr_roaringknight_idle';
    setScene(state, 'tp', 11.1);
    scrDelayVar(state, 'tp', 12, 14);
  } else if (s === 12) {
    kt.yoff = 0;
    kt.sceneFloat = 1;
    msg(state, '\\ck* Let\'s keep this interesting.');

    if (!state.kaizo.didspell) {
      sc.tp.nospellsaw = 1;
      state.kaizo.nospellsaw = 1;
      msg(state, '\\ck* No spells yet...^1?&* Guess you didn\'t need that anyways.');
    }
    kt.siner2 = 0;

    (sc.onMnendturn ?? scrMnendturnScenes)(state);
    setScene(state, 'tp', -1);
    state.kaizo.specialCon = 0;
    kt.knightState = 0;
    sc.tp.deadtp = null;
  }

  floatKnight(state);
  return true;
}

function floatKnight(state) {
  const kt = ensureScenes(state).knight;
  if (kt.knightState === 10 && kt.sceneFloat) {
    kt.y = kt.ystart + kt.yoff + Math.cos(kt.siner2 / 8) * 8;
  }
}

export const NH_SCENE_STATES = [
  { at: 1, wait: 1.1, delay: [2, 10], draws: 0 },
  { at: 2, wait: 3, delay: null, draws: 0 },
  { at: 3, wait: 3.1, delay: [4, 20], draws: 0 },
  { at: 4, wait: 5, delay: null, draws: 0 },
  { at: 5, wait: 6, delay: [7, 65], draws: 8 },
  { at: 7, wait: 8, delay: null, draws: 0 },
  { at: 8, wait: -1, delay: null, draws: 0 },
];

export const NH_STAR_FLIGHT = 135;

export function stepNhscene(state) {
  const k = state.kaizo;
  const s = k.nhscene ?? 0;
  if (s <= 0) return false;
  const sc = ensureScenes(state);
  const kt = sc.knight;
  const kn = state.knight ?? {};

  k.specialCon = 1;

  if (s === 1) {
    setScene(state, 'nh', 1.1);
    scrDelayVar(state, 'nh', 2, 10);
  } else if (s === 2) {
    setScene(state, 'nh', 3);
    kt.knightState = 10;
    kt.sceneFloat = 1;
    kt.y = kt.ystart + Math.cos(kt.siner2 / 8) * 8;
    msg(state, '\\ck* ^2.^2.^2.&* Well^1, if you truly insist...^4 ^3 ^3 %%');
    sc.writerOpen = true;
  } else if (s === 3) {
    if (!writerExists(state, sc)) {
      sc.nh.siner = kt.siner2;
      kt.sceneFloat = 0;
      kt.spriteIndex = 'spr_roaringknight_point_ol';
      kt.imageIndex = 0;
      kt.imageSpeed = 0;
      noteLerp(state, 'image_index', 0, 4, 3, { knight: true });
      setScene(state, 'nh', 3.1);
      scrDelayVar(state, 'nh', 4, 20);
    }
  } else if (s === 4) {
    cue(state, 'snd_stardrop');

    sc.musicPaused = true;
    const anchor = nhTargetAnchor(state);
    setScene(state, 'nh', 5);
    sc.nh.star = {
      x: kt.x + 28,
      y: kt.y + 60,
      targetX: anchor.x,
      targetY: anchor.y,

      flight: NH_STAR_FLIGHT,
      sprite: 'spr_knight_bullet_star',
    };
  } else if (s === 5) {
    const star = sc.nh.star;
    if (star) star.flight -= 1;

    const arrived = !!star && star.flight <= 0;
    if (arrived) {
      if (kn.nohitmode) {

        kn.progamer = false;
        setScene(state, 'nh', 0);
        k.mnfight = 99;
        k.myfight = 99;
      } else {
        kn.progamer = false;
        kn.didfullnohit = false;
        setScene(state, 'nh', 6);
        scrDelayVar(state, 'nh', 7, 65);
        cue(state, 'snd_bageldefeat', 0.8, 0.8);
        cue(state, 'snd_damage');
        cue(state, 'snd_glassbreak', 0.4, 0.8);
        cue(state, 'snd_glassbreak', 0.3, 0.6);
        cue(state, 'snd_impact', 0.5, 0.8);

        sc.writers.push({ frame: state.frame, x: star.x + 128, y: star.y,
          damage: NH_DAMAGE_TEXT, type: 0 });
        const rng = state.gmlRng;
        for (let i = 0; i < 4; i++) {
          const ox = rng ? gmlRandomRange(rng, -64, 64) : 0;
          const oy = rng ? gmlRandomRange(rng, -60, 16) : 0;
          sc.writers.push({ frame: state.frame, x: star.x + ox, y: star.y + oy,
            damage: null, type: 12 });
        }
        draw(state, 'nh', 8);

        if (Array.isArray(state.partyHp) && rosterSize(state) > 0) {
          state.partyHp[0] = NH_KILL_HP;
        }
        scrDead(state, 0);
        sc.nh.star = null;
      }
    }
  } else if (s === 7) {
    setScene(state, 'nh', 8);
    kt.spriteIndex = 'spr_roaringknight_idle2';
    msg(state, '\\ck* There we go. ^4 ^3 ^3 %%');
    sc.writerOpen = true;
  } else if (s === 8) {
    if (!writerExists(state, sc)) {

      const dl = (ensureFreezeState(state).downLatch ??= {
        kris: false, susie: false, ralsei: false, noelle: false,
      });
      dl.kris = true;
      dl.susie = true;
      dl.ralsei = true;
      dl.noelle = true;
      const who = nhVictimName(state);
      msg(state, `* ${who} was..^3. uh..^3.&* Yeah^1, I've got nothing.`);
      sc.musicPaused = false;
      kt.spriteIndex = 'spr_roaringknight_idle';
      kt.siner2 = sc.nh.siner;
      (sc.onMnendturn ?? scrMnendturnScenes)(state);
      setScene(state, 'nh', -1);
      k.specialCon = 0;
      kt.knightState = 0;
    }
  }

  floatKnight(state);
  return true;
}

function writerExists(state, sc) {
  if (state.dialogue && state.dialogue.text) return true;
  if (sc.writerOpen) { sc.writerOpen = false; return true; }
  return false;
}

function nhTargetAnchor(state) {
  const a = writerAnchor(state, 0);
  return { x: a.x + 16, y: a.y };
}

function nhVictimName(state) {
  const r = state.kaizo?.roster;
  return r && r[0] ? (r[0].name ?? 'KRIS') : 'KRIS';
}

export const SNOWGRAVE_SPAWN_WINDOW = [20, 75];
export const SNOWGRAVE_SPAWN_OFFSETS = [
  [455, 560], [500, 600], [545, 520],
];
export const SNOWGRAVE_DESTROY_TIMER = 120;

export const snowgraveSpell = {
  name: 'obj_spell_snowgrave',
  create(e) {

    e.visible = true;
    e.depth = 0;

    e.bgalpha = 0;
    e.snowspeed = 0;
    e.timer = 0;

    e.caster ??= 0;
    e.damage ??= 0;
    e.altpath = 0;
  },

  endStep(e, state) {
    e.timer += 1;
    const [lo, hi] = SNOWGRAVE_SPAWN_WINDOW;
    if (e.timer >= lo && e.timer <= hi) {
      const vx = state.view?.x ?? 0;
      const vy = state.view?.y ?? 0;
      for (const [ox, oy] of SNOWGRAVE_SPAWN_OFFSETS) {
        spawn(state, snowgraveSnowflake, {
          x: vx + ox,
          y: vy + oy,
          gravity: -2,
          vspeed: Math.sin(e.timer / 2) * 0.5,
          siner: e.timer / 2,
        });
      }
    }
    if (e.timer === SNOWGRAVE_DESTROY_TIMER) destroy(e);
  },

  draw(e) {
    e.bgalphaDrawn = e.bgalpha;
    e.snowspeedDrawn = e.snowspeed;

    if (e.timer <= 10 && e.timer >= 0) {
      if (e.bgalpha < 0.5) e.bgalpha += 0.05;
    }

    if (e.timer >= 0) e.snowspeed += 20 + e.timer / 5;

    if (e.timer >= 90 + e.altpath * 30) {
      if (e.altpath === 0) {
        if (e.bgalpha > 0) e.bgalpha -= 0.02;
      }
      if (e.altpath === 1) e.bgalpha -= 0.005;
    }
  },
};

function flakes(state) {
  return (state.entities ?? []).filter(
    (e) => e.alive && e.type === snowgraveSnowflake,
  );
}

function setMotion(e, speed, direction) {
  e.speed = speed;
  e.direction = direction;
  e.hspeed = lengthdirX(speed, direction);
  e.vspeed = lengthdirY(speed, direction);
}

function armFlakeLerp(f, varname, from, to, maxtime) {
  (f.drawLerps ??= []).push({ varname, from, to, maxtime, time: 0, fresh: true });
}

export const snowgraveSnowflake = {
  name: 'obj_spell_snowgrave_snowflake',
  create(e) {

    e.visible = true;

    e.componentMotion = true;
    e.image_xscale = 2;
    e.image_yscale = 2;

    e.siner ??= 0;
    e.timer = 0;
    e.image_alpha = 1;
    e.con = 0;
    e.tarX = -4;
    e.tarY = -4;

    e.depth = e.depth ?? 0;
    e.tardep = e.depth;
    e.flakenum = 0;
    e.flakescale = 1;
    e.hspeed = e.hspeed ?? 0;
    e.vspeed = e.vspeed ?? 0;
  },
  step(e, state) {
    const sc = ensureScenes(state);
    const rng = state.gmlRng;

    if (e.con < 1) e.siner += 1;
    e.timer += 1;

    if (e.con === 0) {
      if (e.timer >= 30) { destroy(e); return; }
    } else if (e.con === 1) {
      e.vspeed = 0;
      e.gravity = 0;
      e.siner = lerp(e.siner, 0, 0.5);
      if (Math.abs(e.siner) < 1) e.siner = 0;
      e.x = lerp(e.x, e.tarX, 0.21);
      e.y = lerp(e.y, e.tarY, 0.21);
    } else if (e.con === 2) {
      e.siner = 0;

      e.timer = gmlRound(-1 - (e.flakenum / 6));
      e.con = 2.1;

      const dir = pointDirection(e.x, e.y, e.tarX, e.tarY)
        + (rng ? gmlRandomRange(rng, -5, 5) : 0);
      const spd = rng ? gmlRandomRange(rng, 0.25, 0.5) : 0.375;
      draw(state, 'flakes', 2);
      setMotion(e, spd, dir);
    } else if (e.con === 2.1) {
      e.siner = 0;
      if (e.timer >= 0) {
        noteLerp(state, 'flakescale', e.flakescale, 0.8, 12);
        armFlakeLerp(e, 'flakescale', e.flakescale, 0.8, 12);

        e.friction = -1.2 - (rng ? gmlRandom(rng, 1) : 0.5);
        draw(state, 'flakes', 1);
        e.con = 3;
        e.timer = 0;
      }
    } else if (e.con === 3) {
      e.siner = 0;
      if (Math.abs(e.tarX - e.x) < 120) e.depth = e.tardep;
      if (Math.abs(e.tarX - e.x) < 36) {

        const cur = state.kaizo.sgscene ?? 0;
        const next = Math.max(6, cur);
        if (next !== cur) setScene(state, 'sg', next);

        if (charIdOf(state, sc.sg.target) === 4) {
          e.con = 4;
          e.hspeed /= 5;
          noteLerp(state, 'flakescale', e.flakescale, 0.25, 20);
          armFlakeLerp(e, 'flakescale', e.flakescale, 0.25, 20);

          const mag = rng ? gmlRandomRange(rng, 3, 6) : 4.5;
          const sign = rng ? gmlChoose(rng, [1, -1]) : 1;
          e.vspeed = mag * sign;
          const pitch = 1.1 + (rng ? gmlRandom(rng, 0.3) : 0.15);
          draw(state, 'flakes', 3);
          cue(state, 'snd_graze', pitch, 0.6);
        }
      }

      if (e.timer === 60) { destroy(e); return; }
    } else if (e.con === 4) {
      e.siner = 0;
      e.image_alpha = Math.max(0, e.image_alpha - 0.08);
      e.friction = 2;
      if (e.timer === 60) { destroy(e); return; }
    }

    if (e.friction) {
      let s = e.speed;
      if (s > 0) { s -= e.friction; if (s < 0) s = 0; } else if (s < 0) {
        s += e.friction; if (s > 0) s = 0;
      }
      if (s !== e.speed) setMotion(e, s, e.direction);
    }
    if (e.gravity) {
      e.hspeed += lengthdirX(e.gravity, e.gravity_direction);
      e.vspeed += lengthdirY(e.gravity, e.gravity_direction);
    }
  },

  draw(e) {

    const fs = e.flakescale;
    e.image_xscale = (e.con === 0 && e.timer > 0 ? Math.sin(e.siner - 1) * 2 : 2) * fs;
    e.image_yscale = 2 * fs;

    const lerps = e.drawLerps;
    if (lerps && lerps.length) {
      for (const t of lerps) {
        if (t.fresh) { t.fresh = false; continue; }
        t.time += 1;
        e[t.varname] = lerp(t.from, t.to, t.time / t.maxtime);
      }
      e.drawLerps = lerps.filter((t) => t.fresh || t.time < t.maxtime);
    }
  },
};

export const SG_SCENE_STATES = [
  { at: 1, wait: 1.1, delay: [2, 17], draws: 2 },
  { at: 2, wait: 2.1, delay: [3.1, 2], draws: 0 },
  { at: 3.1, wait: 3, delay: [4, 75], draws: 0 },
  { at: 3, wait: 3, delay: null, draws: 'per-flake' },
  { at: 4, wait: 4.1, delay: [5, 25], draws: 'per-flake' },
  { at: 4.1, wait: 4.1, delay: null, draws: 'per-flake' },
  { at: 5, wait: 5.1, delay: null, draws: 3 },
  { at: 6, wait: 6.1, delay: [7, 25], draws: 0 },
  { at: 6.1, wait: 6.1, delay: null, draws: '2 or 3' },
  { at: 7, wait: 7.1, delay: [8, 30], draws: 0 },
  { at: 8, wait: 0, delay: null, draws: 0 },
];

export function castSnowgrave(state, { caster = 0, magic = 13 } = {}) {
  const sc = ensureScenes(state);
  const k = state.kaizo;
  k.didspell = 1;
  const damage = Math.ceil(magic * 40 + 600);
  const spell = spawn(state, snowgraveSpell, { caster, damage });
  k.spelldelay = SNOWGRAVE_SPELLDELAY;
  sc.sg.caster = caster;
  sc.sg.spell = spell;
  return spell;
}

export function armSgsceneIfSpell(state) {
  ensureScenes(state);
  if ((state.kaizo.sgscene ?? 0) !== 0) return false;
  const spell = (state.entities ?? []).find(
    (e) => e.alive && e.type === snowgraveSpell,
  );
  if (!spell) return false;
  setScene(state, 'sg', 1);
  return true;
}

export function stepSgscene(state) {
  const k = state.kaizo;
  const s = k.sgscene ?? 0;
  if (s <= 0) return false;
  const sc = ensureScenes(state);
  const kt = sc.knight;
  const kn = state.knight ?? {};
  const rng = state.gmlRng;
  const snowS = SNOW_SCATTER;
  const anchor = knightAnchor(state);

  if (s > 1 && sc.sg.vol > 0 && (state.frame % 2) === 0) {
    const pitch = sc.sg.pit + (rng ? gmlRandom(rng, 0.5) : 0.25);
    draw(state, 'sg', 1);
    cue(state, 'snd_wing', pitch, sc.sg.vol);
  }

  if (s === 1) {
    kt.sceneFloat = 1;
    kt.y = kt.ystart + Math.cos(kt.siner2 / 8) * 8;
    k.spelldelay = SG_SPELLDELAY_STALL;

    const before = rng?.draws ?? 0;
    sc.sg.target = scrPicktargetWeighted(state, 5, 4, 3, 1);
    draw(state, 'sg', (rng?.draws ?? 0) - before);
    sc.sg.num = 0;
    sc.sg.pit = 0.7;
    sc.sg.vol = 0;
    sc.sg.cyc = 0;
    setScene(state, 'sg', 1.1);
    scrDelayVar(state, 'sg', 2, 17);
    kt.spriteIndex = 'spr_roaringknight_idle';
    kt.knightState = 10;
  } else if (s === 2) {
    setScene(state, 'sg', 2.1);
    scrDelayVar(state, 'sg', 3.1, 2);
    kt.spriteIndex = 'spr_roaringknight_point_ol';
    kt.imageIndex = 0;
    kt.imageSpeed = 0;
    noteLerp(state, 'image_index', 0, 3, 3, { knight: true });
  } else if (s === 3.1) {
    setScene(state, 'sg', 3);
    scrDelayVar(state, 'sg', 4, 75);

    sc.sg.pitLerp = { from: 0.7, to: 1.1, frames: 75, t: 0 };

    noteLerp(state, 'k_sgpit', 0.7, 1.1, 75, { knight: true });
  } else if (s === 3) {

    const snowX = 28;
    const snowY = 60;
    for (const f of flakes(state)) {
      if (!f.alive) continue;

      if (f.con === 1 && (state.frame % 5) === 0) {
        f.tarX = anchor.x + snowX + (rng ? gmlRandomRange(rng, -snowS, snowS) : 0);
        f.tarY = anchor.y + snowY + (rng ? gmlRandomRange(rng, -snowS, snowS) : 0);
        f.image_alpha = 0.05 + (rng ? gmlRandom(rng, 0.4) : 0.2);
        draw(state, 'sg', 3);
      }

      if (f.y < (anchor.y + anchor.spriteHeight + 40) && f.con === 0) {
        sc.sg.cyc += 1;
        if ((sc.sg.cyc % 2) === 0) {
          sc.sg.vol += 0.025;
          if (sc.sg.vol > sc.sg.peakVol) sc.sg.peakVol = sc.sg.vol;
          noteLerp(state, 'flakescale', 1, 0.32, 12);
          f.image_alpha_target = 0.1 + (rng ? gmlRandom(rng, 0.2) : 0.1);

          armFlakeLerp(f, 'flakescale', 1, 0.32, 12);
          armFlakeLerp(f, 'image_alpha', f.image_alpha, f.image_alpha_target, 12);
          f.flakenum = sc.sg.num;
          sc.sg.num += 1;
          f.con = 1;
          f.tarX = anchor.x + snowX + (rng ? gmlRandomRange(rng, -snowS, snowS) : 0);
          f.tarY = anchor.y + snowY + (rng ? gmlRandomRange(rng, -snowS, snowS) : 0);
          draw(state, 'sg', 3);
        } else {
          destroy(f);
        }
      }
    }
  } else if (s === 4) {

    setScene(state, 'sg', 4.1);
    scrDelayVar(state, 'sg', 5, 25);
    const snowX = 136;
    const snowY = 48;
    kt.spriteIndex = 'spr_roaringknight_attack_ol';
    kt.imageIndex = 1;
    noteLerp(state, 'image_index', 1, 2, 4, { knight: true });

    for (const e of state.entities ?? []) {
      if (e.alive && e.type === snowgraveSpell) e.timer = 89;
    }
    for (const f of flakes(state)) {
      if (!f.alive) continue;
      if (f.con < 1) {
        noteLerp(state, 'flakescale', 1, 0.3, 8);
        f.image_alpha_target = 0.1 + (rng ? gmlRandom(rng, 0.2) : 0.1);

        armFlakeLerp(f, 'flakescale', 1, 0.3, 8);
        armFlakeLerp(f, 'image_alpha', f.image_alpha, f.image_alpha_target, 8);
        draw(state, 'sg', 1);
      }
      f.con = 1;
      f.tarX = anchor.x + snowX + (rng ? gmlRandomRange(rng, -snowS, snowS) : 0);
      f.tarY = anchor.y + snowY + (rng ? gmlRandomRange(rng, -snowS, snowS) : 0);
      draw(state, 'sg', 2);
    }
  } else if (s === 4.1) {

    const snowX = 136;
    const snowY = 48;
    for (const f of flakes(state)) {
      if (!f.alive) continue;
      if (f.con === 1 && (state.frame % 5) === 0) {
        f.image_alpha = 0.05 + (rng ? gmlRandom(rng, 0.4) : 0.2);
        f.tarX = anchor.x + snowX + (rng ? gmlRandomRange(rng, -snowS, snowS) : 0);
        f.tarY = anchor.y + snowY + (rng ? gmlRandomRange(rng, -snowS, snowS) : 0);
        draw(state, 'sg', 3);
      }
    }
  } else if (s === 5) {

    cue(state, 'snd_knight_cut');
    setScene(state, 'sg', 5.1);
    noteLerp(state, 'image_index', 3, 5, 3, { knight: true });
    const a = writerAnchor(state, sc.sg.target);
    const tarX = a.x + 16;
    const tarY = a.y;
    sc.sg.vol = 0;

    state.kaizo.sgdmg = 0;
    sc.sg.ticks = 0;

    for (let i = 0; i < 3; i++) {
      const pitch = rng ? gmlRandomRange(rng, 0.3, 0.7) : 0.5;
      cue(state, 'snd_rocket_bc', pitch, 0.8);
    }
    draw(state, 'sg', 3);
    for (const f of flakes(state)) {
      if (!f.alive) continue;
      f.x -= 48;
      f.y += 22;

      noteLerp(state, 'image_alpha', f.image_alpha, 1, 8);
      armFlakeLerp(f, 'image_alpha', f.image_alpha, 1, 8);

      f.tardep = slotDepth(sc.sg.target) - 1;
      f.con = 2;
      f.tarX = tarX;
      f.tarY = tarY;
    }

  } else if (s === 6) {

    scrDelayVar(state, 'sg', 7, 25);
    setScene(state, 'sg', 6.1);
    if (kn.nohitmode) {
      kn.progamer = false;
      setScene(state, 'sg', 0);
      k.mnfight = 99;
      k.myfight = 99;
    }
  } else if (s === 6.1) {

    const before = rng?.draws ?? 0;
    const r = stepSnowgraveFreeze(state, { target: sc.sg.target });
    draw(state, 'sg', (rng?.draws ?? 0) - before);
    sc.sg.ticks += 1;
    if (r.frozen) sc.sg.frozeOn = state.frame;
  } else if (s === 7) {

    kt.knightState = 0;
    scrDelayVar(state, 'sg', 8, 30);
    setScene(state, 'sg', 7.1);
    const a = writerAnchor(state, sc.sg.target);
    const casterChar = charIdOf(state, sc.sg.caster);
    sc.writers.push({
      frame: state.frame,
      x: a.x + 24,
      y: a.y,
      damage: state.kaizo.sgdmg ?? 0,

      type: casterChar === 4 ? 6 : casterChar - 1,
    });
    if (state.kaizo.faceaction) state.kaizo.faceaction[sc.sg.target] = 0;
    const targetChar = charIdOf(state, sc.sg.target);
    if (targetChar !== 4) {
      if ((state.partyHp?.[sc.sg.target] ?? 1) <= 0) {
        sc.recruitanim = { frame: state.frame, x: a.x + 38, y: a.y - 32, imageIndex: 12 };
      }
    } else {
      sc.noelleShake = state.frame;
    }
  } else if (s === 8) {

    for (const f of flakes(state)) destroy(f);
    for (const e of state.entities ?? []) {
      if (e.alive && e.type === snowgraveSpell) destroy(e);
    }
    k.spelldelay = SG_SPELLDELAY_RELEASE;
    setScene(state, 'sg', 0);
    kt.sceneFloat = 1;
    kt.yoff = 0;
  }

  const pl = sc.sg.pitLerp;
  if (pl && pl.t < pl.frames) {
    pl.t += 1;
    sc.sg.pit = pl.from + (pl.to - pl.from) * (pl.t / pl.frames);
  }

  floatKnight(state);
  return true;
}

export function stepScenes(state) {
  ensureScenes(state);
  const nh = stepNhscene(state);
  armSgsceneIfSpell(state);
  const sg = stepSgscene(state);
  const blockOpen = !!state.kaizo.sideb || (state.kaizo.hpscene ?? 0) > 0;
  const hp = blockOpen ? stepHpscene(state) : false;
  const tp = blockOpen ? stepTpscene(state) : false;
  return {
    nh, sg, hp, tp,
  };
}

export const kaizoSceneDriver = {
  name: 'kaizo_knight_scenes',
  create(e, state) {
    e.visible = false;
    ensureScenes(state);
  },
  step(e, state) {
    stepScenes(state);
  },
};

export function sceneReport(state) {
  const sc = ensureScenes(state);
  const k = state.kaizo;
  return {
    hpscene: k.hpscene ?? 0,
    hpcut: sc.hp.cut,
    tpscene: kaizoTpscene(state),
    sgscene: k.sgscene ?? 0,
    nhscene: k.nhscene ?? 0,
    clampActive: kaizoTensionClampActive(state),
    hijacked: sceneHijacksTurn(state),
    spellphaseStalled: sceneStallsSpellphase(state),
    target: sc.sg.target,
    flakes: flakes(state).length,
    draws: { ...sc.draws },
    transitions: sc.log.length,
  };
}

export function visitedStates(state, scene) {
  const seen = [];
  for (const t of ensureScenes(state).log) {
    if (t.scene === scene && !seen.includes(t.to)) seen.push(t.to);
  }
  return seen;
}
