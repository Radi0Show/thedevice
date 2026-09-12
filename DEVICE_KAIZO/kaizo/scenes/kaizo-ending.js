

import { spawn, destroy } from '../../sim/entity.js';
import { gmlIrandomRange, gmlRandomRange } from '../../sim/rng.js';
import { kaizoFunchance } from '../party/freeze.js';
import { lengthdirX, lengthdirY } from '../../sim/gml.js';
import { cue, cueLoop } from '../../sim/audio.js';
import { scrLerpvar } from '../../sim/lerpvar.js';
import { scrShakescreen } from '../../sim/shake.js';

export const SPR = Object.freeze({
  fxHitback: 'spr_fx_hitback',
  knightCrescentslash: 'spr_knight_crescentslash',
  krisdDark: 'spr_krisd_dark',
  krislDark: 'spr_krisl_dark',
  krisrDark: 'spr_krisr_dark',
  pixelWhite: 'spr_pixel_white',
  ralseiDefeat: 'spr_ralsei_defeat',
  ralseiDownSurprised2: 'spr_ralsei_down_surprised2',
  ralseiShockedRight: 'spr_ralsei_shocked_right',
  ralseiShockedStandingRight: 'spr_ralsei_shocked_standing_right',
  ralseiSurprisedLeftWalk: 'spr_ralsei_surprised_left_walk',
  ralseiSurprisedRightWalk: 'spr_ralsei_surprised_right_walk',
  ralseiSwoon: 'spr_ralsei_swoon',
  ralseiWalkDownUnhappy: 'spr_ralsei_walk_down_unhappy',
  ralseiWalkLeftUnhappy: 'spr_ralsei_walk_left_unhappy',
  ralseiWalkRightSad: 'spr_ralsei_walk_right_sad',
  ralseiWalkRightUnhappy: 'spr_ralsei_walk_right_unhappy',
  ralseiWalkUpSad: 'spr_ralsei_walk_up_sad',
  rkQuickslash: 'spr_rk_quickslash',
  roaringKnightClashPullBack: 'spr_roaring_knight_clash_pull_back',
  roaringKnightSusieClash: 'spr_roaring_knight_susie_clash',
  roaringknightAttackOverworld: 'spr_roaringknight_attack_overworld',
  roaringknightFaceawayTurning: 'spr_roaringknight_faceaway_turning',
  roaringknightFlurryPrepare: 'spr_roaringknight_flurry_prepare',
  roaringknightIdle: 'spr_roaringknight_idle',
  roaringknightSwordBreakPieceSmall: 'spr_roaringknight_sword_break_piece_small',
  shineWhite: 'spr_shine_white',
  susieClashJump: 'spr_susie_clash_jump',
  susieDwFell: 'spr_susie_dw_fell',
  susieDwJumpBallFixed: 'spr_susie_dw_jump_ball_fixed',
  susieHurt: 'spr_susie_hurt',
  susierDarkUnhappy: 'spr_susier_dark_unhappy',
  susieWalkDownDwUnhappy: 'spr_susie_walk_down_dw_unhappy',
  susieWalkLeftDwUnhappy: 'spr_susie_walk_left_dw_unhappy',
  susieWalkRightDwUnhappy: 'spr_susie_walk_right_dw_unhappy',
  susiebIdleSerious: 'spr_susieb_idle_serious',
});

export const ENDING_SPRITES = Object.freeze(Object.values(SPR));

export const CON_VICTORY = 49;

export const CON_VICTORY_SIDEB = 49.1;

export const CON_LOSS = 9;

export const CON_ALARM_FRAMES = 30;

export const FLAG_WEIRD_ROUTE = 456;

export const FLAG_KNIGHT_OUTCOME = 50;

export const FLAG_KNIGHT_VIOLENCED = 51;

export const CAM_X = 2230;

export const CLASH_CAM_X = 2400;

export const CAM_KICK = -160;

export const CAM_KICK_FRAMES = 20;
export const CAM_KICK_RELEASE = 21;

export const SB_CLASH_BREAK = 124;

export const CLASH_SHAKE_TIME = 80;
export const CLASH_SHAKE_STEP = 10;

export const CLASH_SHAKE_FLOOR = 30;

export const CLASH_FINISH_TIME = 300;

export const CLASH_JUMP_BACK_TIME = 320;

export const OUCHIE_SUSIE = [7000, 9000];

export const OUCHIE_RALSEI = [45000, 57500];

export const SWOON_CHANCE = 20;

export const FAKEOUT_CHANCE = 100;

export const SWOON_SPRITE = SPR.ralseiSwoon;

export const DEFEAT_SPRITE = SPR.ralseiDefeat;

export const FACEAWAY_SPRITE = SPR.roaringknightFaceawayTurning;

export const SLASH_SPRITE = SPR.rkQuickslash;

export const SLASH_OFFSET = [40, 216];

export const SUSIE_LAUNCH = [150, 140, 216];

export const BOARD_OCEAN = 'board_ocean.ogg';
export const BOARD_OCEAN_VOL = 0.7;
export const BOARD_OCEAN_FADE = 240;

export const SB_TERMINAL = 99;
export const SB_TERMINAL_AT = 555;

export const ASIDE_RESUMES_AT_CON = 10;

export const CLASH_OVERLAY_DEFAULT = [8, 1];
export const CLASH_OVERLAY_HALF = [8, 0.5];

export const WARP_SETTLE = 95;

export const ENDING_DIALOGUE_FRAMES = 90;

export const ENDING_APPROX = [
  {
    what: 'the con-50.1 cutscene-master script',
    stand_in: 'a beat list with frame waits; obj_cutscene_master is not an instance here',
    gml: 'gml_Object_obj_ch3_PTB02_Step_0.gml:1181-1246',
  },
  {
    what: 'roaring_knight_warp settle duration',
    stand_in: `${WARP_SETTLE} frames, inherited from sim/victory-scene.js, not re-derived`,
    gml: 'gml_Object_obj_ch3_PTB02_Step_0.gml:1215-1216',
  },
  {

    what: 'scr_shakeobj_ext / scr_minishakeobj as instances, and the knight Step\'s shake RNG',
    stand_in: 'draw-time jitter, a pure function of state.frame; the real one is '
      + 'random_range(-shakeamt, shakeamt) in the knight\'s own Step, which this '
      + 'scene does not run and whose draws the RNG budget does not count',
    gml: 'gml_Object_obj_ch3_PTB02_roaringknight_Step_0.gml (shakeamt/shaketimer)',
  },
  {
    what: 'obj_afterimage / obj_afterimage_grow as instances',
    stand_in: 'bounded records on the emitting actor (endingAfterimages), with '
      + 'obj_afterimage\'s own fadeSpeed ramp and drift; nothing reads their positions',
    gml: 'gml_Object_obj_ch3_PTB02_Step_0.gml:2078-2087',
  },
  {
    what: 'obj_writer / obj_face / obj_dialoguer as instances',
    stand_in: 'sc.msgs carries the strings; d_ex() is sc.dialogueOpen',
    gml: 'gml_Object_obj_ch3_PTB02_Step_0.gml:1476-1489',
  },
  {

    what: 'INVENTED: how long a dialogue box stays open (dialogueFrames)',
    stand_in: `${ENDING_DIALOGUE_FRAMES} frames; the real one is the writer's typing speed, `
      + 'the text length, automash and the player. Set dialogueAuto = false to own it.',
    gml: 'gml_Object_obj_ch3_PTB02_Step_0.gml:1478-1482 (the d_ex() stall it feeds)',
  },
  {
    what: 'the clash-shake lockstep with sb_timer',
    stand_in: 'derived from the GML; NO RECORDING of this route exists',
    gml: 'gml_Object_obj_ch3_PTB02_Step_0.gml:1243-1254, 1992-2090',
  },
];

const ACTOR_START = {

  kr: {
    x: 2356, y: 104, sprite: SPR.krisrDark,
    d: SPR.krisdDark, r: SPR.krisrDark, l: SPR.krislDark,
  },
  su: {
    x: 2310, y: 142, sprite: SPR.susieWalkRightDwUnhappy,
    d: SPR.susieWalkDownDwUnhappy,
    r: SPR.susieWalkRightDwUnhappy,
    l: SPR.susieWalkLeftDwUnhappy,
  },
  ra: {
    x: 2288, y: 190, sprite: SPR.ralseiWalkRightUnhappy,
    d: SPR.ralseiWalkDownUnhappy,
    r: SPR.ralseiWalkRightUnhappy,
    l: SPR.ralseiWalkLeftUnhappy,
  },
};

export const endingActor = {
  name: 'kaizo_ending_actor',
  create(e) {
    e.visible = true;
    e.componentMotion = true;
    e.who ??= '?';
    e.sprite ??= SPR.krisrDark;
    e.dsprite ??= SPR.krisdDark;
    e.rsprite ??= SPR.krisrDark;
    e.lsprite ??= SPR.krislDark;
    e.depth ??= 0;

    e.aetimer ??= 0;
    e.after_image_dir ??= 1;
    e.afterimages ??= [];
  },
  step(e) {

    if (e.friction) {
      const sp = Math.sqrt(e.hspeed * e.hspeed + e.vspeed * e.vspeed);
      if (sp > 0) {
        const next = Math.max(0, sp - e.friction);
        const k = next / sp;
        e.hspeed *= k;
        e.vspeed *= k;
      }
    }

    if (e.gravity) {
      e.hspeed += lengthdirX(e.gravity, e.gravity_direction);
      e.vspeed += lengthdirY(e.gravity, e.gravity_direction);
    }
    stepAfterimages(e);
  },
};

function stepAfterimages(e) {
  const list = e.afterimages;
  if (list && list.length) {
    for (const g of list) {
      g.image_alpha -= g.fadeSpeed;
      g.x += g.hspeed + lengthdirX(g.speed, g.direction);
      g.y += g.vspeed + lengthdirY(g.speed, g.direction);

      if (g.xrate) { g.image_xscale += g.xrate; g.image_yscale += g.yrate; }
      g.age += 1;
    }

    for (let i = list.length - 1; i >= 0; i--) if (list[i].image_alpha < 0) list.splice(i, 1);
  }
  if (!e.after_active) return;
  e.aetimer = (e.aetimer ?? 0) + 1;
  const rate = e.move_speed ?? 4;
  if (rate <= 0) return;
  if ((e.aetimer % rate) !== 0) return;
  if (e.image_alpha === 0) return;
  if ((e.knightState ?? 0) !== 0) return;
  pushAfterimage(e, {
    fadeSpeed: 0.02,
    image_alpha: 0.6 * (e.image_alpha ?? 1),
    hspeed: (e.after_image_rate ?? 2) * (e.after_image_dir ?? 1),
    depth: (e.depth ?? 0) + 1,
  });
}

function pushAfterimage(e, over = {}) {
  const list = (e.afterimages ??= []);
  list.push({
    object: 'obj_afterimage',
    xrate: 0,
    yrate: 0,
    x: e.x,
    y: e.y,
    sprite: e.sprite,
    image_index: e.image_index ?? 0,
    image_xscale: e.image_xscale ?? 1,
    image_yscale: e.image_yscale ?? 1,
    image_angle: e.image_angle ?? 0,
    image_alpha: e.image_alpha ?? 1,
    depth: e.depth ?? 0,
    fadeSpeed: 0.04,
    hspeed: 0,
    vspeed: 0,
    speed: 0,
    direction: 0,
    age: 0,
    ...over,
  });

  if (list.length > 64) list.splice(0, list.length - 64);
  return list[list.length - 1];
}

export function clearEndingAfterimages(state) {
  let n = 0;
  for (const a of Object.values(ensureEnding(state).actors)) {
    if (!a || !a.afterimages) continue;
    for (let i = a.afterimages.length - 1; i >= 0; i--) {

      if (a.afterimages[i].object !== 'obj_afterimage') continue;
      a.afterimages.splice(i, 1);
      n += 1;
    }
  }
  return n;
}

export function endingAfterimages(state) {
  const out = [];
  for (const a of Object.values(ensureEnding(state).actors)) {
    if (a?.afterimages) out.push(...a.afterimages);
  }
  return out;
}

export const endingMarker = {
  name: 'obj_marker',
  create(e) {

    e.image_speed = 0;
    e.image_xscale = 2;
    e.image_yscale = 2;
    e.componentMotion = true;
    e.sprite ??= null;
  },
};

export const endingDoom = {
  name: 'obj_doom',
  create(e) { e.visible = false; e.target ??= null; },
  alarm: {
    0(e) {
      if (e.target && e.target.alive) destroy(e.target);
      destroy(e);
    },
  },
};

export const endingDelay = {
  name: 'obj_script_delayed',
  create(e) {
    e.visible = false;

    e.dTarget ??= null;
    e.dName ??= null;
    e.dValue ??= 0;
  },
  alarm: {
    0(e) {
      const t = e.dTarget;
      if (t && e.dName && (t.alive === undefined || t.alive)) t[e.dName] = e.dValue;
      destroy(e);
    },
  },
};

export function scrVarDelay(state, target, name, value, frames) {
  const alarm = new Array(12).fill(-1);
  alarm[0] = frames;
  return spawn(state, endingDelay, {
    alarm, dTarget: target, dName: name, dValue: value,
  });
}

export function scrDoom(state, target, frames) {
  const alarm = new Array(12).fill(-1);
  alarm[0] = frames;
  return spawn(state, endingDoom, { alarm, target });
}

export function pendingEndingDelays(state) {
  return (state.entities ?? [])
    .filter((e) => e.alive && e.type === endingDelay)
    .map((e) => ({ name: e.dName, value: e.dValue, frames: e.alarm[0] }));
}

export function ensureEnding(state) {
  const k = (state.kaizo ??= {});

  const flag = (k.flag ??= Object.create(null));
  if (flag[FLAG_KNIGHT_OUTCOME] === undefined) flag[FLAG_KNIGHT_OUTCOME] = 0;
  if (flag[FLAG_KNIGHT_VIOLENCED] === undefined) flag[FLAG_KNIGHT_VIOLENCED] = 0;

  flag[FLAG_WEIRD_ROUTE] = k.sideb ? 1 : 0;
  if (k.ending) {

    k.ending.sideb = !!k.sideb;
    return k.ending;
  }

  k.ending = {
    sideb: !!k.sideb,

    con: 8,

    teamdefeated: true,

    ralseiFakeout: false,
    fakeoutTimer: null,
    fakeoutRolled: null,

    susieKnightSlash: false,
    susieKnightSlashTimer: 0,
    susieKnightShakeTimer: 0,
    susieKnightShakeTime: CLASH_SHAKE_TIME,
    susieKnightShakeSequence: false,
    bigShake: false,
    swoonTarget: null,

    sbCon: null,
    sbTimer: null,
    sbCam: 0,
    sbCamX: 0,
    sbSlash: null,

    whiteall: null,

    camX: CAM_X,
    camLerp: null,

    camRelease: null,

    script: null,
    scriptIndex: 0,
    wait: 0,
    waitFor: null,
    dialogueOpen: false,
    dialogueAuto: true,
    dialogueFrames: ENDING_DIALOGUE_FRAMES,
    dialogueClose: null,

    actors: Object.create(null),

    marks: [],
    lerps: [],
    msgs: [],
    ouchies: [],
    swoons: [],
    shakes: [],
    music: [],

    log: [],
    clashPulses: 0,
    draws: { clash: 0, epilogue: 0, fakeout: 0 },
    approx: ENDING_APPROX.map((r) => ({ ...r })),

    terminal: false,
    resumedAtCon: null,
  };
  return k.ending;
}

export function endingDraws(state) {
  return { ...ensureEnding(state).draws };
}

export function endingApprox(state) {
  return ensureEnding(state).approx.map((r) => ({ ...r }));
}

export function endingSprites() {
  return ENDING_SPRITES.slice();
}

export function endingTerminal(state) {
  const e = ensureEnding(state);
  return { terminal: e.terminal, resumedAtCon: e.resumedAtCon };
}

function draw(state, who, n = 1) {
  ensureEnding(state).draws[who] += n;
}

function logAt(state, what, from, to) {
  ensureEnding(state).log.push({ frame: state.frame, what, from, to });
}

function msg(state, speaker, text) {
  const e = ensureEnding(state);
  e.msgs.push({ frame: state.frame, speaker, text });
  e.dialogueOpen = true;
  e.dialogueClose = e.dialogueAuto ? state.frame + e.dialogueFrames : null;
}

function stepDialogue(state) {
  const e = ensureEnding(state);
  if (!e.dialogueOpen || e.dialogueClose === null) return false;
  if (state.frame < e.dialogueClose) return false;
  e.dialogueOpen = false;
  e.dialogueClose = null;
  return true;
}

function objShake(state, who, xamt, yamt = xamt, reduct = 1, speed = 1) {
  ensureEnding(state).shakes.push({
    frame: state.frame, objshake: true, target: who,
    shakexamt: xamt, shakeyamt: yamt, shakereduct: reduct, shakespeed: speed,
  });
}

function mark(state, x, y, sprite, extra = {}) {
  const sc = ensureEnding(state);
  const m = spawn(state, endingMarker, { x, y, sprite });

  Object.assign(m, extra);
  sc.marks.push({
    frame: state.frame, sprite, x, y, ...extra,
  });
  return m;
}

function lerpOn(state, target, name, a, b, maxtime, easetype, easeinout) {
  const sc = ensureEnding(state);
  sc.lerps.push({
    frame: state.frame, who: target?.who ?? target?.type?.name ?? '?',
    name, from: a, to: b, frames: maxtime, easetype, easeinout,
  });
  if (target && target.alive) {
    scrLerpvar(state, spawn, target, name, a, b, maxtime, easetype, easeinout);
  }
}

function showClashOverlay(state, peak = 1, frames = 8) {
  const sc = ensureEnding(state);
  sc.marks.push({
    frame: state.frame, sprite: SPR.pixelWhite, overlay: true, peak, frames,
  });

  const ov = spawn(state, endingMarker, { x: -10, y: -10, sprite: SPR.pixelWhite });
  Object.assign(ov, {
    image_xscale: OVERLAY_SCALE, image_yscale: OVERLAY_SCALE,
    depth: OVERLAY_DEPTH, image_alpha: 0, image_blend: C_WHITE, visible: true,
    overlay: true,
  });
  lerpOn(state, ov, 'image_alpha', 0, peak, frames, 2, 'out');

  scrVarDelay(state, ov, 'clashOverlayFall', 1, frames + 2);
  ov.clashOverlayFall = 0;
  ov.clashOverlayPeak = peak;
  ov.clashOverlayFrames = frames;
  scrDoom(state, ov, frames + frames + 2);
  return ov;
}

export const OVERLAY_SCALE = 999;

export const OVERLAY_DEPTH = -110;

export function endingWhiteall(state, create = false) {
  const sc = ensureEnding(state);
  if (sc.whiteall?.alive) return sc.whiteall;
  if (!create) return null;
  sc.whiteall = spawn(state, endingMarker, { x: -10, y: -10, sprite: SPR.pixelWhite });
  Object.assign(sc.whiteall, {
    image_xscale: OVERLAY_SCALE, image_yscale: OVERLAY_SCALE,
    depth: OVERLAY_DEPTH, image_alpha: 1, image_blend: C_WHITE,
    visible: false, whiteall: true,
  });
  return sc.whiteall;
}

function setWhiteall(state, patch) {
  const sc = ensureEnding(state);
  const w = endingWhiteall(state, true);
  if ('blend' in patch) w.image_blend = patch.blend === 'c_black' ? C_BLACK : C_WHITE;
  if ('alpha' in patch) w.image_alpha = patch.alpha;
  if ('visible' in patch) w.visible = patch.visible;
  sc.marks.push({
    frame: state.frame,
    whiteall: patch.blend ?? null,
    ...(('alpha' in patch) ? { alpha: patch.alpha } : {}),
    visible: w.visible,
  });
  return w;
}

export const C_WHITE = Object.freeze([255, 255, 255]);
export const C_BLACK = Object.freeze([0, 0, 0]);

export function markKnightDefeated(state) {
  const e = ensureEnding(state);
  const flag = state.kaizo.flag;
  if (flag[FLAG_KNIGHT_VIOLENCED] === 1) return false;
  flag[FLAG_KNIGHT_OUTCOME] = 0;
  flag[FLAG_KNIGHT_VIOLENCED] = 1;
  e.teamdefeated = false;

  flag[FLAG_KNIGHT_OUTCOME] = 1;
  logAt(state, 'flag50', 0, 1);
  return true;
}

export function endingWatchEndcon(state) {
  const k = state.knight;
  if (!k) return false;
  if (k.endcon !== 2) return false;
  return markKnightDefeated(state);
}

export function ptb02Con8(state) {
  const e = ensureEnding(state);
  const flag = state.kaizo.flag;
  const defeated = flag[FLAG_KNIGHT_OUTCOME] === 1;
  let con = defeated ? CON_VICTORY : CON_LOSS;
  if (con === CON_VICTORY && flag[FLAG_WEIRD_ROUTE]) con = CON_VICTORY_SIDEB;
  const battleResult = defeated ? 1 : 2;
  const from = e.con;
  e.con = con;
  logAt(state, 'con', from, con);

  if (defeated) setWhiteall(state, { visible: true });
  return {
    con,
    defeated,
    battleResult,
    route: !defeated ? 'loss' : (con === CON_VICTORY_SIDEB ? 'bside' : 'aside'),
  };
}

export function enterEnding(state) {
  const e = ensureEnding(state);
  spawnEndingActors(state);
  spawnEndingKnight(state);
  if (e.con === CON_VICTORY_SIDEB + 1) {
    const from = e.con;
    e.con = 50.2;
    logAt(state, 'con', from, 50.2);
    startEndingScript(state, SB_SETUP_SCRIPT);
    return 'bside';
  }
  if (e.con === CON_VICTORY + 1) {
    const from = e.con;
    e.con = ASIDE_RESUMES_AT_CON;
    e.resumedAtCon = ASIDE_RESUMES_AT_CON;
    logAt(state, 'con', from, ASIDE_RESUMES_AT_CON);
    return 'aside';
  }
  return 'none';
}

export function ptb02Alarm0(state) {
  const e = ensureEnding(state);
  const from = e.con;
  e.con = from + 1;
  logAt(state, 'con', from, e.con);
  return e.con;
}

export function endingFunchance(state, n, who = 'epilogue') {
  ensureEnding(state);
  const hit = kaizoFunchance(state, n);
  draw(state, who, 2);
  return { hit, funni: !!(state.kaizo?.funni), cost: 2, n };
}

export function spawnEndingActors(state) {
  const e = ensureEnding(state);
  for (const who of ['kr', 'su', 'ra']) {
    if (e.actors[who]?.alive) continue;
    const s = ACTOR_START[who];
    const a = spawn(state, endingActor, {
      x: s.x, y: s.y, who, sprite: s.sprite, depth: 0,
      dsprite: s.d, rsprite: s.r, lsprite: s.l,
    });
    e.actors[who] = a;
  }
  return e.actors;
}

function actorOf(state, who) {
  return ensureEnding(state).actors[who] ?? null;
}

export function spawnEndingKnight(state) {
  const e = ensureEnding(state);
  if (e.actors.knight?.alive) return e.actors.knight;
  const k = spawn(state, endingActor, {
    x: 2655, y: 78, who: 'knight', sprite: SPR.roaringknightIdle, depth: 0,
  });
  k.after_active = true;
  k.after_image_rate = 1;
  k.move_speed = 1;
  k.shakeamt = 0;
  k.knightState = 0;
  e.actors.knight = k;
  return k;
}

export function stepSwoonTarget(state) {
  const e = ensureEnding(state);
  if (!e.swoonTarget) return false;
  const t = e.swoonTarget;
  e.swoons.push({
    frame: state.frame, who: t.who ?? '?', x: t.x + 20, y: t.y + 30, type: 12,
  });
  e.swoonTarget = null;
  return true;
}

function ouchieDisplay(state, target, amount) {
  ensureEnding(state).ouchies.push({
    frame: state.frame, who: target?.who ?? '?',
    x: (target?.x ?? 0) + 20, y: (target?.y ?? 0) + 30,
    damage: amount, type: 0, lightb: 255,
  });
}

export function stepBigShake(state) {
  const e = ensureEnding(state);
  if (!e.bigShake) return false;
  e.bigShake = false;
  cue(state, 'snd_impact');
  cue(state, 'snd_closet_impact', 1, 1);
  cue(state, 'snd_closet_impact', 0.5, 1);
  cue(state, 'snd_bageldefeat', 0.8, 0.8);
  cue(state, 'snd_damage');
  cue(state, 'snd_glassbreak', 0.4, 0.8);
  cue(state, 'snd_glassbreak', 0.3, 0.6);
  e.shakes.push({ frame: state.frame, shakex: 10, shakespeed: 2, shakesign: 2 });
  scrShakescreen(state, { shakex: 10, shakespeed: 2 });
  return true;
}

export function stepSusieKnightSlash(state) {
  const e = ensureEnding(state);
  if (!e.susieKnightSlash) return false;
  const su = actorOf(state, 'su');
  const kn = actorOf(state, 'knight');
  e.susieKnightSlashTimer += 1;
  const t = e.susieKnightSlashTimer;

  if (t === 1) {
    cue(state, 'snd_jump');
    if (su) {
      su.depth = 6000;
      lerpOn(state, su, 'hspeed', 0, 20, 5);
      su.vspeed = -14;
      su.gravity = 2;
      su.sprite = SPR.susieClashJump;
      su.image_index = 1;
      su.friction = 0;
    }
    showClashOverlay(state, CLASH_OVERLAY_DEFAULT[1], CLASH_OVERLAY_DEFAULT[0]);
  }
  if (t === 10) {
    e.susieKnightShakeSequence = true;
    scrShakescreen(state);
    cue(state, 'snd_laz_c', 0.7, 1);
    cue(state, 'snd_heavyswing');
    cue(state, 'snd_closet_impact', 0.9, 1);
    cue(state, 'snd_impact', 0.7, 1);
    if (su) {
      su.friction = 0; su.vspeed = 0; su.gravity = 0; su.hspeed = 0;
      su.visible = false;
      if (kn) { su.x = kn.x - 30; su.y = kn.y - 40; }
    }
    if (kn) {
      kn.sprite = SPR.roaringKnightSusieClash;
      kn.image_speed = 0.4;
      kn.knightState = 0;
      kn.shakeamt = 2;
      objShake(state, 'knight', 24, 10, 3, 2);
    }
  }

  if (e.susieKnightShakeSequence) {
    e.susieKnightShakeTimer += 1;
    if ((e.susieKnightShakeTimer % e.susieKnightShakeTime) === 1) {
      e.susieKnightShakeTime -= CLASH_SHAKE_STEP;
      if (e.susieKnightShakeTime <= CLASH_SHAKE_FLOOR) {
        e.susieKnightShakeSequence = false;
      }
      scrShakescreen(state);
      const kx = (kn?.x ?? 0) - 90;
      const ky = (kn?.y ?? 0) - 90;
      const v1 = mark(state, kx, ky, SPR.fxHitback);
      lerpOn(state, v1, 'image_index', 0, 4, 12);
      scrDoom(state, v1, 16);
      const v2 = mark(state, kx, ky, SPR.fxHitback, { image_alpha: 0.5 });
      lerpOn(state, v2, 'image_index', 0, 4, 24);
      scrDoom(state, v2, 24);
      lerpOn(state, v2, 'image_alpha', 0.5, 0, 24);
      cue(state, 'snd_damage');
      cue(state, 'snd_metal_hit_strong', 0.8, 0.5);
      cue(state, 'snd_closet_impact', 0.9, 1);
      cue(state, 'snd_impact', 0.7, 1);
      showClashOverlay(state, CLASH_OVERLAY_HALF[1], CLASH_OVERLAY_HALF[0]);

      const rng = state.gmlRng;
      const dir = rng ? gmlRandomRange(rng, -60, 20) : 0;
      draw(state, 'clash', 1);
      e.clashPulses += 1;
      e.marks.push({
        frame: state.frame, afterimage: true, speed: 4, direction: dir,

        afterimageSpeedTypo: true,
      });

      if (kn) {
        pushAfterimage(kn, { speed: 4, direction: dir });
        pushAfterimage(kn, { speed: 2, direction: 4 });
        pushAfterimage(kn, { speed: 1, direction: 4 });

        pushAfterimage(kn, {
          object: 'obj_afterimage_grow',
          x: v1.x, y: v1.y, sprite: SPR.fxHitback, image_index: 0,
          image_xscale: 2, image_yscale: 2, image_alpha: 1,
          fadeSpeed: 0.1, xrate: 0.2, yrate: 0.2, depth: v1.depth ?? 0,
        });
        objShake(state, 'knight', 24, 10, 3, 2);
      }
    }
  } else {

    if (t === CLASH_FINISH_TIME) {
      const kx = (kn?.x ?? 0) - 90;
      const ky = (kn?.y ?? 0) - 90;
      const v = mark(state, kx, ky, SPR.fxHitback);
      lerpOn(state, v, 'image_index', 0, 4, 12);
      scrDoom(state, v, 12);
      cue(state, 'snd_damage');
      showClashOverlay(state, CLASH_OVERLAY_HALF[1], CLASH_OVERLAY_HALF[0]);
      if (kn) {
        kn.hspeed = 8; kn.friction = 2; kn.shakeamt = 0;
        kn.image_index = 2; kn.image_speed = 0;
      }
    }
    if (t === CLASH_JUMP_BACK_TIME) {
      cue(state, 'snd_laz_c', 0.9, 1);
      cue(state, 'snd_glassbreak');
      cue(state, 'snd_sparkle_glock');
      if (su) {
        su.visible = true; su.sprite = SPR.susieClashJump;
        su.vspeed = -4; su.gravity = 2; su.hspeed = -14;
        su.image_index = 0; su.image_speed = 0;
      }
      if (kn) {
        kn.sprite = SPR.roaringKnightClashPullBack;
        kn.image_index = 0; kn.image_speed = 0; kn.knightState = 0;
        scrVarDelay(state, kn, 'image_index', 1, 4);
      }
      const piece = mark(state, kn?.x ?? 0, kn?.y ?? 0,
        SPR.roaringknightSwordBreakPieceSmall);
      piece.vspeed = -8; piece.gravity = 2; piece.hspeed = -7;
      lerpOn(state, piece, 'image_angle', 0, 1280, 20);
      scrVarDelay(state, piece, 'gravity', 0, 16);
      scrVarDelay(state, piece, 'hspeed', 0, 16);
      scrVarDelay(state, piece, 'vspeed', 0, 16);
      e.pieceMarker = piece;
    }
    if (t === CLASH_JUMP_BACK_TIME + 10 && su) {
      su.sprite = SPR.susiebIdleSerious;
      su.vspeed = 0; su.gravity = 0; su.friction = 2;
      su.image_index = 0; su.image_speed = 0;
    }
    if (t === CLASH_JUMP_BACK_TIME + 20) {
      e.susieKnightSlash = false;
      const p = e.pieceMarker;
      mark(state, (p?.x ?? 0) - 4, (p?.y ?? 0) - 4, SPR.shineWhite,
        { image_speed: 0.1 });
    }
  }
  return true;
}

export function clashDraws(state) {
  const e = ensureEnding(state);
  return { pulses: e.clashPulses, draws: e.draws.clash };
}

export const SB_SETUP_SCRIPT = [
  ['init'],
  ['snd', 'stop_all'],
  ['face', 'kr', 'r'],
  ['setxy', 'ra', 2288, 190], ['face', 'ra', 'ralseiunhappy'], ['face', 'ra', 'r'],
  ['setxy', 'su', 2310, 142], ['face', 'su', 'susieunhappy'], ['face', 'su', 'r'],
  ['w', 30],
  ['whiteFade', 30],
  ['music', 'wind_highplace.ogg', { pitch: 0.5, from: 0, to: 1, frames: 60 }],
  ['w', 30], ['w', 60],
  ['knightVar', 'after_active', false],
  ['knightVar', 'reach_interrupt', true],
  ['w', 15],
  ['music', 'free_all'],
  ['warp'],
  ['w', 30],
  ['w', WARP_SETTLE],
  ['w', 90],
  ['say', 'susie', '* We..^1. we actually beat it?/%'],
  ['var', 'unskipWriter', true],
  ['pan', CLASH_CAM_X, 30],
  ['walk', 'su', 2510, 142, 30],

  ['actorVar', 'su', 'rsprite', SPR.susierDarkUnhappy],
  ['say', 'susie', "\\EJ* Hey^1, you^1!&* The hell's your deal anyways?!/"],
  ['say', 'susie', "\\Ea* Don't you even THINK you're getting away after all THAT!/%"],
  ['w', 12],
  ['waitX', 'su', 2510],
  ['var', 'susieKnightSlash', true],
  ['var', 'sbCon', 1],
];

export const FAKEOUT_SCRIPT = [
  ['setxy', 'ra', 2328, 190],
  ['sprite', 'ra', SPR.ralseiShockedRight],
  ['w', 90],
  ['music', 'resume'],
  ['var', 'whiteall', false],
  ['var', 'whiteSlash', false],
  ['w', 40],
  ['sprite', 'ra', SPR.ralseiSurprisedRightWalk],
  ['say', 'ralsei', '\\EZ* ^2.^2.^2.&* W-Wait./%'],
  ['sprite', 'ra', SPR.ralseiShockedStandingRight],
  ['say', 'ralsei', '\\EL* I\'m..^2. alright...?/%'],
  ['w', 20],
  ['sprite', 'ra', SPR.ralseiShockedStandingRight],
  ['w', 20],
  ['sprite', 'ra', SPR.ralseiSurprisedLeftWalk],
  ['w', 24],
  ['sprite', 'ra', SPR.ralseiDownSurprised2],
  ['w', 15],
  ['say', 'ralsei', '\\EZ* I guess I\'m fine.../%'],
  ['sprite', 'ra', SPR.ralseiWalkLeftUnhappy],
  ['lerpTo', 'ra', 'x', 2280, 25],
  ['var', 'ralseiFakeout', 1],
  ['waitFakeout'],
  ['sprite', 'ra', SPR.ralseiDefeat],
  ['var', 'bigShake', true],
  ['swoon', 'ra'],
];

export const NO_FAKEOUT_SCRIPT = [
  ['setxy', 'ra', 2328, 190],
  ['sprite', 'ra', SPR.ralseiDefeat],
  ['w', 90],
  ['music', 'resume'],
  ['var', 'bigShake', true],
  ['var', 'whiteall', false],
  ['var', 'whiteSlash', false],
  ['lerpTo', 'ra', 'x', 2280, 30, 2, 'out'],
  ['swoon', 'ra'],
];

export function rollRalseiFakeout(state) {
  const e = ensureEnding(state);
  const r = endingFunchance(state, FAKEOUT_CHANCE, 'fakeout');
  e.fakeoutRolled = r;
  logAt(state, 'fakeout', null, r.hit);
  return { ...r, script: r.hit ? FAKEOUT_SCRIPT : NO_FAKEOUT_SCRIPT };
}

export const FAKEOUT_LINE = "\\Ee* L-Let's just try to help Susie now";
export const FAKEOUT_CUT_AT = 21;

export function stepRalseiFakeout(state) {
  const e = ensureEnding(state);
  if (e.ralseiFakeout !== 1) return false;
  if (e.fakeoutTimer === null) e.fakeoutTimer = 0;
  e.fakeoutTimer += 1;
  if (e.fakeoutTimer === 1) {
    msg(state, 'ralsei', FAKEOUT_LINE);
    e.dialogueOpen = true;
  }
  if (e.fakeoutTimer === FAKEOUT_CUT_AT) {

    e.dialogueOpen = false;
    e.dialogueClose = null;
    e.marks.push({ frame: state.frame, destroyed: ['obj_dialoguer', 'obj_writer', 'obj_face'] });
    e.ralseiFakeout = 2;
    logAt(state, 'ralseiFakeout', 1, 2);
  }
  return true;
}

export const SB_STATES = [
  { at: 0, beats: [], next: null, note: 'sb_timer held at 0 by the branch itself' },
  { at: 1, beats: [SB_CLASH_BREAK], next: [2, 0] },
  { at: 2, beats: [10, 23, 38, 41, 45, 62, 72, 82, 92], next: [3, -4] },
  { at: 3, beats: [1, 17, 18, 19, 20, 21, 34, 41, 47, 65, 114, 148, 165], next: [4, -999] },
  { at: 4, beats: [35, 120, 150, 166, 220, 225, 255, SB_TERMINAL_AT], next: [SB_TERMINAL, null] },
  { at: SB_TERMINAL, beats: [], next: null, note: 'TERMINAL — con is never set to 10' },
];

export function stepSbEpilogue(state) {
  const e = ensureEnding(state);
  if (e.sbCon === null) return false;
  const su = actorOf(state, 'su');
  const ra = actorOf(state, 'ra');
  const kr = actorOf(state, 'kr');
  const kn = actorOf(state, 'knight');

  e.sbTimer += 1;
  const s = e.sbCon;
  const t = e.sbTimer;

  if (s === 0) {
    e.sbTimer = 0;
  } else if (s === 1) {
    if (t >= SB_CLASH_BREAK) {

      e.sbCam = 0;
      e.sbCamX = e.camX;
      e.sbCon = 2; e.sbTimer = 0;
      logAt(state, 'sbCon', 1, 2);
      e.susieKnightSlash = false;
      e.susieKnightShakeSequence = false;
      const v = mark(state, (kn?.x ?? 0) - 90, (kn?.y ?? 0) - 90, SPR.fxHitback);
      lerpOn(state, v, 'image_index', 0, 4, 12);
      scrDoom(state, v, 12);
      cue(state, 'snd_metal_hit_strong', 0.8, 0.5);
      cue(state, 'snd_damage');
      cue(state, 'snd_sussurprise');
      showClashOverlay(state, CLASH_OVERLAY_HALF[1], CLASH_OVERLAY_HALF[0]);

      e.sbCam = 1;
      e.camLerp = {
        from: e.camX, to: e.camX + CAM_KICK, frames: CAM_KICK_FRAMES, t: 0,
      };
      e.camRelease = CAM_KICK_RELEASE;
      e.lerps.push({
        frame: state.frame, who: 'PTB02', name: 'sb_camX',
        from: e.camX, to: e.camX + CAM_KICK, frames: CAM_KICK_FRAMES,
        easetype: 2, easeinout: 'inout',
      });
      if (su) {
        su.y += 6; su.x += 14; su.visible = true;
        su.sprite = SPR.susieHurt;
        su.vspeed = -5; su.gravity = 0; su.hspeed = -1;
        su.image_angle = -4; su.image_index = 0; su.image_speed = 0;
        lerpOn(state, su, 'hspeed', -1, 0, 25);
        lerpOn(state, su, 'vspeed', -5, 2, 25);
        lerpOn(state, su, 'image_angle', -4, 12, 25);
      }
      if (ra) {
        ra.sprite = SPR.ralseiSurprisedRightWalk;
        ra.image_index = 0; ra.image_speed = 0;
      }
      if (kn) {
        kn.after_image_rate = 2; kn.move_speed = 2; kn.hspeed = 6;
        kn.sprite = SPR.roaringknightAttackOverworld;
        kn.image_index = 3; kn.image_speed = 0;
        kn.knightState = 0; kn.shakeamt = 0;
        lerpOn(state, kn, 'image_index', 3, 5, 3);
        lerpOn(state, kn, 'hspeed', kn.hspeed, 0, 6);
      }
    }
  } else if (s === 2) {
    sbCon2(state, e, t, { su, ra, kr, kn });
  } else if (s === 3) {
    sbCon3(state, e, t, { su, ra, kr, kn });
  } else if (s === 4) {
    sbCon4(state, e, t, { su, ra, kr, kn });
  }

  stepCamKick(state, e);
  if (e.sbCon >= 1 && e.sbCam) e.camX = e.sbCamX;
  return true;
}

function stepCamKick(state, e) {
  if (e.camLerp) {
    const l = e.camLerp;
    l.t += 1;

    const x = l.t / l.frames;
    const p = x < 0.5 ? 2 * x * x : 1 - 2 * (1 - x) * (1 - x);
    e.sbCamX = l.from + (l.to - l.from) * p;
    if (l.t >= l.frames) e.camLerp = null;
  }
  if (e.camRelease !== undefined && e.camRelease !== null) {
    e.camRelease -= 1;
    if (e.camRelease <= 0) { e.sbCam = 0; e.camRelease = null; }
  }
}

function sbCon2(state, e, t, A) {
  const { su, ra, kr, kn } = A;
  if (t === 10) {
    if (kn) {
      kn.y -= 20; kn.x += 8; kn.after_active = true;
      kn.image_index = 0;
      kn.sprite = SPR.roaringknightFlurryPrepare;
      lerpOn(state, kn, 'x', kn.x, (su?.x ?? 0) + 16, 12, 2, 'inout');
      lerpOn(state, kn, 'y', kn.y, (su?.y ?? 0) - 76, 12, 2, 'inout');

      scrVarDelay(state, kn, 'sprite', SPR.roaringknightAttackOverworld, 4);
      scrVarDelay(state, kn, 'image_index', 2, 4);
    }
  } else if (t === 23) {
    for (const p of [0.06, 0.1, 0.12, 0.18, 0.24]) cue(state, 'snd_knight_cut2', p, 2);
    if (su) { su.vspeed = 0; su.gravity = 0; su.hspeed = 0; }

    setWhiteall(state, { blend: 'c_black', alpha: 1, visible: true });
    if (kn) { kn.after_image_rate = 2; kn.move_speed = 8; }
    const sl = mark(state, (su?.x ?? 0) + 16, (su?.y ?? 0) + 48, SLASH_SPRITE, {
      depth: -120, image_speed: 0, image_index: 0, image_angle: 36,
    });
    sl.x += lengthdirX(SLASH_OFFSET[0], SLASH_OFFSET[1]);
    sl.y += lengthdirY(SLASH_OFFSET[0], SLASH_OFFSET[1]);
    e.sbSlash = sl;
    if (kn) kn.image_index = 5;
  } else if (t === 38) {
    e.marks.push({ frame: state.frame, destroyed: ['obj_afterimage'] });
    clearEndingAfterimages(state);
    if (kr) { kr.image_index = 1; kr.image_speed = 0; kr.hspeed = -5; }
    if (ra) {
      ra.sprite = SPR.ralseiShockedRight;
      ra.image_index = 0; ra.image_speed = 0; ra.hspeed = -3;
    }
    cueLoop(state, 'wind_highplace.ogg', 0.5, 1);
    e.music.push({ frame: state.frame, track: 'wind_highplace.ogg', pitch: 0.5 });
    setWhiteall(state, { visible: false });
    if (e.sbSlash?.alive) {
      e.sbSlash.image_index = 1;
      lerpOn(state, e.sbSlash, 'image_index', 1, 4, 8);

      lerpOn(state, e.sbSlash, 'image_alpha', 3, 0, 8);
    }
    if (su) {
      su.depth = (ra?.depth ?? 0) + 5;
      su.sprite = SPR.susieDwJumpBallFixed;
      su.image_angle = 0;
      lerpOn(state, su, 'x', su.x, su.x + lengthdirX(SUSIE_LAUNCH[0], SUSIE_LAUNCH[2]), 2);
      lerpOn(state, su, 'y', su.y, su.y + lengthdirY(SUSIE_LAUNCH[1], SUSIE_LAUNCH[2]), 2);
      scrVarDelay(state, su, 'vspeed', 0, 3);
      scrVarDelay(state, su, 'hspeed', -10, 3);
      scrVarDelay(state, su, 'friction', 0.8, 3);
      scrVarDelay(state, su, 'sprite', SPR.susieDwFell, 3);
    }
  } else if (t === 41) {
    e.bigShake = true;

    const rng = state.gmlRng;
    const amt = rng ? gmlIrandomRange(rng, OUCHIE_SUSIE[0], OUCHIE_SUSIE[1]) : OUCHIE_SUSIE[0];
    draw(state, 'epilogue', 2);
    ouchieDisplay(state, su, amt);
    cue(state, 'snd_wing', 0.8, 0.8);
    cue(state, 'snd_damage', 0.8, 0.8);
    cue(state, 'snd_impact', 1, 0.8);
    cue(state, 'snd_sussurprise', 0.75, 1);
    cue(state, 'snd_break1', 0.9, 0.7);
  } else if (t === 45) {
    if (kn) {
      scrVarDelay(state, kn, 'image_index', 4, 5);
      scrVarDelay(state, kn, 'image_index', 0, 10);
      lerpOn(state, kn, 'x', kn.x, kn.x - 8, 30, 2, 'inout');
      lerpOn(state, kn, 'y', kn.y, kn.y + 110, 30, 2, 'inout');
    }
    if (kr) { kr.image_index = 0; kr.hspeed = 0; }
    if (ra) ra.hspeed = 0;
  } else if (t === 62) {
    if (kr) kr.sprite = kr.dsprite;
  } else if (t === 72) {
    msg(state, 'ralsei', '\\EY* S-Susie!!!/%');
    e.dialogueOpen = true;
    if (ra) {
      ra.depth = (su?.depth ?? 0) - 5;
      ra.hspeed = 1;
      ra.sprite = SPR.ralseiSurprisedRightWalk;
      ra.image_speed = 0; ra.image_index = 1;
      scrVarDelay(state, ra, 'image_index', 0, 4);
      scrVarDelay(state, ra, 'hspeed', 0, 4);
    }
  } else if (t === 82) {
    if (kr) kr.sprite = kr.rsprite;
  } else if (t === 92) {
    e.sbCon = 3; e.sbTimer = -4;
    logAt(state, 'sbCon', 2, 3);
  }
}

function sbCon3(state, e, t, A) {
  const { su, ra, kr, kn } = A;
  if (t === 1) {

    if (e.dialogueOpen) { e.sbTimer = 0; return; }
    if (kr) kr.sprite = kr.dsprite;
    if (ra) {
      scrVarDelay(state, ra, 'sprite', SPR.ralseiWalkUpSad, 26);
      scrVarDelay(state, ra, 'image_index', 0, 26);
      scrVarDelay(state, ra, 'image_speed', 0, 26);
      lerpOn(state, ra, 'y', ra.y, ra.y - 10, 26);
      lerpOn(state, ra, 'x', ra.x, (su?.x ?? 0) + 42, 26);
      ra.sprite = SPR.ralseiWalkRightSad;
      ra.image_speed = 0.2; ra.image_index = 1;
    }
  } else if (t === 17) {
    cue(state, 'snd_knight_drawpower', 0.36, 1);
    cue(state, 'snd_knight_drawpower', 0.55, 1);
    if (kn) {
      lerpOn(state, kn, 'x', kn.x, kn.x + 132, 17, 2, 'out');
      lerpOn(state, kn, 'y', kn.y, kn.y + 8, 17, 2, 'out');
    }
  } else if (t === 18) {
    msg(state, 'ralsei', '\\EZ* S-Susie..^1. please^1, get up, ');
    e.dialogueOpen = true;
  } else if (t >= 19 && t <= 21) {
    e.marks.push({ frame: state.frame, writerShake: 1 });
  } else if (t === 34) {
    cue(state, 'snd_knight_teleport');
    cue(state, 'snd_leaf_dodge', 0.4, 1);
    if (kr) kr.sprite = kr.rsprite;
    if (kn) {
      kn.move_speed = 2; kn.x += 52; kn.y += 44;
      kn.sprite = SPR.knightCrescentslash;
      kn.image_index = 1;
      lerpOn(state, kn, 'image_index', 1, 4, 6);
      lerpOn(state, kn, 'x', kn.x, (ra?.x ?? 0) + 40, 13, 2, 'in');
      lerpOn(state, kn, 'y', kn.y, (ra?.y ?? 0) + 26, 13, 2, 'in');
    }
  } else if (t === 41) {
    if (kr) { kr.image_index = 1; kr.image_speed = 0.25; kr.hspeed = 6; kr.vspeed = 2; }
  } else if (t === 47) {

    e.marks.push({ frame: state.frame, destroyed: ['obj_dialoguer', 'obj_writer', 'obj_face'] });
    e.dialogueOpen = false;
    e.dialogueClose = null;
    for (const p of [0.06, 0.1, 0.12, 0.18, 0.24]) cue(state, 'snd_knight_cut2', p, 2);
    if (kr) { kr.image_index = 0; kr.image_speed = 0; kr.hspeed = 0; kr.vspeed = 0; }
    if (ra) { ra.hspeed = 0; ra.sprite = DEFEAT_SPRITE; }

    setWhiteall(state, { visible: true });
    if (e.sbSlash?.alive) {
      e.sbSlash.image_index = 0;
      e.sbSlash.image_alpha = 1;
      e.sbSlash.image_angle = 0;
      e.sbSlash.x = ra?.x ?? 0;
      e.sbSlash.y = (ra?.y ?? 0) + 40;
    }
  } else if (t === 65) {
    e.marks.push({ frame: state.frame, destroyed: ['obj_afterimage'] });
    clearEndingAfterimages(state);
    e.bigShake = true;
    const rng = state.gmlRng;
    const amt = rng ? gmlIrandomRange(rng, OUCHIE_RALSEI[0], OUCHIE_RALSEI[1]) : OUCHIE_RALSEI[0];
    draw(state, 'epilogue', 2);
    ouchieDisplay(state, ra, amt);
    cue(state, 'snd_wing', 0.8, 0.8);
    cue(state, 'snd_damage', 0.8, 0.8);
    cue(state, 'snd_impact', 1, 0.8);
    cue(state, 'snd_break1', 0.9, 0.7);
    setWhiteall(state, { visible: false });
    if (e.sbSlash?.alive) {
      e.sbSlash.image_index = 1;
      lerpOn(state, e.sbSlash, 'image_index', 1, 4, 8);
      lerpOn(state, e.sbSlash, 'image_alpha', 3, 0, 8);
    }
    if (kn) {
      kn.move_speed = 8; kn.visible = false;
      kn.after_active = false; kn.after_image_dir = -1;
    }
    if (ra) {
      ra.hspeed = -10; ra.friction = 0.4;
      ra.sprite = DEFEAT_SPRITE;

      const roll = endingFunchance(state, SWOON_CHANCE, 'epilogue');
      e.swoonRoll = roll;
      if (roll.hit) ra.sprite = SWOON_SPRITE;
      logAt(state, 'ralseiSwoon', null, roll.hit);
    }
    if (kr) {
      kr.image_index = 1; kr.image_speed = -0.25; kr.hspeed = -3;
      scrVarDelay(state, kr, 'hspeed', 0, 12);
      scrVarDelay(state, kr, 'vspeed', 0, 12);
      scrVarDelay(state, kr, 'image_index', 0, 12);
      scrVarDelay(state, kr, 'image_speed', 0, 12);
    }
  } else if (t === 114) {
    if (kr) kr.sprite = kr.lsprite;
  } else if (t === 148) {
    if (kr) kr.sprite = kr.rsprite;
  } else if (t === 165) {
    if (kr) { kr.hspeed = -1; kr.image_index = 2; kr.image_speed = -0.1; }
    e.sbCon = 4; e.sbTimer = -999;
    logAt(state, 'sbCon', 3, 4);
  }
}

function sbCon4(state, e, t, A) {
  const { kr, kn } = A;
  if (kr && kr.x <= (e.camX - 8) && t < 0) {
    e.sbTimer = 0;
    logAt(state, 'sbCon4Gate', null, state.frame);
    kr.hspeed = 0; kr.image_index = 0; kr.image_speed = 0;
    e.marks.push({ frame: state.frame, minishake: 'kr' });
    objShake(state, 'kr', 4, 4, 1, 1);
    cue(state, 'snd_wing', 0.8, 1);
    if (kn) {
      kn.after_active = false;
      kn.move_speed = 12;
      kn.depth = (kr.depth ?? 0) + 1;
      kn.sprite = FACEAWAY_SPRITE;
      kn.image_index = 0; kn.image_speed = 0;
      kn.image_xscale = -2;
      kn.image_alpha = 0;
      kn.x = kr.x + 102;
      kn.y = kr.y - 54;
      kn.visible = true;
    }
    e.marks.push({ frame: state.frame, torielGachaX: -999 });
    return;
  }
  if (t === 35) {
    if (kn) {
      kn.after_active = true;
      lerpOn(state, kn, 'image_alpha', 0, 1, 8);
    }
    e.marks.push({ frame: state.frame, pan: [-5, 0, 66] });
  } else if (t === 120) {
    if (kn) lerpOn(state, kn, 'image_index', 0, 2, 10);
  } else if (t === 150) {
    if (kn) {
      lerpOn(state, kn, 'image_index', 2, 6, 15);
      kn.hspeed = -3; kn.vspeed = -1; kn.friction = 0.1;
    }
  } else if (t === 166) {
    if (kn) {
      kn.depth = (kr?.depth ?? 0) - 1;
      kn.x -= 8; kn.y += 6;
      kn.sprite = SPR.roaringknightAttackOverworld;
      kn.image_index = 2;
      scrVarDelay(state, kn, 'image_index', 1, 5);
    }
  } else if (t === 220) {
    e.music.push({ frame: state.frame, track: null, op: 'free_all+stop_all' });

    setWhiteall(state, { visible: true });
  } else if (t === 225) {
    for (const p of [0.06, 0.1, 0.12]) cue(state, 'snd_knight_cut2', p, 0.6);
    cue(state, 'snd_break1', 0.35, 0.6);
    cue(state, 'snd_break1', 0.4, 0.6);
    cue(state, 'snd_damage', 0.4, 0.6);
  } else if (t === 255) {
    cue(state, 'snd_break2', 0.35, 0.6);
    cue(state, 'snd_break2', 0.4, 0.6);
  } else if (t === SB_TERMINAL_AT) {
    e.sbCon = SB_TERMINAL;
    logAt(state, 'sbCon', 4, SB_TERMINAL);
    cueLoop(state, BOARD_OCEAN, 1, 0);
    e.music.push({
      frame: state.frame, track: BOARD_OCEAN,
      from: 0, to: BOARD_OCEAN_VOL, frames: BOARD_OCEAN_FADE,
    });

    e.terminal = true;
    logAt(state, 'terminal', false, true);
  }
}

export function startEndingScript(state, script) {
  const e = ensureEnding(state);
  e.script = script;
  e.scriptIndex = 0;
  e.wait = 0;
  e.waitFor = null;
  return e;
}

export function endingScriptRunning(state) {
  const e = ensureEnding(state);
  return !!e.script && e.scriptIndex < e.script.length;
}

export function stepEndingScript(state) {
  const e = ensureEnding(state);
  if (!e.script) return false;
  if (e.wait > 0) { e.wait -= 1; return true; }
  if (e.waitFor) {
    if (!e.waitFor(state, e)) return true;
    e.waitFor = null;
  }
  let guard = 0;
  while (e.scriptIndex < e.script.length) {
    if (guard++ > 512) throw new Error('kaizo-ending: beat list did not advance');
    const beat = e.script[e.scriptIndex];
    e.scriptIndex += 1;
    const [op, ...args] = beat;
    if (op === 'w') { e.wait = args[0]; return true; }
    if (op === 'say') {
      msg(state, args[0], args[1]);

      e.waitFor = (_s, ee) => !ee.dialogueOpen;
      return true;
    }
    if (op === 'waitFakeout') {
      e.waitFor = (_s, ee) => ee.ralseiFakeout === 2;
      return true;
    }
    if (op === 'waitX') {
      const who = args[0]; const at = args[1];
      e.waitFor = (s2) => (actorOf(s2, who)?.x ?? at) >= at;
      return true;
    }
    applyBeat(state, e, op, args);
  }
  e.script = null;
  return false;
}

function applyBeat(state, e, op, args) {
  switch (op) {
    case 'init':
      e.sbCon = 0; e.sbCam = 0; e.sbCamX = 0; e.sbTimer = 0;
      logAt(state, 'sbCon', null, 0);
      break;
    case 'snd':
      e.music.push({ frame: state.frame, op: args[0] });
      break;
    case 'music':
      e.music.push({ frame: state.frame, track: args[0], opts: args[1] ?? null });
      break;
    case 'setxy': {
      const a = actorOf(state, args[0]);
      if (a) { a.x = args[1]; a.y = args[2]; }
      break;
    }
    case 'face': {
      const a = actorOf(state, args[0]);
      if (a) a.facing = args[1];
      break;
    }
    case 'sprite': {
      const a = actorOf(state, args[0]);
      if (a) a.sprite = args[1];
      break;
    }

    case 'actorVar': {
      const a = actorOf(state, args[0]);
      if (a) a[args[1]] = args[2];
      break;
    }
    case 'lerpTo': {
      const a = actorOf(state, args[0]);
      if (a) lerpOn(state, a, args[1], a[args[1]], args[2], args[3], args[4], args[5]);
      break;
    }
    case 'walk': {
      const a = actorOf(state, args[0]);
      if (a) {
        lerpOn(state, a, 'x', a.x, args[1], args[3]);
        lerpOn(state, a, 'y', a.y, args[2], args[3]);
      }
      break;
    }
    case 'pan':
      e.camX = args[0];
      e.marks.push({ frame: state.frame, pan: [args[0], args[1]] });
      break;
    case 'whiteFade': {

      const w = endingWhiteall(state, true);
      e.marks.push({ frame: state.frame, whiteall: 'fade', frames: args[0] });
      lerpOn(state, w, 'image_alpha', w.image_alpha, 0, args[0]);
      break;
    }
    case 'warp':
      e.marks.push({ frame: state.frame, warp: true });
      break;
    case 'knightVar': {
      const kn = actorOf(state, 'knight');
      if (kn) kn[args[0]] = args[1];
      break;
    }
    case 'swoon':
      e.swoonTarget = actorOf(state, args[0]);
      break;
    case 'var': {
      const from = e[args[0]];
      e[args[0]] = args[1];
      if (args[0] === 'sbCon' || args[0] === 'ralseiFakeout') {
        logAt(state, args[0], from, args[1]);
      }
      break;
    }
    default:
      e.marks.push({ frame: state.frame, unmodelled: op, args });
  }
}

export function stepKaizoEnding(state) {
  const e = ensureEnding(state);
  stepDialogue(state);
  const script = stepEndingScript(state);
  const sb = stepSbEpilogue(state);
  const swoon = stepSwoonTarget(state);
  const shake = stepBigShake(state);
  const clash = stepSusieKnightSlash(state);
  const fake = stepRalseiFakeout(state);
  return {
    script, sb, swoon, shake, clash, fake, con: e.con, sbCon: e.sbCon,
  };
}

export const kaizoEndingDriver = {
  name: 'kaizo_ending_driver',
  create(e, state) {
    e.visible = false;
    ensureEnding(state);
  },
  step(e, state) {
    stepKaizoEnding(state);
  },
};

export function ralseiSwoonSprite(state) {
  const e = ensureEnding(state);
  return e.actors.ra?.sprite ?? null;
}

export function endingReport(state) {
  const e = ensureEnding(state);
  return {
    sideb: e.sideb,
    con: e.con,
    sbCon: e.sbCon,
    sbTimer: e.sbTimer,
    camX: e.camX,
    terminal: e.terminal,
    resumedAtCon: e.resumedAtCon,
    ralseiFakeout: e.ralseiFakeout,
    fakeoutHit: e.fakeoutRolled?.hit ?? null,
    swoonHit: e.swoonRoll?.hit ?? null,
    ralseiSprite: e.actors.ra?.sprite ?? null,
    clashPulses: e.clashPulses,
    ouchies: e.ouchies.length,
    swoons: e.swoons.length,
    msgs: e.msgs.length,
    marks: e.marks.length,
    lerps: e.lerps.length,
    draws: { ...e.draws },
    transitions: e.log.length,
    approx: e.approx.length,
  };
}

export function visitedSbStates(state) {
  const seen = [];
  for (const t of ensureEnding(state).log) {
    if (t.what === 'sbCon' && !seen.includes(t.to)) seen.push(t.to);
  }
  return seen;
}
